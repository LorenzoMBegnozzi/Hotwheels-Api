import React from "react";
import { useNavigate } from "react-router-dom";
import "../css/RecognizerPage.css";

const RecognizerPage = () => {
  const navigate = useNavigate();

  return (
    <div className="recognizer-container">
      <button className="back-button" onClick={() => navigate("/minha-colecao")}>
        Voltar para Coleção
      </button>
      <iframe
        src="http://localhost:8000/app"
        title="Reconhecedor de Imagens"
        className="recognizer-iframe"
      />
    </div>
  );
};

export default RecognizerPage;
