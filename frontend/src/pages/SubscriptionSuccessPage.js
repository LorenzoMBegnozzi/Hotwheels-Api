import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import '../css/ProfilePage.css';
import { api } from '../utils/api';
import { toastError, toastInfo, toastSuccess } from '../utils/alerts';

const getAuthHeader = () => {
  let token = localStorage.getItem('token');
  if (token && !token.startsWith('Bearer ')) token = `Bearer ${token}`;
  return token ? { Authorization: token } : {};
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SubscriptionSuccessPage = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('PENDING');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const billingId = localStorage.getItem('pendingBillingId');
      if (!billingId) {
        setLoading(false);
        setStatus('MISSING');
        return;
      }

      try {
        toastInfo('Confirmando', 'Verificando pagamento...');
        setLoading(true);

        // tenta algumas vezes (PIX pode demorar)
        for (let i = 0; i < 10; i++) {
          const res = await api.post(
            '/api/billing/confirm',
            { billingId },
            { headers: { ...getAuthHeader(), 'Content-Type': 'application/json' } }
          );

          if (res.data?.paid) {
            setStatus('PAID');
            toastSuccess('Pagamento confirmado!', 'Seu plano foi ativado.');
            localStorage.removeItem('pendingBillingId');
            setLoading(false);
            return;
          }

          const s = res.data?.status || 'PENDING';
          setStatus(s);
          await sleep(3000);
        }

        setLoading(false);
      } catch (e) {
        setLoading(false);
        setStatus('ERROR');
        toastError('Erro', e?.response?.data?.message || 'Falha ao confirmar pagamento');
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="profile-page">
      <header className="hw-header">
        <div className="hw-logo">
          <div className="hw-logo-text">
            Diecast <span className="hw-logo-accent">Social</span>
          </div>
        </div>

        <div className="hw-header-actions">
          <button className="hw-btn hw-btn-ghost" onClick={() => navigate('/assinatura')}>Voltar aos planos</button>
          <button className="hw-btn hw-btn-ghost" onClick={() => navigate('/profile')}>Perfil</button>
        </div>
      </header>

      <main className="hw-container">
        <section className="hw-settings">
          <div className="hw-card">
            <h2 className="hw-card-title">Pagamento</h2>
            {loading ? (
              <p className="profile-loading">Aguardando confirmação do PIX...</p>
            ) : (
              <p style={{ opacity: 0.9 }}>
                Status: <b>{status}</b>
              </p>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button className="hw-btn hw-btn-primary" onClick={() => navigate('/assinatura')}>Ver planos</button>
              <button className="hw-btn hw-btn-ghost" onClick={() => window.location.reload()}>Tentar novamente</button>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
              Se o pagamento foi feito agora, pode levar alguns segundos para confirmar.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default SubscriptionSuccessPage;
