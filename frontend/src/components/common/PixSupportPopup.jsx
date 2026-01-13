import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import '../../css/PixSupportPopup.css';

const PIX_COPIA_E_COLA =
  '00020126580014BR.GOV.BCB.PIX0136279987cb-5902-4b41-ad87-1dd3aa31c1585204000053039865802BR5924Lorenzo Marzola Begnozzi6009SAO PAULO6214051099zL6T9NDo63048B39';

const PIX_QR_PUBLIC_PATH = '/pix.jpg';
const PIX_QR_FALLBACK_PUBLIC_PATH = '/pix-placeholder.svg';

const copyTextToClipboard = async (text) => {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  throw new Error('Clipboard API unavailable');
};

const PixSupportPopup = ({ intervalMs = 60_000 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pixCopyState, setPixCopyState] = useState('idle');
  const [pixQrSrc, setPixQrSrc] = useState(`${process.env.PUBLIC_URL}${PIX_QR_PUBLIC_PATH}`);

  useEffect(() => {
    // abre a cada intervalo (em Routes está 15 min), e repete
    const id = setInterval(() => {
      setIsOpen(true);
    }, intervalMs);

    return () => clearInterval(id);
  }, [intervalMs]);

  useEffect(() => {
    if (!isOpen) return;
    setPixCopyState('idle');
    setPixQrSrc(`${process.env.PUBLIC_URL}${PIX_QR_PUBLIC_PATH}`);
  }, [isOpen]);

  const handleCopyPix = async () => {
    try {
      await copyTextToClipboard(PIX_COPIA_E_COLA);
      setPixCopyState('copied');
      setTimeout(() => setPixCopyState('idle'), 1800);
    } catch {
      setPixCopyState('error');
      setTimeout(() => setPixCopyState('idle'), 2500);
    }
  };

  const pixButtonLabel = useMemo(() => {
    if (pixCopyState === 'copied') return 'Copiado!';
    if (pixCopyState === 'error') return 'Falhou — tente novamente';
    return 'Copiar código do Pix';
  }, [pixCopyState]);

  if (!isOpen) return null;

  return (
    <section className="pix-popup-root" aria-label="Apoie o projeto via Pix">
      <div className="pix-popup-card">
        <button
          type="button"
          className="pix-popup-close"
          onClick={() => setIsOpen(false)}
          aria-label="Fechar"
        >
          ×
        </button>

        <div className="pix-popup-header">
          <h3 className="pix-popup-title">Para ajudar o projeto…</h3>
        </div>

        <div className="pix-popup-body">
          <div className="pix-popup-qr" aria-label="QR Code Pix">
            <img
              src={pixQrSrc}
              alt="QR Code Pix"
              className="pix-popup-qr-img"
              loading="lazy"
              onError={() => setPixQrSrc(`${process.env.PUBLIC_URL}${PIX_QR_FALLBACK_PUBLIC_PATH}`)}
            />
          </div>

          <div className="pix-popup-actions">
            <button type="button" className="pix-popup-copy" onClick={handleCopyPix}>
              {pixButtonLabel}
            </button>
            <div className="pix-popup-hint" aria-live="polite">
              {pixCopyState === 'copied' && 'Pronto! Agora é só colar no seu banco.'}
              {pixCopyState === 'error' &&
                'Não foi possível copiar automaticamente no seu navegador. Tente novamente.'}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

PixSupportPopup.propTypes = {
  intervalMs: PropTypes.number,
};

export default PixSupportPopup;
