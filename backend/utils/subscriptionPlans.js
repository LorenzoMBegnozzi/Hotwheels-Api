const parseCents = (value, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  if (n < 0) return fallback;
  return Math.round(n);
};

const formatBRL = (cents) => {
  const v = Number(cents || 0) / 100;
  try {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  } catch {
    return `R$ ${v.toFixed(2)}`;
  }
};

// -----------------------------------------------------------------------------
// Planos ATIVOS (visíveis/assináveis)
// -----------------------------------------------------------------------------
// Mantemos apenas:
// - FREE (com limites)
// - PLAN_1490 (R$ 14,90) com tudo liberado (sem limite)
//
// IMPORTANTE:
// - Os planos antigos ficam comentados mais abaixo (para você não perder).
// - Usuários que por acaso estejam em planos antigos são mapeados para PLAN_1490
//   enquanto a assinatura estiver válida.

const ACTIVE_PLANS = {
  FREE: {
    id: 'FREE',
    name: 'Garagem Básica',
    priceCents: 0,
    currency: 'BRL',
    limits: {
      collection: 50,
      wishlist: 50,
    },
    description: 'Até 50 itens na coleção e 50 na lista de desejos.',
  },
  PLAN_1490: {
    id: 'PLAN_1490',
    name: 'Piloto Profissional',
    priceCents: 1490,
    currency: 'BRL',
    limits: {
      collection: null, // null => sem limite
      wishlist: null,
    },
    description: `${formatBRL(1490)}/mês (ativação por 30 dias): coleção e lista de desejos sem limites.`,
  },
};

const listPlans = () => Object.values(ACTIVE_PLANS);

const getPlanById = (planId) => {
  const key = String(planId || '').trim();
  return ACTIVE_PLANS[key] || null;
};

const isUnlimited = (n) => n === null || n === undefined;

const getEffectivePlanIdForUser = (user) => {
  const planId = user?.subscriptionPlan || 'FREE';
  if (planId === 'FREE') return 'FREE';

  const validUntil = user?.subscriptionValidUntil ? new Date(user.subscriptionValidUntil) : null;
  if (!validUntil) return 'FREE';
  if (validUntil.getTime() < Date.now()) return 'FREE';

  // Se o usuário estiver em um plano antigo, trata como o plano pago atual.
  const legacyToActive = {
    PLAN_990: 'PLAN_1490',
    PLAN_1990: 'PLAN_1490',
  };

  return legacyToActive[planId] || planId;
};

const getLimitsForUser = (user) => {
  const effectiveId = getEffectivePlanIdForUser(user);
  const plan = getPlanById(effectiveId) || ACTIVE_PLANS.FREE;
  return {
    planId: plan.id,
    planName: plan.name,
    priceCents: plan.priceCents,
    limits: { ...plan.limits },
    unlimited: {
      collection: isUnlimited(plan.limits.collection),
      wishlist: isUnlimited(plan.limits.wishlist),
    },
    validUntil: user?.subscriptionValidUntil || null,
    status: user?.subscriptionStatus || 'ACTIVE',
    provider: user?.subscriptionProvider || null,
    lastBillingId: user?.subscriptionLastBillingId || null,
  };
};

/*
================================================================================
PLANOS ANTIGOS (comentados para você não perder)
--------------------------------------------------------------------------------

const PLAN_990_PRICE_CENTS = parseCents(process.env.PLAN_990_PRICE_CENTS, 990);

const PLANS = {
  FREE: {
    id: 'FREE',
    name: 'Garagem Básica',
    priceCents: 0,
    currency: 'BRL',
    limits: {
      collection: 50,
      wishlist: 50,
    },
    description: 'Até 50 itens na coleção e 50 na lista de desejos.',
  },
  PLAN_990: {
    id: 'PLAN_990',
    name: 'Piloto Iniciante',
    priceCents: PLAN_990_PRICE_CENTS,
    currency: 'BRL',
    limits: {
      collection: 150,
      wishlist: 150,
    },
    description: `${formatBRL(PLAN_990_PRICE_CENTS)}/mês (ativação por 30 dias): até 150 itens em cada lista.`,
  },
  PLAN_1490: {
    id: 'PLAN_1490',
    name: 'Piloto Profissional',
    priceCents: 1490,
    currency: 'BRL',
    limits: {
      collection: 300,
      wishlist: 300,
    },
    description: 'R$ 14,90/mês (ativação por 30 dias): sem limites.',
  },
  PLAN_1990: {
    id: 'PLAN_1990',
    name: 'Garage Premium',
    priceCents: 1990,
    currency: 'BRL',
    limits: {
      collection: null, // null => sem limite
      wishlist: null,
    },
    description: 'R$ 19,90/mês (ativação por 30 dias): sem limites.',
  },
};

================================================================================
*/

module.exports = {
  // Exporta com o mesmo nome antigo para não quebrar imports.
  PLANS: ACTIVE_PLANS,
  listPlans,
  getPlanById,
  getLimitsForUser,
  getEffectivePlanIdForUser,
  isUnlimited,
};
