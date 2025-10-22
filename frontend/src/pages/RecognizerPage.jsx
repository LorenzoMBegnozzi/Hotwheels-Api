import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../css/RecognizerPage.css';
import '../css/HomePage.css';
import Swal from 'sweetalert2';

const RecognizerPage = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [top3, setTop3] = useState([]);
  async function addToCollection(id) {
    try {
      const tokenRaw = localStorage.getItem('token');
      if (!tokenRaw) return Swal.fire('Atenção','Faça login para adicionar à coleção','warning');
      const token = tokenRaw.startsWith('Bearer ') ? tokenRaw : `Bearer ${tokenRaw}`;
      const { data } = await axios.post('http://localhost:5000/api/collection/add', { hotWheelId: id }, { headers: { Authorization: token } });
      Swal.fire('Sucesso', data.message || 'Adicionado à coleção', 'success');
    } catch (e) {
      Swal.fire('Erro', 'Não foi possível adicionar à coleção', 'error');
    }
  }

  async function addToWishlist(id) {
    try {
      const tokenRaw = localStorage.getItem('token');
      if (!tokenRaw) return Swal.fire('Atenção','Faça login para adicionar à wishlist','warning');
      const token = tokenRaw.startsWith('Bearer ') ? tokenRaw : `Bearer ${tokenRaw}`;
      const { data } = await axios.post('http://localhost:5000/api/wishlist', { hotWheelId: id }, { headers: { Authorization: token } });
      Swal.fire('Sucesso', data.message || 'Adicionado à wishlist', 'success');
    } catch (e) {
      Swal.fire('Erro', 'Não foi possível adicionar à wishlist', 'error');
    }
  }
  const [preview, setPreview] = useState(null);

  const backendBase = 'http://localhost:5000/api/recognizer';

  function onFileChange(e) {
    const f = e.target.files[0];
    setFile(f || null);
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

  async function cadastrar() {
    if (!file || !nome) {
      setMensagem('⚠️ Selecione uma imagem e informe o nome.');
      return;
    }
    try {
      setLoading(true);
      const form = new FormData();
      form.append('file', file);
      form.append('nome', nome);
      const { data } = await axios.post(`${backendBase}/cadastrar`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMensagem(data.mensagem || 'Cadastro efetuado');
    } catch (err) {
      console.error(err);
      const serverMsg = err.response?.data?.mensagem || err.message;
      setMensagem(`❌ Erro ao cadastrar imagem: ${serverMsg}`);
    } finally {
      setLoading(false);
    }
  }

  async function reconhecer() {
    if (!file) {
      setMensagem('⚠️ Selecione uma imagem para reconhecer.');
      return;
    }
    try {
      setLoading(true);
      const form = new FormData();
      form.append('file', file);
      const { data } = await axios.post(`${backendBase}/reconhecer`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMensagem(data.mensagem || '');
      setTop3(data.top3 || []);
    } catch (err) {
      console.error(err);
      const status = err.response?.status;
      const serverMsg = err.response?.data?.mensagem || err.message;
      setMensagem(`❌ Erro ao reconhecer imagem${status ? ' (' + status + ')' : ''}: ${serverMsg}`);
      setTop3([]);
    } finally {
      setLoading(false);
    }
  }

  const hasAttempt = mensagem && top3.length === 0 && !loading;

  return (
    <div className="recognizer-container">
      <div className="header-bar">
        <button className="back-button" onClick={() => navigate('/minha-colecao')}>Voltar</button>
        <h2>🔎 Reconhecedor de Hot Wheels</h2>
      </div>

      <div className="form-section">
        <input
          type="text"
          placeholder="Nome (para cadastrar)"
          value={nome}
          onChange={e => setNome(e.target.value)}
          className="input-text"
        />
        <input type="file" accept="image/*" onChange={onFileChange} className="input-file" />
        <div className="buttons-row">
          <button disabled={loading} onClick={cadastrar} className="action-button">Cadastrar</button>
          <button disabled={loading} onClick={reconhecer} className="action-button primary">Reconhecer</button>
        </div>
      </div>

      {preview && (
        <div className="preview-section">
          <h3>Imagem Selecionada</h3>
            {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
          <img src={preview} alt="Preview da imagem" className="preview-image" />
        </div>
      )}

      {loading && <p>Processando...</p>}
      {mensagem && <p className="mensagem">{mensagem}</p>}

      {top3.length > 0 && (
        <div className="results-container recognizer-results-container">
          {top3.map(car => (
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
      )}
      {hasAttempt && !loading && !top3.length && (
        <p style={{ marginTop: '20px', fontWeight: 'bold' }}>Nenhum carrinho parecido encontrado. Tente outra imagem 👍</p>
      )}
    </div>
  );
};

export default RecognizerPage;
