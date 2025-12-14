import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import "../css/ProfilePage.css";
import { DEFAULT_PROFILE_IMAGE } from "../utils/constants";
// Imagem padrão única para todos os usuários
const DEFAULT_USER_IMG = DEFAULT_PROFILE_IMAGE; // '/default-user.png'

const PRESET_AVATARS = [
  '/avatars/avatar1.svg',
  '/avatars/avatar2.svg',
  '/avatars/avatar3.svg',
  '/avatars/avatar4.svg',
  '/avatars/avatar5.svg',
  '/avatars/avatar6.svg',
  '/avatars/avatar7.svg',
  '/avatars/avatar8.svg',
];

const ProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_USER_IMG);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        let token = localStorage.getItem("token");
        if (!token.startsWith("Bearer ")) {
          token = `Bearer ${token}`;
        }
        const response = await axios.get("http://localhost:5000/api/auth/profile", {
          headers: { Authorization: token },
        });
        setUser(response.data);
        setSelectedAvatar(response.data?.profilePicture || DEFAULT_USER_IMG);
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
      }
    };
    fetchProfile();
  }, []);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      Swal.fire("Erro!", "As senhas não coincidem.", "error");
      return;
    }

    try {
      let token = localStorage.getItem("token");
      if (!token.startsWith("Bearer ")) {
        token = `Bearer ${token}`;
      }

      await axios.put(
        "http://localhost:5000/api/auth/update-password",
        { currentPassword, newPassword },
        { headers: { Authorization: token } }
      );

      Swal.fire("Sucesso!", "Senha alterada com sucesso!", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      Swal.fire("Erro!", err.response?.data?.message || "Erro ao alterar senha.", "error");
    }
  };

  if (!user) return <p className="profile-loading">Carregando...</p>;

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-header-main">
          <img
            src={selectedAvatar || DEFAULT_USER_IMG}
            alt={user.name}
            className="profile-avatar"
          />
          <div className="profile-id">
            <h2 className="profile-name">{user.name}</h2>
            <p className="profile-email">{user.email}</p>
          </div>
        </div>
        <div className="profile-actions">
          <button className="btn btn-secondary" onClick={() => navigate("/home")}>Home</button>
          <button className="btn btn-danger" onClick={() => navigate("/login")}>Sair</button>
        </div>
      </div>

      <div className="profile-grid">
        <section className="card avatar-card">
          <div className="card-header">
            <h3>Avatar</h3>
          </div>
          <div className="avatar-picker">
            <div className="avatar-list">
              {[DEFAULT_USER_IMG, ...PRESET_AVATARS].map((src) => (
                <button
                  key={src}
                  className={`avatar-item ${selectedAvatar === src ? "selected" : ""}`}
                  onClick={() => setSelectedAvatar(src)}
                >
                  <img src={src} alt="avatar" />
                </button>
              ))}
            </div>
            <button
              className="btn btn-primary full"
              onClick={async () => {
                try {
                  let token = localStorage.getItem('token');
                  if (token && !token.startsWith('Bearer ')) token = `Bearer ${token}`;
                  await axios.put(
                    `http://localhost:5000/api/users/${user._id}/avatar`,
                    { profilePicture: selectedAvatar },
                    { headers: { Authorization: token } }
                  );
                  Swal.fire('Sucesso!', 'Avatar atualizado!', 'success');
                } catch (err) {
                  Swal.fire('Erro!', err.response?.data?.message || 'Falha ao atualizar avatar.', 'error');
                }
              }}
            >
              Salvar Avatar
            </button>
          </div>
        </section>

        <section className="card password-card">
          <div className="card-header">
            <h3>Alterar Senha</h3>
          </div>
          <div className="password-form">
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
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button className="btn btn-primary full" onClick={handleChangePassword}>
              Alterar Senha
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProfilePage;
