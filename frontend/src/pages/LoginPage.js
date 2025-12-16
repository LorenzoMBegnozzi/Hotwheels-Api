// LoginPage.jsx
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import "../css/LoginPage.css";
import Logo from "../css/logo2.png"; 
import { API_BASE_URL } from "../utils/constants";

const LoginPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerCodeSent, setRegisterCodeSent] = useState(false);
  const [signupCode, setSignupCode] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userId", res.data.userId);

      Swal.fire({
        title: "Login realizado!",
        text: "Bem-vindo de volta!",
        icon: "success",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });

      navigate("/home");
    } catch (err) {
      Swal.fire("Erro!", err.response?.data?.message || "Erro ao fazer login.", "error");
    }
  };

  const handleRequestSignupCode = async () => {
    if (!email || !password || !confirmPassword) {
      return Swal.fire("Erro!", "Preencha email e senhas.", "error");
    }
    if (password !== confirmPassword) {
      return Swal.fire("Erro!", "As senhas não coincidem.", "error");
    }
    try {
      await axios.post(`${API_BASE_URL}/auth/register`, { name, email, password, confirmPassword });
      setRegisterCodeSent(true);
      Swal.fire("Verificação", "Código enviado ao seu email.", "success");
    } catch (err) {
      Swal.fire("Erro!", err.response?.data?.message || "Erro ao enviar código.", "error");
    }
  };

  const handleConfirmSignup = async () => {
    if (!signupCode) return Swal.fire("Erro!", "Informe o código recebido.", "error");
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/confirm-signup`, { name, email, password, code: signupCode });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userId", res.data.userId);
      Swal.fire("Sucesso!", "Conta criada.", "success");
      setIsRegistering(false);
      setRegisterCodeSent(false);
      navigate("/home");
    } catch (err) {
      Swal.fire("Erro!", err.response?.data?.message || "Erro ao confirmar cadastro.", "error");
    }
  };

  const handleRequestResetCode = async () => {
    if (!email) return Swal.fire("Erro!", "Informe o email da conta.", "error");
    try {
      await axios.post(`${API_BASE_URL}/auth/request-reset-code`, { email });
      setResetCodeSent(true);
      Swal.fire("Verificação", "Código enviado ao seu email.", "success");
    } catch (err) {
      Swal.fire("Erro!", err.response?.data?.message || "Erro ao enviar código.", "error");
    }
  };

  const handleConfirmReset = async () => {
    if (!resetCode) return Swal.fire("Erro!", "Informe o código recebido.", "error");
    if (newPassword !== confirmNewPassword) {
      return Swal.fire("Erro!", "As senhas não coincidem.", "error");
    }
    try {
      await axios.post(`${API_BASE_URL}/auth/confirm-reset`, { email, code: resetCode, newPassword, confirmPassword: confirmNewPassword });
      Swal.fire("Sucesso!", "Senha alterada.", "success");
      setIsResetting(false);
      setResetCodeSent(false);
    } catch (err) {
      Swal.fire("Erro!", err.response?.data?.message || "Erro ao confirmar reset.", "error");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <img src={Logo} alt="Logo" className="login-logo" />
        <h2>
          {isRegistering ? (registerCodeSent ? "Confirmar Cadastro" : "Criar Conta") : isResetting ? (resetCodeSent ? "Confirmar Redefinição" : "Redefinir Senha") : "Login"}
        </h2>
        {isRegistering && (
          <input type="text" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
        )}
        {!isResetting && (
          <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        )}
        {!isResetting && !registerCodeSent && (
          <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} />
        )}
        {isRegistering && (
          registerCodeSent ? (
            <input type="text" placeholder="Código recebido" value={signupCode} onChange={(e) => setSignupCode(e.target.value)} />
          ) : (
            <input type="password" placeholder="Confirmar Senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          )
        )}
        {isResetting && (
          <>
            {resetCodeSent ? (
              <>
                <input type="text" placeholder="Código recebido" value={resetCode} onChange={(e) => setResetCode(e.target.value)} />
                <input type="password" placeholder="Nova Senha" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                <input type="password" placeholder="Confirmar Nova Senha" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
              </>
            ) : (
              <p className="info-text">Informe seu email para receber o código.</p>
            )}
          </>
        )}
        {isRegistering ? (
          registerCodeSent ? (
            <button onClick={handleConfirmSignup}>Confirmar Cadastro</button>
          ) : (
            <button onClick={handleRequestSignupCode}>Enviar Código</button>
          )
        ) : isResetting ? (
          resetCodeSent ? (
            <button onClick={handleConfirmReset}>Confirmar Redefinição</button>
          ) : (
            <button onClick={handleRequestResetCode}>Enviar Código</button>
          )
        ) : (
          <button onClick={handleLogin}>Login</button>
        )}
        <p
          className="toggle-text"
          onClick={() => {
            setIsRegistering(false);
            setRegisterCodeSent(false);
            setIsResetting(!isResetting);
            setResetCodeSent(false);
          }}
        >
          {isResetting ? "Voltar para Login" : "Esqueceu a senha?"}
        </p>
        {!isResetting && (
          <p className="toggle-text" onClick={() => setIsRegistering(!isRegistering)}>
            {isRegistering ? "Já tem uma conta? Faça login." : "Não tem conta? Cadastre-se."}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
