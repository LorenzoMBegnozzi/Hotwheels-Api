import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import "../css/ProfilePage.css";
import { FaUserCircle } from "react-icons/fa";
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

  if (!user) return <p>Carregando...</p>;

  return (
    <div className="profile-container">
      <div className="top-buttons">
        <button className="back-button" onClick={() => navigate("/home")}>
          Home
        </button>
        <button className="back-button" onClick={() => navigate("/login")}>
          Sair
        </button>
      </div>

      <div className="profile-header">
        <img src={selectedAvatar || DEFAULT_USER_IMG} alt={user.name} className="profile-icon" style={{ width:120, height:120 }} />
      </div>

      <div className="avatar-picker">
        <h3>Escolher Avatar</h3>
        <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
          {[DEFAULT_USER_IMG, ...PRESET_AVATARS].map((src) => (
            <button
              key={src}
              onClick={() => setSelectedAvatar(src)}
              style={{
                border: selectedAvatar === src ? '3px solid #2563eb' : '1px solid #cbd5e1',
                borderRadius: 12,
                padding: 4,
                background: '#fff'
              }}
            >
              <img src={src} alt="avatar" style={{ width:60, height:60, borderRadius:8 }} />
            </button>
          ))}
        </div>
        <button
          className="upload-button"
          onClick={async () => {
            try {
              let token = localStorage.getItem('token');
              if (!token.startsWith('Bearer ')) token = `Bearer ${token}`;
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
          style={{ marginTop: 12 }}
        >
          Salvar Avatar
        </button>
      </div>

      <div className="profile-card">
        <div className="profile-info">
          <p><strong>Nome:</strong> {user.name}</p>
          <p><strong>Email:</strong> {user.email}</p>
        </div>

        <h3>Alterar Senha</h3>
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
        <button className="upload-button" onClick={handleChangePassword}>
          Alterar Senha
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
