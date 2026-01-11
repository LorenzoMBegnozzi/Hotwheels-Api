import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCrown, FaRegSmile } from 'react-icons/fa';

import '../css/ProfilePage.css';
import '../css/SubscriptionPlansPage.css';
import { api } from '../utils/api';
import { toastError, toastInfo, toastSuccess } from '../utils/alerts';
import { logout } from '../utils/auth';

const getAuthHeader = () => {
  let token = localStorage.getItem('token');
  if (token && !token.startsWith('Bearer ')) token = `Bearer ${token}`;
  return token ? { Authorization: token } : {};
};

const formatBRL = (cents) => {
  try {
    const v = (Number(cents || 0) / 100);
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  } catch {
    return `R$ ${(Number(cents || 0) / 100).toFixed(2)}`;
  }
};

const SubscriptionPlansPage = () => {
  const navigate = useNavigate();

  const [plans, setPlans] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  const currentPlanId = me?.subscription?.planId || 'FREE';

  const usageText = useMemo(() => {
    const usage = me?.usage;
    const sub = me?.subscription;
    if (!usage || !sub?.limits) return null;

    const colLimit = sub.limits.collection;
    const wishLimit = sub.limits.wishlist;

    const colUnlimited = !!sub.unlimited?.collection || colLimit == null;
    const wishUnlimited = !!sub.unlimited?.wishlist || wishLimit == null;

    const col = colUnlimited ? `${usage.collection} / ∞` : `${usage.collection} / ${colLimit}`;
    const wish = wishUnlimited ? `${usage.wishlist} / ∞` : `${usage.wishlist} / ${wishLimit}`;

    return { col, wish };
  }, [me]);

  const load = async () => {
    try {
      setLoading(true);
      const [pRes, meRes] = await Promise.all([
        api.get('/api/billing/plans'),
        api.get('/api/billing/me', { headers: getAuthHeader() }),
      ]);

      setPlans(Array.isArray(pRes.data?.plans) ? pRes.data.plans : []);
      setMe(meRes.data || null);
    } catch (e) {
      toastError('Erro', e?.response?.data?.message || e?.message || 'Falha ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activateFree = async () => {
    try {
      setLoading(true);
      await api.post('/api/billing/activate-free', {}, { headers: getAuthHeader() });
      toastSuccess('Pronto!', 'Plano grátis ativado.');
      await load();
    } catch (e) {
      toastError('Erro', e?.response?.data?.message || 'Falha ao ativar grátis');
    } finally {
      setLoading(false);
    }
  };

  const startCheckout = async (planId) => {
    try {
      setLoading(true);
      const res = await api.post(
        '/api/billing/checkout',
        { planId },
        { headers: { ...getAuthHeader(), 'Content-Type': 'application/json' } }
      );

      const checkoutUrl = res.data?.checkoutUrl;
      const billingId = res.data?.billingId;

      if (!checkoutUrl || !billingId) {
        toastError('Erro', 'Checkout não retornou URL.');
        return;
      }

      localStorage.setItem('pendingBillingId', String(billingId));
      toastInfo('Redirecionando', 'Abrindo pagamento no AbacatePay...');
      window.location.href = checkoutUrl;
    } catch (e) {
      toastError('Erro', e?.response?.data?.message || 'Falha ao criar checkout');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => logout();

  const orderedPlans = useMemo(() => {
    const order = ['FREE', 'PLAN_1490'];
    const map = new Map((plans || []).map((p) => [String(p.id), p]));
    return order.map((id) => map.get(id)).filter(Boolean);
  }, [plans]);

  const getPlanVisual = (planId) => {
    const id = String(planId || '');
    if (id === 'FREE') return { Icon: FaRegSmile, featured: false, popular: null, ariaLabel: 'Plano grátis' };
    if (id === 'PLAN_1490') return { Icon: FaCrown, featured: true, popular: 'Recomendado', ariaLabel: 'Plano completo' };
    return { Icon: FaCrown, featured: false, popular: null, ariaLabel: 'Plano' };
  };

  const faqs = useMemo(
    () => [
      {
        q: 'Posso mudar de plano a qualquer momento?',
        a: 'Sim! Você pode fazer upgrade ou downgrade a qualquer momento. As mudanças entram em vigor após confirmação do pagamento (quando aplicável).',
      },
      {
        q: 'O que acontece se eu cancelar minha assinatura?',
        a: 'Você mantém acesso aos recursos do plano até o fim do período de validade. Após isso, sua conta volta para o plano gratuito.',
      },
      {
        q: 'Posso adicionar mais modelos ao plano Grátis?',
        a: 'O plano gratuito tem limite. Para aumentar, faça upgrade para um plano pago.',
      },
      {
        q: 'Qual forma de pagamento vocês aceitam?',
        a: 'Atualmente, o pagamento é via PIX (AbacatePay).',
      },
      {
        q: 'Quando minha assinatura é ativada?',
        a: 'A ativação ocorre após a confirmação do pagamento. Em caso de dúvida, use o botão “Já paguei (confirmar)”.',
      },
    ],
    []
  );

  return (
    <div className="subscription-plans-page">
      <header>
        <div className="logo">
          <div className="logo-text">
            Diecast <span className="logo-accent">Social</span>
          </div>
        </div>

        <div className="header-actions">
          <button className="home-btn" onClick={() => navigate('/profile')}>Voltar</button>
          <button className="home-btn" onClick={() => navigate('/home')}>Home</button>
          <button className="home-btn danger-btn" onClick={handleLogout}>Sair</button>
        </div>
      </header>

      <main className="main-container">
        <div className="page-header">
          <div className="page-badge">Planos & Preços</div>
          <h1 className="page-title">Escolha o plano ideal para você</h1>
          <p className="page-subtitle">
            Comece gratuitamente e faça upgrade quando precisar de mais recursos para sua coleção.
          </p>
        </div>

        <div className="current-banner">
          <div>
            <div className="current-banner-title">Seu plano atual: {me?.subscription?.planName || 'Grátis'}</div>
            <div className="current-banner-sub">
              Status: {me?.subscription?.status || 'ACTIVE'}
              {me?.subscription?.validUntil
                ? ` • Válido até: ${new Date(me.subscription.validUntil).toLocaleDateString('pt-BR')}`
                : ''}
              {usageText ? ` • Coleção: ${usageText.col} • Desejos: ${usageText.wish}` : ''}
            </div>
          </div>

          <div className="current-banner-actions">
            <button
              className="plan-cta btn-secondary"
              style={{ width: 'auto', padding: '0.75rem 1rem' }}
              disabled={loading}
              onClick={() => navigate('/assinatura/sucesso')}
            >
              Já paguei (confirmar)
            </button>
          </div>
        </div>

        <div className="pricing-grid">
          {orderedPlans.map((p) => {
            const isCurrent = String(p.id) === String(currentPlanId);
            const isPro = String(p.id) === 'PLAN_1490';
            const unlimitedCollection = isPro || p?.limits?.collection == null;
            const unlimitedWishlist = isPro || p?.limits?.wishlist == null;
            const visual = getPlanVisual(p.id);
            const PlanIcon = visual.Icon;

            const isFree = p.priceCents <= 0;
            const ctaText = isCurrent ? 'Plano atual' : (isFree ? 'Começar Grátis' : `Assinar ${p.name}`);

            const onCta = () => {
              if (isCurrent) return;
              if (isFree) return activateFree();
              return startCheckout(p.id);
            };

            return (
              <div
                key={p.id}
                className={`pricing-card${visual.featured ? ' featured' : ''}`}
              >
                {visual.popular ? <span className="popular-badge">{visual.popular}</span> : null}

                <div className="plan-icon" aria-hidden={visual.ariaLabel ? undefined : true}>
                  <PlanIcon aria-label={visual.ariaLabel} focusable="false" />
                </div>
                <h3 className="plan-name">{p.name}{isCurrent ? ' • Atual' : ''}</h3>
                <p className="plan-description">{p.description}</p>

                <div className="plan-price">
                  {isFree ? (
                    <>
                      <div className="price-free">R$ 0</div>
                      <span className="price-period">para sempre</span>
                    </>
                  ) : (
                    <>
                      <span className="price-amount">{formatBRL(p.priceCents)}</span>
                      <span className="price-period"> / mês</span>
                    </>
                  )}
                </div>

                <ul className="plan-features">
                  <li className="feature-item">
                    <span className="feature-icon">✓</span>
                    <span className="feature-text">Coleção: {unlimitedCollection ? 'Sem limite' : `até ${p.limits.collection}`}</span>
                  </li>
                  <li className="feature-item">
                    <span className="feature-icon">✓</span>
                    <span className="feature-text">Desejos: {unlimitedWishlist ? 'Sem limite' : `até ${p.limits.wishlist}`}</span>
                  </li>
                  {!isFree ? (
                    <li className="feature-item">
                      <span className="feature-icon">✓</span>
                      <span className="feature-text">Ativação por 30 dias após pagamento (PIX)</span>
                    </li>
                  ) : null}
                </ul>

                <button
                  className={`plan-cta ${visual.featured ? 'btn-primary' : 'btn-secondary'}`}
                  disabled={loading || isCurrent}
                  onClick={onCta}
                >
                  {ctaText}
                </button>
              </div>
            );
          })}
        </div>

        {loading ? <p style={{ textAlign: 'center', color: '#9ca3af' }}>Carregando...</p> : null}

        <div className="faq-section">
          <div className="faq-header">
            <h2 className="faq-title">Perguntas Frequentes</h2>
            <p className="faq-subtitle">Tire suas dúvidas sobre os planos</p>
          </div>

          {faqs.map((item, idx) => {
            const isActive = activeFaq === idx;
            return (
              <div
                key={item.q}
                className={`faq-item${isActive ? ' active' : ''}`}
                onClick={() => setActiveFaq(isActive ? null : idx)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveFaq(isActive ? null : idx);
                  }
                }}
              >
                <div className="faq-question">
                  <span>{item.q}</span>
                  <span className="faq-icon">▼</span>
                </div>

                {isActive ? <div className="faq-answer">{item.a}</div> : null}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default SubscriptionPlansPage;
