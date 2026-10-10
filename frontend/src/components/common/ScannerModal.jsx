import { useRef, useState } from 'react';
import { api } from '../../utils/api';
import { toastSuccess, toastError, toastWarning } from '../../utils/alerts';
import '../../css/ScannerModal.css';

const getAuthHeaders = () => {
  let token = localStorage.getItem('token');
  if (token && !token.startsWith('Bearer ')) token = `Bearer ${token}`;
  return token ? { Authorization: token } : {};
};

/**
 * ScannerModal
 * Props:
 *   onClose        — fecha o modal
 *   profileUser    — { userId, name, collection: [ids], wishlist: [ids] }
 *                    se null → modo próprio (add à garagem / desejos)
 *                    se definido → modo perfil (verifica se o usuário tem/deseja)
 */
const ScannerModal = ({ onClose, profileUser = null }) => {
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('visual'); // 'visual' | 'ocr' | 'packaging'
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState([]);
  const [scanned, setScanned] = useState(false);

  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  const isProfileMode = !!profileUser;

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResults([]);
    setScanned(false);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const handleScan = async () => {
    if (!file) return toastWarning('Atenção', 'Selecione ou tire uma foto primeiro.');
    setScanning(true);
    setResults([]);
    setScanned(false);
    try {
      const form = new FormData();
      form.append('file', file);

      const endpoint =
        mode === 'ocr'
          ? '/api/recognizer/text'
          : mode === 'packaging'
          ? '/api/recognizer/packaging'
          : '/api/recognizer/reconhecer';

      const { data } = await api.post(endpoint, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const cars =
        mode === 'visual'
          ? data.top5 || []
          : data.top3 || [];

      if (!cars.length) {
        toastError('Não encontrado', 'Nenhum carrinho identificado. Tente outra foto.');
      } else {
        setResults(cars);
      }
    } catch {
      toastError('Erro', 'Falha ao identificar. Tente novamente.');
    } finally {
      setScanning(false);
      setScanned(true);
    }
  };

  const addToCollection = async (carId) => {
    const token = localStorage.getItem('token');
    if (!token) return toastWarning('Atenção', 'Faça login primeiro.');
    try {
      await api.post('/api/collection/add', { hotWheelId: carId }, { headers: getAuthHeaders() });
      toastSuccess('Adicionado!', 'Carrinho adicionado à sua garagem.');
    } catch {
      toastError('Erro', 'Não foi possível adicionar à garagem.');
    }
  };

  const addToWishlist = async (carId) => {
    const token = localStorage.getItem('token');
    if (!token) return toastWarning('Atenção', 'Faça login primeiro.');
    try {
      await api.post('/api/wishlist', { hotWheelId: carId }, { headers: getAuthHeaders() });
      toastSuccess('Adicionado!', 'Carrinho adicionado à lista de desejos.');
    } catch {
      toastError('Erro', 'Não foi possível adicionar aos desejos.');
    }
  };

  // Verifica status no perfil do outro usuário
  const getProfileStatus = (carId) => {
    if (!profileUser) return null;
    const id = String(carId);
    const inCollection = (profileUser.collection || []).some(
      (c) => String(c?._id || c) === id
    );
    const inWishlist = (profileUser.wishlist || []).some(
      (c) => String(c?._id || c) === id
    );
    return { inCollection, inWishlist };
  };

  return (
    <div className="scanner-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="scanner-modal">
        {/* Header */}
        <div className="scanner-header">
          <span className="scanner-title">
            {isProfileMode
              ? `🔍 Verificar no perfil de ${profileUser.name}`
              : '📷 Identificar Carrinho'}
          </span>
          <button className="scanner-close" onClick={onClose}>✕</button>
        </div>

        {/* Área de foto */}
        <div className="scanner-photo-area">
          {preview ? (
            <div className="scanner-preview-wrap">
              <img src={preview} alt="preview" className="scanner-preview-img" />
              <button
                className="scanner-change-photo"
                onClick={() => { setPreview(null); setFile(null); setResults([]); setScanned(false); }}
              >
                Trocar foto
              </button>
            </div>
          ) : (
            <div className="scanner-pick-wrap">
              <div className="scanner-pick-icon">📷</div>
              <p className="scanner-pick-hint">Aponte a câmera ou escolha uma foto</p>
              <div className="scanner-pick-btns">
                {/* Câmera — abre câmera traseira no celular */}
                <button
                  className="scanner-btn scanner-btn--camera"
                  onClick={() => cameraRef.current?.click()}
                >
                  Câmera
                </button>
                {/* Galeria */}
                <button
                  className="scanner-btn scanner-btn--gallery"
                  onClick={() => galleryRef.current?.click()}
                >
                  Galeria
                </button>
              </div>
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </div>
          )}
        </div>

        {/* Modo de scan */}
        {preview && !scanned && (
          <div className="scanner-mode-row">
            <button
              className={`scanner-mode-btn${mode === 'visual' ? ' active' : ''}`}
              onClick={() => setMode('visual')}
            >
              🖼 Frente
            </button>
            <button
              className={`scanner-mode-btn${mode === 'ocr' ? ' active' : ''}`}
              onClick={() => setMode('ocr')}
            >
              🔤 Baixo
            </button>
            <button
              className={`scanner-mode-btn${mode === 'packaging' ? ' active' : ''}`}
              onClick={() => setMode('packaging')}
            >
              📦 Embalagem
            </button>
          </div>
        )}

        {/* Botão identificar */}
        {preview && !scanned && (
          <button
            className="scanner-identify-btn"
            onClick={handleScan}
            disabled={scanning}
          >
            {scanning ? (
              <span className="scanner-spin-wrap">
                <span className="scanner-spinner" /> Identificando…
              </span>
            ) : (
              'Identificar'
            )}
          </button>
        )}

        {/* Resultados */}
        {results.length > 0 && (
          <div className="scanner-results">
            <p className="scanner-results-title">
              {results.length} resultado{results.length > 1 ? 's' : ''} encontrado{results.length > 1 ? 's' : ''}
            </p>
            <div className="scanner-results-list">
              {results.map((car) => {
                const status = getProfileStatus(car.id);
                return (
                  <div key={car.id} className="scanner-car-card">
                    <img
                      src={car.url}
                      alt={car.nome}
                      className="scanner-car-img"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <div className="scanner-car-info">
                      <p className="scanner-car-name">{car.nome}</p>
                      {car.ano && (
                        <p className="scanner-car-year">{car.ano}</p>
                      )}

                      {/* Modo próprio */}
                      {!isProfileMode && (
                        <div className="scanner-actions">
                          <button
                            className="scanner-action-btn scanner-action-btn--garage"
                            onClick={() => addToCollection(car.id)}
                          >
                            🚗 Garagem
                          </button>
                          <button
                            className="scanner-action-btn scanner-action-btn--wish"
                            onClick={() => addToWishlist(car.id)}
                          >
                            ❤️ Desejar
                          </button>
                        </div>
                      )}

                      {/* Modo perfil */}
                      {isProfileMode && status && (
                        <div className="scanner-profile-status">
                          <span className={`scanner-status-tag${status.inCollection ? ' has' : ''}`}>
                            {status.inCollection ? `✅ ${profileUser.name} tem` : `✗ Não tem`}
                          </span>
                          <span className={`scanner-status-tag${status.inWishlist ? ' wants' : ''}`}>
                            {status.inWishlist ? `❤️ Deseja` : `✗ Não deseja`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* No modo próprio, permitir tentar de novo */}
            {!isProfileMode && (
              <button
                className="scanner-retry-btn"
                onClick={() => { setPreview(null); setFile(null); setResults([]); setScanned(false); }}
              >
                Escanear outro
              </button>
            )}
          </div>
        )}

        {scanned && results.length === 0 && (
          <div className="scanner-empty">
            <p>Nenhum carrinho identificado.</p>
            <button
              className="scanner-retry-btn"
              onClick={() => { setPreview(null); setFile(null); setScanned(false); }}
            >
              Tentar novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScannerModal;
