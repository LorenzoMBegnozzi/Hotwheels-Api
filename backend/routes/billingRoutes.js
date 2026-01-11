const express = require('express');
const crypto = require('node:crypto');

const authMiddleware = require('../middlewares/auth');
const User = require('../models/User');
const UserCollection = require('../models/UserCollection');
const Billing = require('../models/Billing');

const { createBilling, findBillingById } = require('../utils/abacatepay');
const { listPlans, getPlanById, getLimitsForUser } = require('../utils/subscriptionPlans');

const router = express.Router();

const DAYS_30_MS = 30 * 24 * 60 * 60 * 1000;

const timingSafeEqualString = (a, b) => {
  const A = Buffer.from(String(a || ''), 'utf8');
  const B = Buffer.from(String(b || ''), 'utf8');
  return A.length === B.length && crypto.timingSafeEqual(A, B);
};

const verifyWebhookSignature = (rawBody, signatureFromHeader) => {
  const key = process.env.ABACATEPAY_WEBHOOK_PUBLIC_KEY || process.env.ABACATEPAY_WEBHOOK_SIGNING_SECRET;
  if (!key) return true; // permite apenas secret na URL

  if (!signatureFromHeader) return false;

  const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody || ''), 'utf8');

  const expectedSig = crypto
    .createHmac('sha256', key)
    .update(bodyBuffer)
    .digest('base64');

  return timingSafeEqualString(expectedSig, signatureFromHeader);
};

const activatePlanForUser = async ({ userId, planId, billingId }) => {
  const plan = getPlanById(planId);
  if (!plan) {
    const err = new Error('Plano inválido');
    err.status = 400;
    throw err;
  }

  const update = {
    subscriptionPlan: plan.id,
    subscriptionStatus: plan.id === 'FREE' ? 'ACTIVE' : 'ACTIVE',
    subscriptionProvider: plan.id === 'FREE' ? null : 'abacatepay',
    subscriptionLastBillingId: billingId || null,
  };

  if (plan.id === 'FREE') {
    update.subscriptionValidUntil = null;
  } else {
    update.subscriptionValidUntil = new Date(Date.now() + DAYS_30_MS);
  }

  await User.findByIdAndUpdate(userId, update, { new: false });
};

// Listar planos
router.get('/plans', (req, res) => {
  res.status(200).json({ plans: listPlans() });
});

// Status do usuário + contadores
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });

    const limits = getLimitsForUser(user);

    const col = await UserCollection.findOne({ userId }).lean();
    const usedCollection = Array.isArray(col?.collection) ? col.collection.length : 0;
    const usedWishlist = Array.isArray(col?.favorites) ? col.favorites.length : 0;

    res.status(200).json({
      subscription: limits,
      usage: {
        collection: usedCollection,
        wishlist: usedWishlist,
      },
    });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar dados de assinatura' });
  }
});

// Trocar para grátis (imediato)
router.post('/activate-free', authMiddleware, async (req, res) => {
  try {
    await activatePlanForUser({ userId: req.user.id, planId: 'FREE', billingId: null });
    res.status(200).json({ message: 'Plano grátis ativado.' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao ativar plano grátis.' });
  }
});

// Criar checkout (AbacatePay)
router.post('/checkout', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { planId } = req.body || {};

    const plan = getPlanById(planId);
    if (!plan || plan.priceCents <= 0) {
      return res.status(400).json({ message: 'Plano inválido para checkout.' });
    }

    const frontendUrl =
      process.env.FRONTEND_URL ||
      process.env.CORS_ORIGIN?.split(',')?.[0]?.trim() ||
      'http://localhost:3000';

    const returnUrl = process.env.ABACATEPAY_RETURN_URL || `${frontendUrl}/profile`;
    const completionUrl = process.env.ABACATEPAY_COMPLETION_URL || `${frontendUrl}/assinatura/sucesso`;

    const externalId = `sub_${userId}_${Date.now()}`;

    const billing = await createBilling({
      products: [
        {
          externalId: plan.id,
          name: `Assinatura ${plan.name}`,
          description: plan.description,
          quantity: 1,
          price: plan.priceCents,
        },
      ],
      returnUrl,
      completionUrl,
      externalId,
      metadata: {
        userId: String(userId),
        planId: plan.id,
      },
    });

    if (!billing?.id || !billing?.url) {
      return res.status(502).json({ message: 'Falha ao criar cobrança no AbacatePay.' });
    }

    await Billing.create({
      userId,
      planId: plan.id,
      amountCents: plan.priceCents,
      provider: 'abacatepay',
      providerBillingId: billing.id,
      checkoutUrl: billing.url,
      status: billing.status || 'PENDING',
      devMode: !!billing.devMode,
      externalId,
      metadata: { userId: String(userId), planId: plan.id },
    });

    // Marca usuário como pendente (sem liberar limites ainda)
    await User.findByIdAndUpdate(userId, {
      subscriptionStatus: 'PENDING',
      subscriptionProvider: 'abacatepay',
      subscriptionLastBillingId: billing.id,
    });

    res.status(200).json({
      checkoutUrl: billing.url,
      billingId: billing.id,
      status: billing.status,
    });
  } catch (e) {
    const status = Number.isInteger(e?.status) ? e.status : 500;
    const payload = { message: e?.message || 'Erro ao criar checkout' };

    // Em dev/homologao, ajuda a debugar validao do provedor
    if (process.env.NODE_ENV !== 'production' && e?.providerStatus) {
      payload.provider = {
        status: e.providerStatus,
        data: e.providerData,
      };
    }

    res.status(status).json(payload);
  }
});

// Confirmar pagamento consultando a AbacatePay (fallback, útil quando o webhook não traz o billingId)
router.post('/confirm', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { billingId } = req.body || {};

    if (!billingId) return res.status(400).json({ message: 'billingId é obrigatório.' });

    const record = await Billing.findOne({ providerBillingId: billingId, userId });
    if (!record) return res.status(404).json({ message: 'Cobrança não encontrada.' });

    const billing = await findBillingById(billingId);
    if (!billing) return res.status(404).json({ message: 'Cobrança não encontrada no provedor.' });

    // Atualiza status local
    await Billing.updateOne(
      { _id: record._id },
      { $set: { status: billing.status || record.status, devMode: !!billing.devMode } }
    );

    if (billing.status !== 'PAID') {
      return res.status(200).json({ paid: false, status: billing.status });
    }

    await Billing.updateOne({ _id: record._id }, { $set: { paidAt: new Date(), status: 'PAID' } });
    await activatePlanForUser({ userId, planId: record.planId, billingId });

    res.status(200).json({ paid: true, status: 'PAID', planId: record.planId });
  } catch (e) {
    res.status(500).json({ message: e?.message || 'Erro ao confirmar pagamento.' });
  }
});

// Webhook AbacatePay (raw body)
router.post('/webhook', async (req, res) => {
  try {
    const webhookSecret = req.query.webhookSecret;
    const expected = process.env.ABACATEPAY_WEBHOOK_SECRET;
    if (expected && String(webhookSecret || '') !== String(expected)) {
      return res.status(401).json({ error: 'Invalid webhook secret' });
    }

    const signature = req.header('X-Webhook-Signature');
    const rawBody = req.body; // Buffer (express.raw)

    if (!verifyWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const event = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || ''));

    // Idempotência simples por event.id
    const eventId = event?.id ? String(event.id) : null;

    if (event?.event === 'billing.paid') {
      // O payload pode variar; se vier billingId, processamos. Caso contrário, apenas aceitamos.
      const billingId =
        event?.data?.billing?.id ||
        event?.data?.bill?.id ||
        event?.data?.billingId ||
        event?.data?.id ||
        null;

      if (billingId) {
        const record = await Billing.findOne({ providerBillingId: String(billingId) });
        if (record) {
          if (eventId && record.lastEventId === eventId) {
            return res.status(200).json({ received: true, dedup: true });
          }

          await Billing.updateOne(
            { _id: record._id },
            { $set: { status: 'PAID', paidAt: new Date(), lastEventId: eventId } }
          );

          await activatePlanForUser({
            userId: record.userId,
            planId: record.planId,
            billingId: record.providerBillingId,
          });
        }
      }
    }

    res.status(200).json({ received: true });
  } catch (e) {
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
