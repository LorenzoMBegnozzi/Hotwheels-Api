import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/RecognizerPage.css';
import '../css/HomePage.css';
import Swal from 'sweetalert2';
import { addToCollection, addToWishlist } from '../utils/api';

const RecognizerPage = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  // Campo de nome removido (cadastro desativado)
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [top3, setTop3] = useState([]);
  async function addToCollectionHandler(id) {
    try {
      const token = localStorage.getItem('token');
      if (!token) return Swal.fire('Atenção','Faça login para adicionar à coleção','warning');
      
      const response = await addToCollection(id);
      Swal.fire('Sucesso', response.message || 'Adicionado à coleção', 'success');
    } catch (e) {
      Swal.fire('Erro', 'Não foi possível adicionar à coleção', 'error');
    }
  }

  async function addToWishlistHandler(id) {
    try {
      const token = localStorage.getItem('token');
      if (!token) return Swal.fire('Atenção','Faça login para adicionar à wishlist','warning');
      
      const response = await addToWishlist(id);
      Swal.fire('Sucesso', response.message || 'Adicionado à wishlist', 'success');
    } catch (e) {
      Swal.fire('Erro', 'Não foi possível adicionar à wishlist', 'error');
    }
  }
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  const backendBase = 'http://192.168.0.4:5000/api/recognizer';

  function onFileChange(e) {
    const f = e.target.files[0];
    setFile(f || null);
    setSelectedFileName(f ? f.name : '');
    setTop3([]);
    setMensagem('');
    if (f) {
      const reader = new FileReader();
      reader.onload = ev => setPreview(ev.target.result);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }

  // Função de cadastrar removida

  async function reconhecer() {
    if (!file) {
      setMensagem('⚠️ Selecione uma imagem para reconhecer.');
      return;
    }
    try {
      setLoading(true);
      // Oculta a imagem imediatamente
      setPreview(null);
      const form = new FormData();
      form.append('file', file);
      
      const response = await fetch(`${backendBase}/reconhecer`, {
        method: 'POST',
        body: form
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.mensagem || 'Erro no servidor');
      }
      
      setMensagem(data.mensagem || '');
      setTop3(data.top3 || []);
    } catch (err) {
      console.error(err);
      setMensagem(`❌ Erro ao reconhecer imagem: ${err.message}`);
      setTop3([]);
    } finally {
      setLoading(false);
    }
  }

  const hasAttempt = mensagem && top3.length === 0 && !loading;

  return (
    // Removido 'compact' para usar tamanho normal padrão
    <div className="recognizer-container">
      <div className="header-bar">
        <h2>🔎 Reconhecedor de Hot Wheels</h2>
        <button className="back-button" onClick={() => navigate('/minha-colecao')}>Voltar</button>
      </div>

      <div className="form-section">
  <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="input-file" />
        {selectedFileName && (
          <p className="file-name" style={{ marginTop: '8px', fontSize: '0.9rem', fontWeight: '500' }}>
          </p>
        )}
      </div>

      {preview && (
        <div className="preview-section">
          <div className="preview-card">
            {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
            <img src={preview} alt="Preview da imagem" className="preview-image fixed" />
          </div>
          <div className="buttons-row below-image">
            <button disabled={loading || !file} onClick={reconhecer} className="action-button primary">Reconhecer</button>
          </div>
        </div>
      )}

      {loading && <p>Processando...</p>}
      {mensagem && <p className="mensagem">{mensagem}</p>}

      {top3.length > 0 && (
        <div className="recognizer-fixed-results">
          {top3.map(car => (
            <div key={car.id || car.url} className="car-item">
              <h3>{car.nome}</h3>
              <img src={car.url} alt={car.nome} className="car-image" />
              <p>Similaridade: {(car.similaridade * 100).toFixed(1)}% | Diferença: {(car.diferenca * 100).toFixed(1)}%</p>
              <div className="buttons">
                {car.id && (
                  <>
                    <button className="search-button" onClick={() => addToCollectionHandler(car.id)}>➕ Coleção</button>
                    <button className="search-button" onClick={() => addToWishlistHandler(car.id)}>💙 Wishlist</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {hasAttempt && !loading && !top3.length && (
        <p style={{ marginTop: '20px', fontWeight: 'bold' }}>Nenhum carrinho parecido encontrado. Tente outra imagem 👍</p>
      )}
    </div>
  );
};

export default RecognizerPage;
