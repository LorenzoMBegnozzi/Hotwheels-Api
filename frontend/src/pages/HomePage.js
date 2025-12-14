import React, { useState, useEffect } from "react";
import "../css/HomePage.css";
import "../css/UserSearch.css"; // estilos específicos para busca de usuários
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { FaUserCircle } from "react-icons/fa";
import { DEFAULT_PROFILE_IMAGE } from "../utils/constants";
import { searchHotWheels, searchUsers, addToCollection, addToWishlist, fetchHotwheelCategories } from "../utils/api";
import FIXED_CATEGORY_FILTERS from "../utils/categories";
import { isAuthenticated } from "../utils/auth";

const HomePage = () => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [yearFilter, setYearFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categories, setCategories] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("hotwheels"); // nova aba
  const [userResults, setUserResults] = useState([]); // resultados da busca de usuários
  const itemsPerPage = 100;
  const navigate = useNavigate();
  const years = Array.from({ length: 2025 - 1969 + 1 }, (_, i) => 2025 - i);

  // Carregar perfil do usuário logado
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        let token = localStorage.getItem("token");
        if (token && !token.startsWith("Bearer ")) token = `Bearer ${token}`;
        const response = await axios.get("http://localhost:5000/api/auth/profile", {
          headers: { Authorization: token },
        });
        setUser(response.data);
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
      }
    };
    fetchProfile();
    // carregar categorias disponíveis (fixas no front, mesclando extras do backend se houver)
    const loadCategories = async () => {
      try {
        // começa com a lista fixa na ordem desejada
        const base = [...FIXED_CATEGORY_FILTERS];
        setCategories(base);

        // tenta buscar categorias do backend para incluir extras, sem alterar a ordem base
        const cats = await fetchHotwheelCategories();
        const seen = new Set(base);
        const extras = [];
        cats.forEach((c) => {
          if (c && !seen.has(c)) {
            seen.add(c);
            extras.push(c);
          }
        });
        if (extras.length) setCategories([...base, ...extras.sort((a, b) => a.localeCompare(b))]);
      } catch (e) {
        console.error("Erro ao carregar categorias:", e);
      }
    };
    loadCategories();
  }, []);

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
      const hotWheels = await searchHotWheels(search, { category: categoryFilter });
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
    <div className="home-page home-container">
      <div className="header" style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
        {user && (
          <div className="profile-section" onClick={() => navigate("/profile")}>
            <img
              src={user.profilePicture || DEFAULT_PROFILE_IMAGE}
              alt={user.name}
              className="profile-icon"
              style={{ width: 36, height: 36, borderRadius: "50%" }}
            />
          </div>
        )}
        {/* Abas dentro do header para não ficarem atrás */}
        <div className="tabs" style={{ flex: 1, marginLeft: '8px' }}>
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
      </div>
      {/* Botão/flutuante do reconhecedor fora do header */}
      <img
        src="/reconhecedor.png"
        alt="Reconhecer"
        className="recognizer-fab"
        onClick={() => navigate('/reconhecedor')}
      />

      {/* Abas movidas para dentro do header */}

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

          {activeTab === "hotwheels" && (
            <select
              id="categoryFilter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="year-filter-select"
            >
              <option value="">Categorias</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
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
              Ver Minha Coleção
            </button>
            <button className="search-button" onClick={() => navigate("/lista-de-desejos")}>
              Ver Lista de Desejos
            </button>
          </div>

          <div className="results-container">
            {currentItems.map((car) => (
              <div key={car._id} className="car-item">
                <h3>{car.name} ({car.year})</h3>
                <img src={car.imageUrl} alt={car.name} className="car-image" />
                <div className="buttons">
                  <button className="search-button" onClick={() => handleAddToCollection(car._id)}>Adicionar à Coleção</button>
                  <button className="search-button" onClick={() => handleAddToWishlist(car._id)}>Adicionar à Lista de Desejos</button>
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
                <img src={u.profilePicture || DEFAULT_PROFILE_IMAGE} alt={u.name} className="user-image" />
                <h3>{u.name}</h3>
                <p>Coleção: {u.collection?.length || 0} | Favoritos: {u.favorites?.length || 0}</p>
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
