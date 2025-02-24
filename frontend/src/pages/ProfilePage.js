import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import "../css/ProfilePage.css";

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [profilePicture, setProfilePicture] = useState(null);
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

  // 🟢 Upload da Imagem de Perfil
  const handleFileChange = (e) => {
    setProfilePicture(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!profilePicture) {
      Swal.fire("Erro!", "Selecione uma imagem antes de enviar.", "error");
      return;
    }

    const formData = new FormData();
    formData.append("profilePicture", profilePicture);

    try {
      let token = localStorage.getItem("token");
      if (!token.startsWith("Bearer ")) {
        token = `Bearer ${token}`;
      }

      const res = await axios.post("http://localhost:5000/api/auth/upload", formData, {
        headers: {
          Authorization: token,
          "Content-Type": "multipart/form-data",
        },
      });

      Swal.fire("Sucesso!", "Imagem de perfil atualizada!", "success");
      setUser((prev) => ({ ...prev, profilePicture: res.data.imagePath }));
    } catch (err) {
      Swal.fire("Erro!", "Erro ao enviar imagem.", "error");
    }
  };

  // 🟠 Alteração de Senha
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

  if (!user) {
    return <p>Carregando...</p>;
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2>Perfil</h2>
        {user.profilePicture && (
          <img
            src={`http://localhost:5000${user.profilePicture}`}
            alt="Foto de Perfil"
            className="profile-picture"
          />
        )}
      </div>
      
      <div className="profile-card">
        <p><strong>Nome:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>

        {/* Upload de Imagem */}
        <div className="upload-section">
          <input type="file" onChange={handleFileChange} />
          <button className="upload-button" onClick={handleUpload}>Atualizar Foto</button>
        </div>

        {/* Alteração de Senha */}
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
        <button className="upload-button" onClick={handleChangePassword}>Alterar Senha</button>
      </div>
    </div>
  );
};

export default ProfilePage;
