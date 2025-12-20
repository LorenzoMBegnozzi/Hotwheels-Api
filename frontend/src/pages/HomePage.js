import React, { useEffect, useMemo, useState } from "react";
import "../css/HomePage.css";
import axios from "axios";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { DEFAULT_PROFILE_IMAGE, API_BASE_URL } from "../utils/constants";
import {
  searchHotWheels,
  searchUsers,
  addToCollection,
  addToWishlist,
  fetchHotwheelCategories,
} from "../utils/api";
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
  const [activeTab, setActiveTab] = useState("hotwheels");
  const [userResults, setUserResults] = useState([]);

  const itemsPerPage = 24; // no template fica melhor 12/24 ao invés de 100
  const navigate = useNavigate();

  const currentYear = new Date().getFullYear();
  const years = useMemo(
    () => Array.from({ length: currentYear - 1969 + 1 }, (_, i) => currentYear - i),
    [currentYear]
  );

  // ==================== Perfil + categorias ====================
  useEffect(() => {
    const fetchProfileAndCollection = async () => {
      try {
        let token = localStorage.getItem("token");
        if (token && !token.startsWith("Bearer ")) token = `Bearer ${token}`;
        const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
          headers: { Authorization: token },
        });
        const userData = response.data;
        // Buscar coleção real do usuário
        let collection = [];
        let favorites = [];
        if (userData?._id) {
          try {
            const colRes = await axios.get(`${API_BASE_URL}/collection/${userData._id}`, {
              headers: { Authorization: token },
            });
            collection = colRes.data?.collection || [];
          } catch (e) {
            // Se der erro, ignora e segue
          }
          try {
            const favRes = await axios.get(`${API_BASE_URL}/wishlist/user/${userData._id}`, {
              headers: { Authorization: token },
            });
            favorites = favRes.data?.favorites || [];
          } catch (e) {
            // Se der erro, ignora e segue
          }
        }
        setUser({ ...userData, collection, favorites });
      } catch (error) {
        // se não estiver logado, só ignora
      }
    };

    const loadCategories = async () => {
      try {
        const base = [...FIXED_CATEGORY_FILTERS];
        setCategories(base);

        const cats = await fetchHotwheelCategories();
        const seen = new Set(base);
        const extras = [];
        (cats || []).forEach((c) => {
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

    fetchProfileAndCollection();
    loadCategories();
  }, []);

  // ==================== Filtrar por ano ====================
  useEffect(() => {
    if (!yearFilter) setFilteredResults([...results]);
    else setFilteredResults(results.filter((car) => String(car.year) === String(yearFilter)));
    setCurrentPage(1);
  }, [yearFilter, results]);

  useEffect(() => window.scrollTo(0, 0), [currentPage]);

  // ==================== Hot Wheels ====================
  const handleSearchHotWheels = async (showAlert = true) => {
    try {
      const hotWheels = await searchHotWheels(search, { category: categoryFilter });
      setResults(hotWheels || []);
      if (showAlert) {
        Swal.fire({
          icon: "success",
          title: "Busca concluída",
          text: `${(hotWheels || []).length} resultado(s).`,
          timer: 1200,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      console.error("Erro ao buscar Hot Wheels:", error);
      if (showAlert) {
        Swal.fire("Erro!", "Erro ao buscar Hot Wheels. Tente novamente.", "error");
      }
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

  // ==================== Usuários ====================
  const handleSearchUsers = async () => {
    try {
      const users = await searchUsers(search);
      const filteredUsers = (users || []).filter((u) => u._id !== user?._id);
      setUserResults(filteredUsers);
      setCurrentPage(1);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      Swal.fire("Erro!", "Erro ao buscar usuários. Tente novamente.", "error");
    }
  };

  // ==================== Paginação ====================
  const list = activeTab === "hotwheels" ? filteredResults : userResults;
  const totalPages = Math.max(1, Math.ceil(list.length / itemsPerPage));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = list.slice(indexOfFirstItem, indexOfLastItem);

  const goToNextPage = () => setCurrentPage((p) => Math.min(p + 1, totalPages));
  const goToPrevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));
  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);

  // ==================== Stats (igual template) ====================
  const stats = useMemo(() => {
    const totalModels = results.length; // você pode trocar por total global se tiver endpoint
    const myCollection = user?.collection?.length ?? 0;
    const wishlist = user?.favorites?.length ?? 0; // se no seu backend wishlist tiver outro nome, troca aqui
    const lastAdds = Math.min(myCollection, 15);
    return { totalModels, myCollection, wishlist, lastAdds };
  }, [results.length, user]);

  const onSearchClick = () => {
    if (activeTab === "hotwheels") handleSearchHotWheels();
    else handleSearchUsers();
  };

  // Buscar Hot Wheels ou Usuários automaticamente ao trocar de aba
  useEffect(() => {
    if (activeTab === "hotwheels") {
      handleSearchHotWheels(false); // não mostrar alerta na busca inicial
    } else if (activeTab === "users") {
      handleSearchUsers(); // busca usuários automaticamente
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  return (
    <div className="hw-page">
      {/* Header igual ao template */}

      <header className="hw-header">
        <div className="logo" style={{ cursor: "default" }}>
          <div className="logo-text">
            Hot Wheels <span className="logo-accent">Collector</span>
          </div>
        </div>

        <div className="header-actions">
          {activeTab === "hotwheels" ? (
            <button
              className="user-search-btn"
              onClick={() => {
                setActiveTab("users");
                setCurrentPage(1);
              }}
            >
              Pesquisar Usuários
            </button>
          ) : (
            <button
              className="user-search-btn"
              onClick={() => {
                setActiveTab("hotwheels");
                setCurrentPage(1);
              }}
            >
              Pesquisar Carrinhos
            </button>
          )}

          {/* Perfil */}
          <div
            className="profile-icon"
            title="Meu perfil"
            onClick={() => navigate("/profile")}
          >
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
        </div>
      </header>

      {/* Stats Bar igual template */}
      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-value">{stats.totalModels}</div>
          <div className="stat-label">Total de Modelos</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.myCollection}</div>
          <div className="stat-label">Minha Coleção</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.wishlist}</div>
          <div className="stat-label">Lista de Desejos</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.lastAdds}</div>
          <div className="stat-label">Últimas Adições</div>
        </div>
      </div>

      {/* Search Container igual template */}
      <div className="search-container">
        <div className="search-bar">
          <input
            type="text"
            className="search-input"
            placeholder={activeTab === "hotwheels" ? "Buscar modelo..." : "Buscar usuário..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearchClick()}
          />

          {activeTab === "hotwheels" && (
            <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
              <option value="">Todos os Anos</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}

          {activeTab === "hotwheels" && (
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">Todas Categorias</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          <button className="search-btn" onClick={onSearchClick}>
            Buscar
          </button>
        </div>
      </div>

      {/* Action Buttons igual template (só pra hotwheels) */}
      {activeTab === "hotwheels" && (
        <div className="action-buttons">
          <button className="action-btn collection-btn" onClick={() => navigate("/minha-colecao")}>
            Minha Coleção
          </button>
          <button className="action-btn wishlist-btn" onClick={() => navigate("/lista-de-desejos")}>
            Lista de Desejos
          </button>
        </div>
      )}

      {/* Cards Grid igual template */}
      <div className="cards-grid">
        {activeTab === "hotwheels" ? (
          currentItems.map((car) => (
            <div className="card" key={car._id}>
              <div className="card-image">
                {/* Se você tiver imagem, pode usar <img>. Senão fica no emoji do template */}
                {car.imageUrl ? (
                  <img
                    src={car.imageUrl}
                    alt={car.name || car.modelName || "Hot Wheels"}
                    className="card-img"
                  />
                ) : (
                  <div className="card-placeholder">🏎️</div>
                )}
              </div>

              <div className="card-content">
                <div className="card-title">
                  {car.name || car.modelName || car.title || "Modelo"}
                </div>
                <div className="card-year">Ano: {car.year ?? "-"}</div>

                <div className="card-buttons">
                  <button
                    className="card-btn add-collection"
                    onClick={() => handleAddToCollection(car._id)}
                  >
                    Adicionar
                  </button>
                  <button
                    className="card-btn add-wishlist"
                    onClick={() => handleAddToWishlist(car._id)}
                  >
                    Desejar
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          currentItems.map((u) => (
            <div className="card" key={u._id}>
              <div className="card-image">
                <img
                  src={u.profilePicture || DEFAULT_PROFILE_IMAGE}
                  alt={u.name}
                  className="user-avatar"
                />
              </div>

              <div className="card-content">
                <div className="card-title">{u.name}</div>
                <div className="card-year">
                  Coleção: {u.collection?.length || 0} • Favoritos: {u.favorites?.length || 0}
                </div>

                <div className="card-buttons">
                  <button
                    className="card-btn add-collection"
                    onClick={() => navigate(`/user/${u._id}`)}
                  >
                    Ver Perfil
                  </button>
                  <button
                    className="card-btn add-wishlist"
                    onClick={() => {
                      // se quiser: voltar pra aba hotwheels com o nome do user na busca, etc.
                      setActiveTab("hotwheels");
                    }}
                  >
                    Voltar
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination igual template */}
      <div className="pagination">
        <button className="pagination-btn" onClick={goToFirstPage} disabled={currentPage === 1}>
          Primeira
        </button>
        <button className="pagination-btn" onClick={goToPrevPage} disabled={currentPage === 1}>
          Anterior
        </button>

        <div className="pagination-info">
          Página {currentPage} de {totalPages}
        </div>

        <button className="pagination-btn" onClick={goToNextPage} disabled={currentPage === totalPages}>
          Próxima
        </button>
        <button className="pagination-btn" onClick={goToLastPage} disabled={currentPage === totalPages}>
          Última
        </button>
      </div>

      {/* Seu FAB do reconhecedor (mantém) */}
      <img
        src="/reconhecedor.png"
        alt="Reconhecer"
        className="recognizer-fab"
        onClick={() => navigate("/reconhecedor")}
      />
    </div>
  );
};

export default HomePage;
