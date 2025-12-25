import React, { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../utils/constants";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import { toastSuccess, toastError } from '../utils/alerts';
import "../css/LoginPage.css";
import Logo from "../css/logo2.png";

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

  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // if route is /register, open register mode
  React.useEffect(() => {
    if (location?.pathname === '/register') {
      setIsRegistering(true);
      setRegisterCodeSent(false);
      setIsResetting(false);
    }
  }, [location?.pathname]);

  const handleLogin = async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userId", res.data.userId);

      toastSuccess('Login realizado!', 'Bem-vindo de volta!', { position: 'bottom-start', timer: 2000 });

      navigate("/home");
    } catch (err) {
      toastError('Erro!', err.response?.data?.message || 'Erro ao fazer login.');
    }
  };

  const handleRequestSignupCode = async () => {
    if (!email || !password || !confirmPassword) {
      return toastError('Erro!', 'Preencha email e senhas.');
    }
    if (password !== confirmPassword) {
      return toastError('Erro!', 'As senhas não coincidem.');
    }
    try {
      await axios.post(`${API_BASE_URL}/auth/register`, {
        name,
        email,
        password,
        confirmPassword,
      });
      setRegisterCodeSent(true);
      toastSuccess('Verificação', 'Código enviado ao seu email.');
    } catch (err) {
      toastError('Erro!', err.response?.data?.message || 'Erro ao enviar código.');
    }
  };

  const handleConfirmSignup = async () => {
    if (!signupCode) return toastError('Erro!', 'Informe o código recebido.');
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/confirm-signup`, {
        name,
        email,
        password,
        code: signupCode,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userId", res.data.userId);

      toastSuccess('Sucesso!', 'Conta criada.');
      setIsRegistering(false);
      setRegisterCodeSent(false);
      navigate("/home");
    } catch (err) {
      toastError('Erro!', err.response?.data?.message || 'Erro ao confirmar cadastro.');
    }
  };

  const handleRequestResetCode = async () => {
    if (!email) return toastError('Erro!', 'Informe o email da conta.');
    try {
      await axios.post(`${API_BASE_URL}/auth/request-reset-code`, { email });
      setResetCodeSent(true);
      toastSuccess('Verificação', 'Código enviado ao seu email.');
    } catch (err) {
      toastError('Erro!', err.response?.data?.message || 'Erro ao enviar código.');
    }
  };

  const handleConfirmReset = async () => {
    if (!resetCode) return toastError('Erro!', 'Informe o código recebido.');
    if (newPassword !== confirmNewPassword) {
      return toastError('Erro!', 'As senhas não coincidem.');
    }
    try {
      await axios.post(`${API_BASE_URL}/auth/confirm-reset`, {
        email,
        code: resetCode,
        newPassword,
        confirmPassword: confirmNewPassword,
      });

      toastSuccess('Sucesso!', 'Senha alterada.');
      setIsResetting(false);
      setResetCodeSent(false);
    } catch (err) {
      toastError('Erro!', err.response?.data?.message || 'Erro ao confirmar reset.');
    }
  };

  const title = isRegistering
    ? registerCodeSent
      ? "Confirmar Cadastro"
      : "Criar Conta"
    : isResetting
      ? resetCodeSent
        ? "Confirmar Redefinição"
        : "Redefinir Senha"
      : "Login";

  const subtitle = isRegistering
    ? "Crie sua conta para começar!"
    : isResetting
      ? "Recupere o acesso à sua conta"
      : "Bem-vindo de volta!";

  const onPrimaryAction = () => {
    if (isRegistering) {
      if (registerCodeSent) return handleConfirmSignup();
      return handleRequestSignupCode();
    }
    if (isResetting) {
      if (resetCodeSent) return handleConfirmReset();
      return handleRequestResetCode();
    }
    return handleLogin();
  };

  const primaryText = isRegistering
    ? registerCodeSent
      ? "Confirmar Cadastro"
      : "Enviar Código"
    : isResetting
      ? resetCodeSent
        ? "Confirmar Redefinição"
        : "Enviar Código"
      : "Entrar";

  return (
    <div className="login-root">
      <div className="login-background" aria-hidden="true" />

      <div className="login-container">
        <div className="logo-section">
          <div className="logo-icon">
            <img src={Logo} alt="Logo" className="logo-image" />
          </div>

          <h1 className="logo-title">
            Diecast <span className="logo-accent">Social</span>
          </h1>
          <p className="logo-subtitle">{subtitle}</p>
        </div>

        <div className="login-form">
          {/* Cadastro: Nome */}
          {isRegistering && !registerCodeSent && (
            <div className="form-group">
              <label className="form-label">Nome</label>
              <input
                type="text"
                className="form-input"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          {/* Email (não aparece no passo 2 do reset, como você já fazia) */}
          {!isResetting && (
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input
                type="email"
                className="form-input"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}

          {/* Senha (Login e passo 1 do cadastro) */}
          {!isResetting && !registerCodeSent && (
            <div className="form-group">
              <label className="form-label">Senha</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label="Mostrar/ocultar senha"
                >
                  {showPassword ? "👁️‍🗨️" : "👁️"}
                </button>
              </div>
            </div>
          )}

          {/* Cadastro: confirmar senha (passo 1) OU código (passo 2) */}
          {isRegistering && (
            <div className="form-group">
              {registerCodeSent ? (
                <>
                  <label className="form-label">Código</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Código recebido"
                    value={signupCode}
                    onChange={(e) => setSignupCode(e.target.value)}
                  />
                </>
              ) : (
                <>
                  <label className="form-label">Confirmar senha</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </>
              )}
            </div>
          )}

          {/* Reset: passo 1 (texto) / passo 2 (código e novas senhas) */}
          {isResetting && (
            <div className="form-group">
              {resetCodeSent ? (
                <>
                  <label className="form-label">Código</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Código recebido"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                  />

                  <label className="form-label">Nova senha</label>
                  <div className="password-wrapper">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      className="form-input"
                      placeholder="••••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowNewPassword((v) => !v)}
                      aria-label="Mostrar/ocultar nova senha"
                    >
                      {showNewPassword ? "👁️‍🗨️" : "👁️"}
                    </button>
                  </div>

                  <label className="form-label">Confirmar nova senha</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="••••••••••"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                  />
                </>
              ) : (
                <p className="info-text">Informe seu email no campo acima para receber o código.</p>
              )}
            </div>
          )}

          {/* Linha lembrar/esqueci senha (só no login normal) */}
          {!isRegistering && !isResetting && (
            <div className="remember-forgot">
              <div className="remember-me">
                <input type="checkbox" id="remember" />
                <label htmlFor="remember">Lembrar de mim</label>
              </div>

              <span
                className="forgot-password"
                onClick={() => {
                  setIsRegistering(false);
                  setRegisterCodeSent(false);
                  setIsResetting(true);
                  setResetCodeSent(false);
                }}
              >
                Esqueceu a senha?
              </span>
            </div>
          )}

          <button type="button" className="login-btn" onClick={onPrimaryAction}>
            {primaryText}
          </button>

          {/* Links inferiores */}
          {isResetting ? (
            <p
              className="toggle-text"
              onClick={() => {
                setIsResetting(false);
                setResetCodeSent(false);
              }}
            >
              <strong>Voltar para Login</strong>
            </p>
          ) : (
            <p
              className="toggle-text"
              onClick={() => {
                setIsRegistering((v) => !v);
                setRegisterCodeSent(false);
                setIsResetting(false);
                setResetCodeSent(false);
              }}
            >
              {isRegistering ? (
                <>
                  Já tem uma conta? <strong>Faça login</strong>
                </>
              ) : (
                <>
                  Não tem conta? <strong>Cadastre-se</strong>
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;