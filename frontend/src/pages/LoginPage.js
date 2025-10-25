import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, registerUser, updatePassword } from "../utils/api";
import { isAuthenticated } from "../utils/auth";
import Swal from "sweetalert2";
import "../css/LoginPage.css";
import Logo from "../css/pngwing.com.png"; 

const LoginPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) {
      console.log("Usuário já está logado, redirecionando...");
      navigate("/home");
    }
  }, [navigate]);

  const handleLogin = async () => {
    if (!email || !password) {
      Swal.fire("Erro", "Por favor, preencha todos os campos.", "error");
      return;
    }
    try {
      const res = await loginUser(email, password);
      if (res.token && res.userId) {
        localStorage.setItem("token", res.token);
        localStorage.setItem("userId", res.userId);
        await Swal.fire("Sucesso", "Login realizado com sucesso!", "success");
        navigate("/home");
      } else {
        throw new Error("Resposta inválida do servidor");
      }
    } catch (err) {
      Swal.fire("Erro", err.message || "Erro ao fazer login.", "error");
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Swal.fire("Erro", "Por favor, preencha todos os campos.", "error");
      return;
    }
    if (password !== confirmPassword) {
      Swal.fire("Erro", "As senhas não coincidem.", "error");
      return;
    }
    try {
      await registerUser(name, email, password);
      await Swal.fire("Sucesso", "Usuário cadastrado com sucesso! Agora você pode fazer login.", "success");
      setName(""); setEmail(""); setPassword(""); setConfirmPassword(""); setIsRegistering(false);
    } catch (err) {
      Swal.fire("Erro", err.message || "Erro ao cadastrar usuário.", "error");
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmNewPassword) {
      Swal.fire("Erro", "As senhas não coincidem.", "error");
      return;
    }
    try {
      await updatePassword(currentPassword, newPassword);
      await Swal.fire("Sucesso", "Senha alterada com sucesso!", "success");
      setIsUpdatingPassword(false);
      setCurrentPassword(""); setNewPassword(""); setConfirmNewPassword("");
    } catch (err) {
      Swal.fire("Erro", err.message || "Erro ao atualizar senha.", "error");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <img src={Logo} alt="Hot Wheels Logo" style={{ width: '210px' }} />
        </div>
        <h2>{isRegistering ? "Criar Conta" : isUpdatingPassword ? "Atualizar Senha" : "Login"}</h2>
        {isRegistering && (
          <input type="text" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
        )}
        {!isUpdatingPassword && (
          <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        )}
        {!isUpdatingPassword && (
          <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} />
        )}
        {isRegistering && (
          <input type="password" placeholder="Confirmar Senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        )}
        {isUpdatingPassword && (
          <>
            <input type="password" placeholder="Senha Atual" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            <input type="password" placeholder="Nova Senha" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <input type="password" placeholder="Confirmar Nova Senha" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
          </>
        )}
        {isRegistering ? (
          <button onClick={handleRegister}>Registrar</button>
        ) : isUpdatingPassword ? (
          <button onClick={handleChangePassword}>Atualizar Senha</button>
        ) : (
          <button onClick={handleLogin}>Login</button>
        )}
        <p className="toggle-text" onClick={() => { setIsRegistering(false); setIsUpdatingPassword(!isUpdatingPassword); }}>
          {isUpdatingPassword ? "Voltar para Login" : "Esqueceu a senha?"}
        </p>
        {!isUpdatingPassword && (
          <p className="toggle-text" onClick={() => setIsRegistering(!isRegistering)}>
            {isRegistering ? "Já tem uma conta? Faça login." : "Não tem conta? Cadastre-se."}
          </p>
        )}
      </div>
    </div>
  );
};
export default LoginPage;
