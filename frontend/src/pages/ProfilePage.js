import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import "../css/ProfilePage.css";
import { DEFAULT_PROFILE_IMAGE, API_BASE_URL } from "../utils/constants";

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

const ProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // senha (sua funcionalidade)
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // mostrar/ocultar senha (visual)
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // avatar (sua funcionalidade)
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_USER_IMG);

  // conta (visual) - não muda backend
  const [displayName, setDisplayName] = useState("");

  // preferências (visual apenas)
  const [prefEmail, setPrefEmail] = useState(true);
  const [prefPublic, setPrefPublic] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        let token = localStorage.getItem("token");
        if (token && !token.startsWith("Bearer ")) token = `Bearer ${token}`;

        const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
          headers: { Authorization: token },
        });

        setUser(response.data);
        setDisplayName(response.data?.name || "");
        setSelectedAvatar(response.data?.profilePicture || DEFAULT_USER_IMG);
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
      }
    };
    fetchProfile();
    // também buscar coleção e wishlist para mostrar estatísticas reais
    const fetchStats = async () => {
      try {
        const tokenRaw = localStorage.getItem("token");
        const auth = tokenRaw && tokenRaw.startsWith("Bearer ") ? tokenRaw : tokenRaw ? `Bearer ${tokenRaw}` : null;

        // profile para obter userId caso não esteja no local state ainda
        const profRes = await axios.get(`${API_BASE_URL}/auth/profile`, { headers: auth ? { Authorization: auth } : {} });
        const me = profRes.data;
        if (!me || !me._id) return;

        // coleção
        let collectionCount = 0;
        try {
          const colRes = await axios.get(`${API_BASE_URL}/collection/${me._id}`, { headers: auth ? { Authorization: auth } : {} });
          collectionCount = Array.isArray(colRes.data?.collection) ? colRes.data.collection.length : 0;
        } catch (e) {
          // pode retornar 404 ou erro -> assume 0
          collectionCount = 0;
        }

        // wishlist
        let wishlistCount = 0;
        try {
          const wishRes = await axios.get(`${API_BASE_URL}/wishlist`, { headers: auth ? { Authorization: auth } : {} });
          wishlistCount = Array.isArray(wishRes.data?.favorites) ? wishRes.data.favorites.length : 0;
        } catch (e) {
          wishlistCount = 0;
        }

        // meses ativo: usar timestamp embutido no ObjectId
        const objectId = me._id;
        let monthsActive = 0;
        try {
          const ts = parseInt(objectId.substring(0, 8), 16) * 1000; // ms
          const created = new Date(ts);
          const now = new Date();
          monthsActive = Math.max(0, (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth()));
        } catch (e) {
          monthsActive = 0;
        }

        // atualizar estado local do user com estatísticas temporárias
        setUser((prev) => ({ ...(prev || {}), collectionCount, wishlistCount, monthsActive }));
      } catch (err) {
        // ignorar falhas de stats
        console.warn('Não foi possível carregar estatísticas do usuário', err);
      }
    };

    fetchStats();
  }, []);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      Swal.fire("Erro!", "As senhas não coincidem.", "error");
      return;
    }

    try {
      let token = localStorage.getItem("token");
      if (token && !token.startsWith("Bearer ")) token = `Bearer ${token}`;

      await axios.put(
        `${API_BASE_URL}/auth/update-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: token } }
      );

      Swal.fire("Sucesso!", "Senha alterada com sucesso!", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      Swal.fire(
        "Erro!",
        err.response?.data?.message || "Erro ao alterar senha.",
        "error"
      );
    }
  };

  const handleSaveAvatar = async () => {
    try {
      let token = localStorage.getItem("token");
      if (token && !token.startsWith("Bearer ")) token = `Bearer ${token}`;

      await axios.put(
        `${API_BASE_URL}/users/${user._id}/avatar`,
        { profilePicture: selectedAvatar },
        { headers: { Authorization: token } }
      );

      Swal.fire("Sucesso!", "Avatar atualizado!", "success");
    } catch (err) {
      Swal.fire(
        "Erro!",
        err.response?.data?.message || "Falha ao atualizar avatar.",
        "error"
      );
    }
  };

  // botão "Salvar Alterações" da conta -> NÃO muda backend (só visual)
  const handleSaveAccountInfo = (e) => {
    e.preventDefault();
    Swal.fire("Ok!", "Visual pronto. Se quiser salvar no backend, eu te ajudo a criar o endpoint.", "info");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  if (!user) return <p className="profile-loading">Carregando...</p>;

  const initials =
    (user?.name || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "U";

  return (
    <div className="profile-page">
      {/* Header */}
      <header className="hw-header">
        <div className="hw-logo">
          <div className="hw-logo-text">
            Hot Wheels <span className="hw-logo-accent">Collector</span>
          </div>
        </div>

        <div className="hw-header-actions">
          <button className="hw-btn hw-btn-ghost" onClick={() => navigate("/home")}>
            Home
          </button>
          <button className="hw-btn hw-btn-danger" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      <main className="hw-container">
        {/* Profile Header */}
        <section className="hw-profile-header">
          <div className="hw-avatar-wrap">
            <img
              src={selectedAvatar || DEFAULT_USER_IMG}
              alt={user.name}
              className="hw-avatar-img"
              onError={(e) => (e.currentTarget.src = DEFAULT_USER_IMG)}
            />
            <div className="hw-avatar-fallback" aria-hidden="true">
              {initials}
            </div>
          </div>

          <div className="hw-profile-info">
            <h1 className="hw-profile-name">{user.name}</h1>
            <p className="hw-profile-email">{user.email}</p>

            {/* Stats (placeholder visual — não quebra nada) */}
            <div className="hw-stats">
              <div className="hw-stat">
                <div className="hw-stat-value">{user.collectionCount ?? (user.collection ? user.collection.length : 0)}</div>
                <div className="hw-stat-label">Coleção</div>
              </div>
              <div className="hw-stat">
                <div className="hw-stat-value">{user.wishlistCount ?? (user.favorites ? user.favorites.length : 0)}</div>
                <div className="hw-stat-label">Desejos</div>
              </div>
              <div className="hw-stat">
                <div className="hw-stat-value">{user.monthsActive ?? 0}</div>
                <div className="hw-stat-label">Meses Ativo</div>
              </div>
            </div>
          </div>
        </section>

        {/* Grid com 4 cards (igual ao layout HTML) */}
        <section className="hw-grid-full">
          {/* Avatar */}
          <div className="hw-card">
            <h2 className="hw-card-title">
              <span className="hw-card-icon" aria-hidden="true">🎨</span>
              Avatar
            </h2>

            <div className="hw-avatar-grid">
              {[DEFAULT_USER_IMG, ...PRESET_AVATARS].map((src) => (
                <button
                  key={src}
                  type="button"
                  className={`hw-avatar-option ${selectedAvatar === src ? "selected" : ""}`}
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
              <span className="hw-card-icon" aria-hidden="true">🔐</span>
              Alterar Senha
            </h2>

            <div className="hw-form">
              <div className="hw-form-group">
                <label className="hw-label">Senha Atual</label>
                <div className="hw-password-wrap">
                  <input
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
                  >
                    {showCurrent ? "👁️‍🗨️" : "👁️"}
                  </button>
                </div>
              </div>

              <div className="hw-form-group">
                <label className="hw-label">Nova Senha</label>
                <div className="hw-password-wrap">
                  <input
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
                  >
                    {showNew ? "👁️‍🗨️" : "👁️"}
                  </button>
                </div>
              </div>

              <div className="hw-form-group">
                <label className="hw-label">Confirmar Nova Senha</label>
                <div className="hw-password-wrap">
                  <input
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
                  >
                    {showConfirm ? "👁️‍🗨️" : "👁️"}
                  </button>
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
              <span className="hw-card-icon" aria-hidden="true">👤</span>
              Informações da Conta
            </h2>

            <form className="hw-form" onSubmit={handleSaveAccountInfo}>
              <div className="hw-form-group">
                <label className="hw-label">Nome de Usuário</label>
                <input
                  className="hw-input"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Seu nome de usuário"
                />
              </div>

              <div className="hw-form-group">
                <label className="hw-label">E-mail</label>
                <input className="hw-input" type="email" value={user.email} disabled />
              </div>

              <button type="submit" className="hw-btn hw-btn-primary">
                Salvar Alterações
              </button>
            </form>
          </div>

          {/* Preferências */}
          <div className="hw-card">
            <h2 className="hw-card-title">
              <span className="hw-card-icon" aria-hidden="true">⚙️</span>
              Preferências
            </h2>

            <div className="hw-settings-section">
              <div className="hw-setting-item">
                <div className="hw-setting-info">
                  <div className="hw-setting-name">Notificações por E-mail</div>
                  <div className="hw-setting-desc">Receba atualizações sobre sua coleção</div>
                </div>

                <label className="hw-toggle">
                  <input
                    type="checkbox"
                    checked={prefEmail}
                    onChange={(e) => setPrefEmail(e.target.checked)}
                  />
                  <span className="hw-slider" />
                </label>
              </div>

              <div className="hw-setting-item">
                <div className="hw-setting-info">
                  <div className="hw-setting-name">Perfil Público</div>
                  <div className="hw-setting-desc">Permita que outros vejam sua coleção</div>
                </div>

                <label className="hw-toggle">
                  <input
                    type="checkbox"
                    checked={prefPublic}
                    onChange={(e) => setPrefPublic(e.target.checked)}
                  />
                  <span className="hw-slider" />
                </label>
              </div>

              <div className="hw-setting-item">
                <div className="hw-setting-info">
                  <div className="hw-setting-name">Modo Escuro</div>
                  <div className="hw-setting-desc">Sempre ativado (tema padrão)</div>
                </div>

                <label className="hw-toggle">
                  <input type="checkbox" checked disabled />
                  <span className="hw-slider" />
                </label>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ProfilePage;
