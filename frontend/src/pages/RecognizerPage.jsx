import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/RecognizerPage.css';
import '../css/HomePage.css';
import { toastSuccess, toastError, toastInfo, toastWarning } from '../utils/alerts';
import { api } from '../utils/api';

const RecognizerPage = () => {
  const navigate = useNavigate();
  // ==== RECONHECIMENTO VISUAL DESATIVADO (comentado) =====
  // const [file, setFile] = useState(null);
  // const [selectedFileName, setSelectedFileName] = useState('');
  // Campo de nome removido (cadastro desativado)
  // const [loading, setLoading] = useState(false);
  // const [mensagem, setMensagem] = useState('');
  // const [top5, setTop5] = useState([]); // agora exibimos até 5 resultados
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrTexto, setOcrTexto] = useState('');
  const [ocrAno, setOcrAno] = useState(null);
  const [ocrTop3, setOcrTop3] = useState([]);
  async function addToCollection(id) {
    try {
      const tokenRaw = localStorage.getItem('token');
      if (!tokenRaw) return toastWarning('Atenção', 'Faça login para adicionar à coleção');
      const token = tokenRaw.startsWith('Bearer ') ? tokenRaw : `Bearer ${tokenRaw}`;
      // checar duplicata localmente (se disponível)
      try {
        const userRaw = localStorage.getItem('user');
        if (userRaw) {
          const user = JSON.parse(userRaw);
          const exists = (user.collection || []).some((c) => String(c._id || c) === String(id));
          if (exists) {
            return toastInfo('Aviso', 'Este modelo já está na sua coleção.');
          }
        }
      } catch (e) { /* ignore parsing errors */ }

      const { data } = await api.post(`/api/collection/add`, { hotWheelId: id }, { headers: { Authorization: token } });
      toastSuccess('Sucesso', data.message || 'Adicionado à coleção');
    } catch (e) {
      toastError('Erro', 'Não foi possível adicionar à coleção');
    }
  }

  async function addToWishlist(id) {
    try {
      const tokenRaw = localStorage.getItem('token');
      if (!tokenRaw) return toastWarning('Atenção', 'Faça login para adicionar à wishlist');
      const token = tokenRaw.startsWith('Bearer ') ? tokenRaw : `Bearer ${tokenRaw}`;
      // checar duplicata localmente (se disponível)
      try {
        const userRaw = localStorage.getItem('user');
        if (userRaw) {
          const user = JSON.parse(userRaw);
          const exists = (user.favorites || []).some((c) => String(c._id || c) === String(id));
          if (exists) {
            return toastInfo('Aviso', 'Este modelo já está na sua lista de desejos.');
          }
        }
      } catch (e) { /* ignore parsing errors */ }

      const { data } = await api.post(`/api/wishlist`, { hotWheelId: id }, { headers: { Authorization: token } });
      toastSuccess('Sucesso', data.message || 'Adicionado à wishlist');
    } catch (e) {
      toastError('Erro', 'Não foi possível adicionar à wishlist');
    }
  }
  // const [preview, setPreview] = useState(null);
  const [undersideFile, setUndersideFile] = useState(null);
  const [undersidePreview, setUndersidePreview] = useState(null);
  // const fileInputRef = useRef(null);
  const undersideInputRef = useRef(null);

  const backendBase = `/api/recognizer`;

  // function onFileChange(e) {
  //   const f = e.target.files[0];
  //   setFile(f || null);
  //   setSelectedFileName(f ? f.name : '');
  //   setTop5([]);
  //   setMensagem('');
  //   setOcrTexto('');
  //   setOcrAno(null);
  //   setOcrTop3([]);
  //   if (f) {
  //     const reader = new FileReader();
  //     reader.onload = ev => setPreview(ev.target.result);
  //     reader.readAsDataURL(f);
  //   } else {
  //     setPreview(null);
  //   }
  // }

  function onUndersideChange(e) {
    const f = e.target.files[0];
    setUndersideFile(f || null);
    if (f) {
      const reader = new FileReader();
      reader.onload = ev => setUndersidePreview(ev.target.result);
      reader.readAsDataURL(f);
    } else {
      setUndersidePreview(null);
    }
    // limpa resultados anteriores de OCR
    setOcrTexto('');
    setOcrAno(null);
    setOcrTop3([]);
  }

  // Função de cadastrar removida

  // async function reconhecer() {
  //   if (!file) {
  //     setMensagem('⚠️ Selecione uma imagem para reconhecer.');
  //     return;
  //   }
  //   try {
  //     setLoading(true);
  //     // Oculta a imagem imediatamente
  //     setPreview(null);
  //     const form = new FormData();
  //     form.append('file', file);
  //     const { data } = await axios.post(`${backendBase}/reconhecer`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  //     setMensagem(data.mensagem || '');
  //     // API ainda retorna 'top3'. Para 5, ajustaremos backend; por enquanto aceita top5 ou top3.
  //     const arr = data.top5 || data.top3 || [];
  //     setTop5(arr);
  //   } catch (err) {
  //     console.error(err);
  //     const status = err.response?.status;
  //     const serverMsg = err.response?.data?.mensagem || err.message;
  //     setMensagem(`❌ Erro ao reconhecer imagem${status ? ' (' + status + ')' : ''}: ${serverMsg}`);
  //     setTop5([]);
  //   } finally {
  //     setLoading(false);
  //   }
  // }

  async function reconhecerPorTexto() {
    if (!undersideFile) {
      toastWarning('Atenção', 'Selecione a imagem da parte de baixo do carrinho.');
      return;
    }
    try {
      setOcrLoading(true);
      const form = new FormData();
      form.append('file', undersideFile);
      const { data } = await api.post(`${backendBase}/text`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (data.status === 'ok') {
        setOcrTexto(data.texto || '');
        setOcrAno(data.anoDetectado || null);
        setOcrTop3(data.top3 || []);
      } else {
        setOcrTexto('');
        setOcrAno(null);
        setOcrTop3([]);
        toastInfo('Info', data.mensagem || 'Nada reconhecido');
      }
    } catch (err) {
      console.error(err);
      toastError('Erro', 'Falha no OCR de texto');
    } finally {
      setOcrLoading(false);
    }
  }

  // const hasAttempt = mensagem && top5.length === 0 && !loading;

  return (
    <div className="recognizer-container">
      <div className="header-bar">
        <h2>Reconhecedor</h2>
        <button className="back-button" onClick={() => navigate('/home')}>Voltar</button>
      </div>

      <div className="form-section" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* BLOCO VISUAL DESATIVADO */}
        {/* <div>
          <label style={{ fontWeight: '600' }}>Imagem para Reconhecimento Visual:</label>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="input-file" />
          {selectedFileName && (
            <p className="file-name" style={{ marginTop: '4px', fontSize: '0.85rem' }}>{selectedFileName}</p>
          )}
        </div> */}
        <div>
          <label style={{ fontWeight: '600' }}>Imagem da Parte de Baixo (Texto/OCR):</label>
          <input ref={undersideInputRef} type="file" accept="image/*" onChange={onUndersideChange} className="input-file" />
        </div>
      </div>

      {/* PREVIEW VISUAL DESATIVADO */}
      {/* <div className="preview-section" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '16px' }}>
        {preview && (
          <div className="preview-card">
            <img src={preview} alt="Preview visual" className="preview-image fixed" />
            <div className="buttons-row" style={{ marginTop: '8px' }}>
              <button disabled={loading || !file} onClick={reconhecer} className="action-button primary">Reconhecer (Visual)</button>
            </div>
          </div>
        )}
      </div> */}
      {/* Mantém apenas preview underside para contexto do OCR */}
      {undersidePreview && (
        <div className="preview-card" style={{ marginTop: '16px' }}>
          <img src={undersidePreview} alt="Preview underside" className="preview-image fixed" />
        </div>
      )}
      <button
        disabled={ocrLoading || !undersideFile}
        onClick={reconhecerPorTexto}
        className="ocr-button"
        title="Executa reconhecimento de texto (OCR) da parte inferior"
      >
        <span>Scanear Texto</span>
      </button>
  {/* Loading visual removido, mantemos apenas OCR */}
  {ocrLoading && <p>Processando OCR...</p>}

      {/* Texto reconhecido em destaque
      {ocrTexto && (
        <div style={{ marginTop: '20px', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', background: '#fafafa' }}>
          <h3 style={{ marginTop: 0 }}>Texto reconhecido:</h3>
          <p style={{ fontSize: '1.1rem', fontWeight: '600', letterSpacing: '0.5px' }}>{ocrTexto}</p>
          {ocrAno && <p style={{ marginTop: '4px' }}>Ano detectado: <strong>{ocrAno}</strong></p>}
        </div>
      )} */}

      {/* RESULTADOS VISUAIS DESATIVADOS */}
      {/* {top5.length > 0 && (
        <div className="recognizer-fixed-results">
          {top5.map(car => (
            <div key={car.id || car.url} className="car-item">
              <h3>{car.nome}</h3>
              <img src={car.url} alt={car.nome} className="car-image" />
              <p>Similaridade: {(car.similaridade * 100).toFixed(1)}% | Diferença: {(car.diferenca * 100).toFixed(1)}%</p>
              <div className="buttons">
                {car.id && (
                  <>
                    <button className="search-button" onClick={() => addToCollection(car.id)}>➕ Coleção</button>
                    <button className="search-button" onClick={() => addToWishlist(car.id)}>💙 Wishlist</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )} */}
      {/* Resultados de OCR por texto (match de carrinhos) */}
      {ocrTexto && (
        <div style={{ marginTop: '24px' }}>
          <h3 style={{ marginBottom: '12px' }}>Possíveis correspondências</h3>
          {ocrTop3.length > 0 ? (
            <div className="recognizer-fixed-results">
              {ocrTop3.map(c => (
                <div key={c.id} className="car-item">
                  <h4>{c.nome}</h4>
                  <img src={c.url} alt={c.nome} className="car-image" />
                  <div className="buttons">
                    <button className="search-button" onClick={() => addToCollection(c.id)}>Coleção</button>
                    <button className="search-button" onClick={() => addToWishlist(c.id)}>Wishlist</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>Nenhum match textual encontrado.</p>
          )}
        </div>
      )}
      {ocrAno && (
        <div style={{ marginTop: '20px', padding: '12px', border: '1px solid #eee', borderRadius: '6px' }}>
          <strong>Ano detectado:</strong> {ocrAno}
        </div>
      )}
      {/* Mensagem de tentativa visual desativada */}
      {/* {hasAttempt && !loading && !top5.length && (
        <p style={{ marginTop: '20px', fontWeight: 'bold' }}>Nenhum carrinho parecido encontrado. Tente outra imagem 👍</p>
      )} */}
    </div>
  );
};

export default RecognizerPage;
