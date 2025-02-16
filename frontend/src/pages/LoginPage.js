import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2"; // Importação do SweetAlert2
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

      // Alerta pequeno no canto superior direito para login bem-sucedido
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
      Swal.fire("Erro!", "Erro ao fazer login. Verifique suas credenciais.", "error");
    }
  };

  const handleRegister = async () => {
    try {
      await axios.post("http://localhost:5000/api/auth/register", { email, password });

      // Alerta pequeno no canto superior direito para cadastro bem-sucedido
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
      Swal.fire("Erro!", "Erro ao cadastrar usuário.", "error");
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
