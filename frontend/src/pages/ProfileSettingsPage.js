import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

import { toastSuccess, toastError, toastInfo } from "../utils/alerts";
import { logout } from "../utils/auth";
import "../css/ProfilePage.css";
import { DEFAULT_PROFILE_IMAGE } from "../utils/constants";
import { api } from "../utils/api";

const DEFAULT_USER_IMG = DEFAULT_PROFILE_IMAGE;

const PRESET_AVATARS = [
  "/avatars/avatar1.svg",
  "/avatars/avatar2.svg",
  "/avatars/avatar3.svg",
  "/avatars/avatar4.svg",
  "/avatars/avatar5.svg",
  "/avatars/avatar6.svg",
  "/avatars/avatar7.svg",
  "/avatars/avatar8.svg",
];

const ProfileSettingsPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // senha
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // mostrar/ocultar senha (visual)
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // avatar
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_USER_IMG);

  // conta (visual)
  const [displayName, setDisplayName] = useState("");
  const [isRequestingDeleteCode, setIsRequestingDeleteCode] = useState(false);
  const [deleteCodeSent, setDeleteCodeSent] = useState(false);
  const [deleteCode, setDeleteCode] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        let token = localStorage.getItem("token");
        if (token && !token.startsWith("Bearer ")) token = `Bearer ${token}`;

        const response = await api.get(`/api/auth/profile`, {
          headers: token ? { Authorization: token } : {},
        });

        const profile = response.data;
        setUser(profile);
        setDisplayName(profile?.name || "");
        setSelectedAvatar(profile?.profilePicture || DEFAULT_USER_IMG);
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = () => {
    logout();
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toastError("Erro!", "As senhas não coincidem.");
      return;
    }

    try {
      let token = localStorage.getItem("token");
      if (token && !token.startsWith("Bearer ")) token = `Bearer ${token}`;

      await api.put(
        `/api/auth/update-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: token } }
      );

      toastSuccess("Sucesso!", "Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toastError("Erro!", err.response?.data?.message || "Erro ao alterar senha.");
    }
  };

  const handleSaveAvatar = async () => {
    try {
      if (!user?._id) return;

      let token = localStorage.getItem("token");
      if (token && !token.startsWith("Bearer ")) token = `Bearer ${token}`;

      await api.put(
        `/api/users/${user._id}/avatar`,
        { profilePicture: selectedAvatar },
        { headers: { Authorization: token } }
      );

      toastSuccess("Sucesso!", "Avatar atualizado!");
    } catch (err) {
      toastError("Erro!", err.response?.data?.message || "Falha ao atualizar avatar.");
    }
  };

  // salvar conta (visual apenas)
  const handleSaveAccountInfo = (e) => {
    e.preventDefault();
    toastInfo(
      "Ok!",
      "Visual pronto. Se quiser salvar no backend, eu te ajudo a criar o endpoint."
    );
  };

  const requestDeleteCode = async () => {
    try {
      if (!user?.email) return;
      setIsRequestingDeleteCode(true);
      await api.post(`/api/auth/request-delete-code`, { email: user.email });
      setDeleteCodeSent(true);
      toastSuccess(
        "Código enviado",
        "Um código foi enviado para o seu email para confirmar a exclusão."
      );
    } catch (err) {
      toastError("Erro", err.response?.data?.message || "Erro ao solicitar código.");
    } finally {
      setIsRequestingDeleteCode(false);
    }
  };

  const confirmDeleteAccount = async () => {
    if (!deleteCode) return toastError("Erro", "Informe o código enviado por email.");

    const res = await Swal.fire({
      title: "Excluir conta?",
      text: "Essa ação não pode ser desfeita.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Excluir",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
    });

    if (!res.isConfirmed) return;

    try {
      setIsDeletingAccount(true);
      let token = localStorage.getItem("token");
      if (token && !token.startsWith("Bearer ")) token = `Bearer ${token}`;

      await api.post(
        `/api/auth/confirm-delete`,
        { code: deleteCode },
        { headers: { Authorization: token } }
      );

      toastSuccess("Conta excluída", "Sua conta foi removida com sucesso.");
      logout();
    } catch (err) {
      toastError(
        "Erro",
        err.response?.data?.message || "Erro ao confirmar exclusão."
      );
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (!user) return <p className="profile-loading">Carregando...</p>;

  return (
    <div className="profile-page">
      <header className="hw-header">
        <div className="hw-logo">
          <div className="hw-logo-text">
            Diecast <span className="hw-logo-accent">Social</span>
          </div>
        </div>

        <div className="hw-header-actions">
          <button
            className="hw-btn hw-btn-ghost"
            onClick={() => navigate("/profile")}
          >
            Voltar
          </button>

          <button className="hw-btn hw-btn-ghost" onClick={() => navigate("/home")}>
            Home
          </button>

          <button className="hw-btn hw-btn-danger" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      <main className="hw-container">
        <section className="hw-settings">
          <div className="hw-section-title-row">
            <h2 className="hw-section-title">Configurações</h2>
          </div>

          <div className="hw-grid-3">
            {/* Avatar */}
            <div className="hw-card">
              <h2 className="hw-card-title">
                <span className="hw-card-icon" aria-hidden="true">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M12 3C7 3 3 6.58 3 11c0 2 .99 3.5 2.61 4.5C6.34 17.2 5 18.8 5 20.5 5 21.88 6.12 23 7.5 23 12.75 23 20 20 20 11 20 6.58 16 3 12 3zm-1 5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
                  </svg>
                </span>
                {" "}
                Avatar
              </h2>

              <div className="hw-avatar-grid">
                {[DEFAULT_USER_IMG, ...PRESET_AVATARS].map((src) => (
                  <button
                    key={src}
                    type="button"
                    className={`hw-avatar-option ${
                      selectedAvatar === src ? "selected" : ""
                    }`}
                    onClick={() => setSelectedAvatar(src)}
                  >
                    <img src={src} alt="avatar" />
                  </button>
                ))}
              </div>

              <button className="hw-btn hw-btn-primary" onClick={handleSaveAvatar}>
                Salvar Avatar
              </button>
            </div>

            {/* Alterar Senha */}
            <div className="hw-card">
              <h2 className="hw-card-title">
                <span className="hw-card-icon" aria-hidden="true">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M6 10V8a6 6 0 1 1 12 0v2h1a1 0 0 1 1 1v8a1 0 0 1-1 1H5a1 0 0 1-1-1v-8a1 0 0 1 1-1h1zm2 0h8V8a4 4 0 0 0-8 0v2z" />
                  </svg>
                </span>
                {" "}
                Alterar Senha
              </h2>

              <div className="hw-form">
                <div className="hw-form-group">
                  <label className="hw-label" htmlFor="currentPassword">
                    Senha Atual
                  </label>
                  <div className="hw-password-wrap">
                    <input
                      id="currentPassword"
                      className="hw-input"
                      type={showCurrent ? "text" : "password"}
                      placeholder="Digite sua senha atual"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="hw-eye"
                      onClick={() => setShowCurrent((v) => !v)}
                      aria-label="Mostrar/ocultar senha atual"
                      dangerouslySetInnerHTML={{
                        __html: showCurrent
                          ? `
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M12 5c-7 0-11 7-11 7s4 7 11 7 11-7 11-7-4-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
                        <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
                      </svg>`
                          : `
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>`,
                      }}
                    />
                  </div>
                </div>

                <div className="hw-form-group">
                  <label className="hw-label" htmlFor="newPassword">
                    Nova Senha
                  </label>
                  <div className="hw-password-wrap">
                    <input
                      id="newPassword"
                      className="hw-input"
                      type={showNew ? "text" : "password"}
                      placeholder="Digite sua nova senha"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="hw-eye"
                      onClick={() => setShowNew((v) => !v)}
                      aria-label="Mostrar/ocultar nova senha"
                      dangerouslySetInnerHTML={{
                        __html: showNew
                          ? `
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M12 5c-7 0-11 7-11 7s4 7 11 7 11-7 11-7-4-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
                        <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
                      </svg>`
                          : `
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>`,
                      }}
                    />
                  </div>
                </div>

                <div className="hw-form-group">
                  <label className="hw-label" htmlFor="confirmPassword">
                    Confirmar Nova Senha
                  </label>
                  <div className="hw-password-wrap">
                    <input
                      id="confirmPassword"
                      className="hw-input"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Confirme sua nova senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="hw-eye"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label="Mostrar/ocultar confirmação"
                      dangerouslySetInnerHTML={{
                        __html: showConfirm
                          ? `
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M12 5c-7 0-11 7-11 7s4 7 11 7 11-7 11-7-4-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
                        <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
                      </svg>`
                          : `
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>`,
                      }}
                    />
                  </div>
                </div>

                <button className="hw-btn hw-btn-primary" onClick={handleChangePassword}>
                  Alterar Senha
                </button>
              </div>
            </div>

            {/* Informações da Conta */}
            <div className="hw-card">
              <h2 className="hw-card-title">
                <span className="hw-card-icon" aria-hidden="true">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-4.418 0-8 1.79-8 4v2h16v-2c0-2.21-3.582-4-8-4z" />
                  </svg>
                </span>
                {" "}
                Informações da Conta
              </h2>

              <form className="hw-form" onSubmit={handleSaveAccountInfo}>
                <div className="hw-form-group">
                  <label className="hw-label" htmlFor="displayName">
                    Nome de Usuário
                  </label>
                  <input
                    id="displayName"
                    className="hw-input"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Seu nome de usuário"
                  />
                </div>

                <div className="hw-form-group">
                  <label className="hw-label" htmlFor="email">
                    E-mail
                  </label>
                  <input
                    id="email"
                    className="hw-input"
                    type="email"
                    value={user.email}
                    disabled
                  />
                </div>

                <button type="submit" className="hw-btn hw-btn-primary">
                  Salvar Alterações
                </button>
              </form>
            </div>

            {/* Delete Account Card */}
            <div className="hw-card">
              <h2 className="hw-card-title">
                <span className="hw-card-icon" aria-hidden="true">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                  </svg>
                </span>
                {" "}
                Excluir Conta
              </h2>

              <div className="hw-card-body">
                {deleteCodeSent ? (
                  <>
                    <p>
                      Um código foi enviado para seu email. Insira abaixo para
                      confirmar a exclusão da conta.
                    </p>
                    <input
                      className="hw-input"
                      placeholder="Código recebido"
                      value={deleteCode}
                      onChange={(e) => setDeleteCode(e.target.value)}
                    />
                    <div style={{ marginTop: 10 }}>
                      <button
                        className="hw-btn hw-btn-danger"
                        onClick={confirmDeleteAccount}
                        disabled={isDeletingAccount}
                      >
                        {isDeletingAccount ? "Excluindo..." : "Confirmar Exclusão"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p>
                      Se desejar excluir sua conta, envie um código para seu email
                      para confirmar.
                    </p>
                    <div style={{ marginTop: 10 }}>
                      <button
                        className="hw-btn hw-btn-danger"
                        onClick={requestDeleteCode}
                        disabled={isRequestingDeleteCode}
                      >
                        {isRequestingDeleteCode
                          ? "Enviando..."
                          : "Enviar Código de Exclusão"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ProfileSettingsPage;
