import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import "../css/ProfilePage.css";
import { FaUserCircle } from "react-icons/fa";
// Imagem padrão única para todos os usuários
const DEFAULT_USER_IMG = '/default-user.png';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
        {/* Força imagem padrão */}
        <img src={DEFAULT_USER_IMG} alt={user.name} className="profile-icon" style={{ width:120, height:120 }} />
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
