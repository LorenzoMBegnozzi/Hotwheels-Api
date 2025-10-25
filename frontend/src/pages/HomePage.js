import React, { useState, useEffect } from "react";
import "../css/HomePage.css";
import "../css/UserSearch.css"; // estilos específicos para busca de usuários
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { FaUserCircle } from "react-icons/fa";
import { searchHotWheels, searchUsers, addToCollection, addToWishlist, getUserProfile } from "../utils/api";
import { isAuthenticated } from "../utils/auth";

const HomePage = () => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [yearFilter, setYearFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("hotwheels"); // nova aba
  const [userResults, setUserResults] = useState([]); // resultados da busca de usuários
  const itemsPerPage = 100;
  const navigate = useNavigate();
  const years = Array.from({ length: 2025 - 1969 + 1 }, (_, i) => 2025 - i);

  // Carregar perfil do usuário logado
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

  // Filtrar Hot Wheels por ano
  useEffect(() => {
    if (yearFilter === "") {
      setFilteredResults([...results]);
    } else {
      setFilteredResults(results.filter((car) => car.year.toString() === yearFilter));
    }
    setCurrentPage(1);
  }, [yearFilter, results]);

  // Scroll para o topo ao mudar página
  useEffect(() => window.scrollTo(0, 0), [currentPage]);

  // ==================== Funções de Hot Wheels ====================
  const handleSearchHotWheels = async () => {
    try {
      const hotWheels = await searchHotWheels(search);
      setResults(hotWheels);
    } catch (error) {
      console.error("Erro ao buscar Hot Wheels:", error);
      Swal.fire("Erro!", "Erro ao buscar Hot Wheels. Tente novamente.", "error");
    }
  };

  const handleAddToCollection = async (hotWheelId) => {
    try {
      if (!isAuthenticated()) {
        Swal.fire("Atenção", "Você precisa estar logado para adicionar à coleção!", "warning");
        return;
      }
      const response = await addToCollection(hotWheelId);
      Swal.fire("Sucesso", response.message, "success");
    } catch (error) {
      console.error("Erro ao adicionar à coleção:", error);
      Swal.fire("Erro", "Erro ao adicionar à coleção. Tente novamente.", "error");
    }
  };

  const handleAddToWishlist = async (hotWheelId) => {
    try {
      if (!isAuthenticated()) {
        Swal.fire("Atenção", "Você precisa estar logado para adicionar à lista de desejos!", "warning");
        return;
      }
      const response = await addToWishlist(hotWheelId);
      Swal.fire("Sucesso", response.message, "success");
    } catch (error) {
      console.error("Erro ao adicionar à lista de desejos:", error);
      Swal.fire("Erro", "Erro ao adicionar à lista de desejos. Tente novamente.", "error");
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredResults.slice(indexOfFirstItem, indexOfLastItem);

  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);

  const goToNextPage = () => setCurrentPage(Math.min(currentPage + 1, totalPages));
  const goToPrevPage = () => setCurrentPage(Math.max(currentPage - 1, 1));
  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);

 const handleSearchUsers = async () => {
  try {
    const users = await searchUsers(search);

    // Filtra para não mostrar o usuário logado
    const filteredUsers = users.filter(u => u._id !== user?._id);

    setUserResults(filteredUsers);
    setCurrentPage(1);
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    Swal.fire("Erro!", "Erro ao buscar usuários. Tente novamente.", "error");
  }
};

  const currentUserItems = userResults.slice(indexOfFirstItem, indexOfLastItem);
  const totalUserPages = Math.ceil(userResults.length / itemsPerPage);

  // ==================== Renderização ====================
  return (
    <div className="home-container">
      <div className="header">
        {user && (
          <div className="profile-section" onClick={() => navigate("/profile")}>
            <FaUserCircle size={60} className="profile-icon" />
          </div>
        )}
      </div>

      {/* ==================== Abas ==================== */}
      <div className="tabs">
        <button
          className={`tab-button ${activeTab === "hotwheels" ? "active" : ""}`}
          onClick={() => setActiveTab("hotwheels")}
        >
          Hot Wheels
        </button>
        <button
          className={`tab-button ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          Pesquisar Usuários
        </button>
      </div>

      {/* ==================== Busca ==================== */}
      <div className="search-section">
        <div className="search-container">
          <div className="search-input-container">
            <input
              type="text"
              className="search-input"
              placeholder={activeTab === "hotwheels" ? "Digite o nome do modelo..." : "Digite o nome do usuário..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="search-icon">🔍</span>
          </div>

          {activeTab === "hotwheels" && (
            <select
              id="yearFilter"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="year-filter-select"
            >
              <option value="">Anos</option>
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          )}

          <button className="buscar-button" onClick={activeTab === "hotwheels" ? handleSearchHotWheels : handleSearchUsers}>
            Buscar
          </button>
        </div>
      </div>

      {/* ==================== Resultados ==================== */}
      {activeTab === "hotwheels" ? (
        <>
          <div className="collection-wishlist-buttons">
            <button className="search-button" onClick={() => navigate("/minha-colecao")}>
              📦 Ver Minha Coleção
            </button>
            <button className="search-button" onClick={() => navigate("/lista-de-desejos")}>
              💙 Ver Lista de Desejos
            </button>
          </div>

          <div className="results-container">
            {currentItems.map((car) => (
              <div key={car._id} className="car-item">
                <h3>{car.name} ({car.year})</h3>
                <img src={car.imageUrl} alt={car.name} className="car-image" />
                <div className="buttons">
                  <button className="search-button" onClick={() => handleAddToCollection(car._id)}>➕ Adicionar à Coleção</button>
                  <button className="search-button" onClick={() => handleAddToWishlist(car._id)}>💙 Adicionar à Lista de Desejos</button>
                </div>
              </div>
            ))}
          </div>

          <div className="pagination">
            <button onClick={goToFirstPage} disabled={currentPage === 1} className="pagination-button">Primeira</button>
            <button onClick={goToPrevPage} disabled={currentPage === 1} className="pagination-button">Anterior</button>
            <span>Página {currentPage} de {totalPages}</span>
            <button onClick={goToNextPage} disabled={currentPage === totalPages} className="pagination-button">Próxima</button>
            <button onClick={goToLastPage} disabled={currentPage === totalPages} className="pagination-button">Última</button>
          </div>
        </>
      ) : (
        <>
          <div className="results-container">
            {currentUserItems.map((u) => (
              <div key={u._id} className="user-item">
                <img src={u.profilePicture || "/default-profile.png"} alt={u.name} className="user-image" />
                <h3>{u.name}</h3>
                <p>📦 Coleção: {u.collection?.length || 0} | 💙 Favoritos: {u.favorites?.length || 0}</p>
                <button className="search-button" onClick={() => navigate(`/user/${u._id}`)}>Ver Perfil</button>
              </div>
            ))}
          </div>

          <div className="pagination">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="pagination-button">Primeira</button>
            <button onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))} disabled={currentPage === 1} className="pagination-button">Anterior</button>
            <span>Página {currentPage} de {totalUserPages}</span>
            <button onClick={() => setCurrentPage(Math.min(currentPage + 1, totalUserPages))} disabled={currentPage === totalUserPages} className="pagination-button">Próxima</button>
            <button onClick={() => setCurrentPage(totalUserPages)} disabled={currentPage === totalUserPages} className="pagination-button">Última</button>
          </div>
        </>
      )}
    </div>
  );
};

export default HomePage;
