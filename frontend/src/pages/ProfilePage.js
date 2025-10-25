import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { getUserProfile, updatePassword } from "../utils/api";
import { logout, isAuthenticated } from "../utils/auth";
import "../css/ProfilePage.css";
import { FaUserCircle } from "react-icons/fa";

const ProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    // Verificar se o usuário está autenticado
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        const userData = await getUserProfile();
        setUser(userData);
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
        // Se erro de autenticação, redirecionar para login
        if (error.message.includes('autenticação') || error.message.includes('token')) {
          localStorage.removeItem("token");
          localStorage.removeItem("userId");
          navigate("/login");
        }
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleLogout = () => {
    Swal.fire({
      title: "Confirmar Logout",
      text: "Você tem certeza que deseja sair?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sim, sair",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        try {
          console.log("Fazendo logout...");
          
          // Limpar dados do localStorage
          localStorage.removeItem("token");
          localStorage.removeItem("userId");
          
          console.log("Dados removidos do localStorage");
          
          Swal.fire({
            title: "Logout realizado!",
            text: "Você foi desconectado com sucesso.",
            icon: "success",
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 1500,
            timerProgressBar: true,
          });
          
          // Aguardar um pouco antes de navegar
          setTimeout(() => {
            console.log("Navegando para login...");
            navigate("/login");
          }, 1000);
          
        } catch (error) {
          console.error("Erro durante logout:", error);
          // Mesmo com erro, tentar navegar
          navigate("/login");
        }
      }
    }).catch((error) => {
      console.error("Erro no modal de logout:", error);
      // Em caso de erro no modal, fazer logout direto
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      navigate("/login");
    });
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      Swal.fire("Erro!", "As senhas não coincidem.", "error");
      return;
    }

    try {
      await updatePassword(currentPassword, newPassword);

      Swal.fire("Sucesso!", "Senha alterada com sucesso!", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      Swal.fire("Erro!", err.message || "Erro ao alterar senha.", "error");
    }
  };

  if (!user) return <p>Carregando...</p>;

  return (
    <div className="profile-container">
      <div className="top-buttons">
        <button className="back-button" onClick={() => navigate("/home")}>
          Home
        </button>
        <button className="back-button" onClick={handleLogout}>
          Sair
        </button>
      </div>

      <div className="profile-header">
        <FaUserCircle className="profile-icon" size={120} color="#ffffffff" />
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
