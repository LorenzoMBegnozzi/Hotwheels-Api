import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import "../css/LoginPage.css";

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

  const handleLogin = async () => {
    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", { email, password });
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

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      return Swal.fire("Erro!", "As senhas não coincidem.", "error");
    }

    try {
      await axios.post("http://localhost:5000/api/auth/register", {
        name,
        email,
        password,
        confirmPassword,
      });

      Swal.fire({
        title: "Usuário cadastrado!",
        text: "Agora você pode fazer login.",
        icon: "success",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });

      setIsRegistering(false);
    } catch (err) {
      Swal.fire("Erro!", err.response?.data?.message || "Erro ao cadastrar usuário.", "error");
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmNewPassword) {
      return Swal.fire("Erro!", "As senhas não coincidem.", "error");
    }

    try {
      const token = localStorage.getItem("token");
      await axios.put(
        "http://localhost:5000/api/auth/update-password",
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Swal.fire("Sucesso!", "Senha alterada com sucesso!", "success");
      setIsUpdatingPassword(false);
    } catch (err) {
      Swal.fire("Erro!", err.response?.data?.message || "Erro ao atualizar senha.", "error");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
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
          <input
            type="password"
            placeholder="Confirmar Senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        )}
        {isUpdatingPassword && (
          <>
            <input
              type="password"
              placeholder="Senha Atual"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="Nova Senha"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="Confirmar Nova Senha"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
            />
          </>
        )}
        {isRegistering ? (
          <button onClick={handleRegister}>Registrar</button>
        ) : isUpdatingPassword ? (
          <button onClick={handleChangePassword}>Atualizar Senha</button>
        ) : (
          <button onClick={handleLogin}>Entrar</button>
        )}
        <p className="toggle-text" onClick={() => {
          setIsRegistering(false);
          setIsUpdatingPassword(!isUpdatingPassword);
        }}>
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
