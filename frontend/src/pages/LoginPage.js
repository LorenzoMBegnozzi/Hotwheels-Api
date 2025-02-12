import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../css/LoginPage.css";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userId", res.data.userId);
      navigate("/home");
    } catch (err) {
      alert("Erro ao fazer login");
    }
  };

  const handleRegister = async () => {
    try {
      await axios.post("http://localhost:5000/api/auth/register", { email, password });
      alert("Usuário cadastrado com sucesso!");
      setIsRegistering(false);
    } catch (err) {
      alert("Erro ao cadastrar usuário");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>{isRegistering ? "Criar Conta" : "Login"}</h2>
        <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} />
        {isRegistering ? (
          <button onClick={handleRegister}>Registrar</button>
        ) : (
          <button onClick={handleLogin}>Entrar</button>
        )}
        <p className="toggle-text" onClick={() => setIsRegistering(!isRegistering)}>
          {isRegistering ? "Já tem uma conta? Faça login." : "Não tem conta? Cadastre-se."}
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
