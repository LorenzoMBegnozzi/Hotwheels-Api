import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { toastSuccess, toastError, toastInfo } from '../utils/alerts';
import { getUserById, acceptFriendRequest, declineFriendRequest } from '../utils/api';
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

  // conta (visual) - sem mudar backend
  const [displayName, setDisplayName] = useState("");
  const [friendRequestsDetails, setFriendRequestsDetails] = useState([]);
  const [showFriends, setShowFriends] = useState(false);
  const [friendsDetails, setFriendsDetails] = useState([]);

  useEffect(() => {
    const fetchProfileAndStats = async () => {
      try {
        let token = localStorage.getItem("token");
        if (token && !token.startsWith("Bearer ")) token = `Bearer ${token}`;

        const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
          headers: token ? { Authorization: token } : {},
        });

        const profile = response.data;
        setUser(profile);
        setDisplayName(profile?.name || "");
        setSelectedAvatar(profile?.profilePicture || DEFAULT_USER_IMG);

        // buscar contagens: coleção e wishlist (endpoints exigem auth)
        let collectionCount = 0;
        try {
          const colRes = await axios.get(`${API_BASE_URL}/collection/${profile._id}`, {
            headers: token ? { Authorization: token } : {},
          });
          collectionCount = Array.isArray(colRes.data?.collection) ? colRes.data.collection.length : 0;
        } catch (e) {
          collectionCount = 0;
        }

        let wishlistCount = 0;
        try {
          const wishRes = await axios.get(`${API_BASE_URL}/wishlist`, {
            headers: token ? { Authorization: token } : {},
          });
          wishlistCount = Array.isArray(wishRes.data?.favorites) ? wishRes.data.favorites.length : 0;
        } catch (e) {
          wishlistCount = 0;
        }

        // calcular monthsActive a partir do ObjectId timestamp (primeiros 8 chars)
        let monthsActive = 0;
        try {
          const ts = parseInt(String(profile._id).substring(0, 8), 16) * 1000;
          const created = new Date(ts);
          const now = new Date();
          monthsActive = Math.max(0, (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth()));
        } catch (e) {
          monthsActive = 0;
        }

        // atualizar user com estatísticas
        setUser((prev) => ({ ...(prev || {}), collectionCount, wishlistCount, monthsActive }));

        // se houver friendRequests, buscar detalhes dos usuários que enviaram
        try {
          const reqs = Array.isArray(profile.friendRequests) ? profile.friendRequests : [];
          if (reqs.length > 0) {
            const details = await Promise.all(
              reqs.map(async (id) => {
                try {
                  return await getUserById(id);
                } catch (e) {
                  return null;
                }
              })
            );
            const filtered = details.filter(Boolean);
            setFriendRequestsDetails(filtered);
          }
        } catch (e) {
          // ignore
        }
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
      }
    };

    fetchProfileAndStats();
  }, []);

  // quando o user for carregado ou friends mudarem, buscar detalhes dos amigos
  useEffect(() => {
    const fetchFriendsDetails = async () => {
      try {
        const ids = Array.isArray(user?.friends) ? user.friends : [];
        if (ids.length === 0) {
          setFriendsDetails([]);
          return;
        }

        const details = await Promise.all(
          ids.map(async (id) => {
            try {
              return await getUserById(id);
            } catch (e) {
              return null;
            }
          })
        );
        setFriendsDetails(details.filter(Boolean));
      } catch (e) {
        console.error('Erro ao buscar detalhes dos amigos', e);
      }
    };

    fetchFriendsDetails();
  }, [user?.friends]);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toastError('Erro!', 'As senhas não coincidem.');
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

      toastSuccess('Sucesso!', 'Senha alterada com sucesso!');
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toastError('Erro!', err.response?.data?.message || 'Erro ao alterar senha.');
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

      toastSuccess('Sucesso!', 'Avatar atualizado!');
    } catch (err) {
      toastError('Erro!', err.response?.data?.message || 'Falha ao atualizar avatar.');
    }
  };

  // salvar conta (visual apenas)
  const handleSaveAccountInfo = (e) => {
    e.preventDefault();
    toastInfo('Ok!', 'Visual pronto. Se quiser salvar no backend, eu te ajudo a criar o endpoint.');
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleAccept = async (fromUserId) => {
    try {
      await acceptFriendRequest(fromUserId);
      toastSuccess('Sucesso!', 'Solicitação aceita.');

      // remover da lista local
      setFriendRequestsDetails((prev) => prev.filter((u) => String(u._id) !== String(fromUserId)));
      setUser((prev) => ({ ...(prev || {}), friendRequests: (prev?.friendRequests || []).filter((id) => String(id) !== String(fromUserId)), friends: [...(prev?.friends || []), fromUserId] }));
    } catch (err) {
      toastError('Erro!', err.message || 'Falha ao aceitar solicitação.');
    }
  };

  const handleDecline = async (fromUserId) => {
    try {
      await declineFriendRequest(fromUserId);
      toastInfo('Recusado', 'Solicitação recusada.');

      // remover da lista local
      setFriendRequestsDetails((prev) => prev.filter((u) => String(u._id) !== String(fromUserId)));
      setUser((prev) => ({ ...(prev || {}), friendRequests: (prev?.friendRequests || []).filter((id) => String(id) !== String(fromUserId)) }));
    } catch (err) {
      toastError('Erro!', err.message || 'Falha ao recusar solicitação.');
    }
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
            Diecast <span className="hw-logo-accent">Social</span>
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

            <div style={{ marginTop: 12 }}>
              <button className="hw-btn hw-btn-ghost" onClick={() => setShowFriends((v) => !v)}>
                {showFriends ? 'Fechar Amigos' : `Amigos (${(user.friends || []).length})`}
              </button>
            </div>
          </div>
        </section>

        {/* Friends List (toggle) */}
        {showFriends && (
          <section className="hw-card hw-friends-list">
            <h2 className="hw-card-title">
              <span className="hw-card-icon" aria-hidden="true">🤝</span>
              Meus Amigos
            </h2>
            <div className="hw-requests-list">
              {friendsDetails.length === 0 ? (
                <div className="hw-request-item">Você ainda não tem amigos adicionados.</div>
              ) : (
                friendsDetails.map((f) => (
                  <div key={f._id} className="hw-request-item hw-friend-item" onClick={() => navigate(`/user/${f._id}`)} style={{ cursor: 'pointer' }}>
                    <div className="hw-request-user">
                      <img src={f.profilePicture || DEFAULT_USER_IMG} alt={f.name} onError={(e) => (e.currentTarget.src = DEFAULT_USER_IMG)} />
                      <div className="hw-request-meta">
                        <div className="hw-request-name">{f.name}</div>
                        <div className="hw-request-email">{f.email}</div>
                      </div>
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: 12 }}>Ver perfil</div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* Incoming Friend Requests */}
        {friendRequestsDetails && friendRequestsDetails.length > 0 && (
          <section className="hw-card hw-incoming-requests">
            <h2 className="hw-card-title">
              <span className="hw-card-icon" aria-hidden="true">📬</span>
              Solicitações Recebidas
            </h2>
            <div className="hw-requests-list">
              {friendRequestsDetails.map((req) => (
                <div key={req._id} className="hw-request-item">
                  <div className="hw-request-user">
                    <img src={req.profilePicture || DEFAULT_USER_IMG} alt={req.name} onError={(e) => (e.currentTarget.src = DEFAULT_USER_IMG)} />
                    <div className="hw-request-meta">
                      <div className="hw-request-name">{req.name}</div>
                      <div className="hw-request-email">{req.email}</div>
                    </div>
                  </div>

                  <div className="hw-request-actions">
                    <button className="hw-btn hw-btn-primary" onClick={() => handleAccept(req._id)}>Aceitar</button>
                    <button className="hw-btn hw-btn-ghost" onClick={() => handleDecline(req._id)}>Recusar</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Grid (3 cards) */}
        <section className="hw-grid-3">
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
        </section>
      </main>
    </div>
  );
};

export default ProfilePage;
