import React, { useEffect, useMemo, useState } from "react";
import "../css/HomePage.css";
import Swal from "sweetalert2";
import { toastSuccess, toastError, toastInfo, toastWarning } from '../utils/alerts';
import { useNavigate } from "react-router-dom";
import { DEFAULT_PROFILE_IMAGE } from "../utils/constants";
import {
  api,
  searchHotWheels,
  searchUsers,
  addToCollection,
  addToWishlist,
  fetchHotwheelCategories,
} from "../utils/api";
import FIXED_CATEGORY_FILTERS from "../utils/categories";
import { isAuthenticated } from "../utils/auth";
import { FaSearch, FaBox, FaHeart, FaNewspaper, FaUsers } from 'react-icons/fa';
import { GiHomeGarage } from 'react-icons/gi';


const HomePage = () => {
  const [popupImage, setPopupImage] = useState(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [yearFilter, setYearFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categories, setCategories] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("hotwheels");
  const [userResults, setUserResults] = useState([]);

  const itemsPerPage = 24;
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

        const response = await api.get(`/api/auth/profile`, {
          headers: { Authorization: token },
        });

        const userData = response.data;

        let collection = [];
        let favorites = [];

        if (userData?._id) {
          try {
            const colRes = await api.get(`/api/collection/${userData._id}`, {
              headers: { Authorization: token },
            });
            collection = colRes.data?.collection || [];
          } catch (e) { }

          try {
            const favRes = await api.get(`/api/wishlist/user/${userData._id}`, {
              headers: { Authorization: token },
            });
            favorites = favRes.data?.favorites || [];
          } catch (e) { }
        }

        setUser({ ...userData, collection, favorites });
      } catch (error) {
        // não logado -> ignora
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

    // listeners para atualizações locais em coleção/wishlist (emitidos por utils/api)
    const onCollectionChanged = (e) => {
      try {
        const payload = e?.detail;
        // payload pode conter collection completa ou apenas mensagem; buscamos atualizar localmente
        setUser((prev) => {
          if (!prev) return prev;
          // se payload.collection existir, usar ela; senão incrementar usando last add
          const newCollection = payload?.collection || prev.collection || [];
          return { ...prev, collection: newCollection };
        });
      } catch (err) {
        // ignorar
      }
    };

    const onWishlistChanged = (e) => {
      try {
        const payload = e?.detail;
        setUser((prev) => {
          if (!prev) return prev;
          const newFavorites = payload?.favorites || prev.favorites || [];
          return { ...prev, favorites: newFavorites };
        });
      } catch (err) { }
    };

    window.addEventListener('user:collection:changed', onCollectionChanged);
    window.addEventListener('user:wishlist:changed', onWishlistChanged);

    return () => {
      window.removeEventListener('user:collection:changed', onCollectionChanged);
      window.removeEventListener('user:wishlist:changed', onWishlistChanged);
    };
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
        toastSuccess('Busca concluída', `${(hotWheels || []).length} resultado(s).`, { timer: 1200 });
      }
    } catch (error) {
      console.error("Erro ao buscar Hot Wheels:", error);
      if (showAlert) toastError('Erro!', 'Erro ao buscar Hot Wheels. Tente novamente.');
    }
  };

  const handleAddToCollection = async (hotWheelId) => {
    try {
      if (!isAuthenticated()) {
        toastWarning('Atenção', 'Você precisa estar logado para adicionar à coleção!');
        return;
      }
      // checar duplicata localmente
      const alreadyInCollection = (user?.collection || []).some((c) => String(c._id || c) === String(hotWheelId));
      if (alreadyInCollection) {
        toastInfo('Aviso', 'Este modelo já está na sua coleção.');
        return;
      }

      const response = await addToCollection(hotWheelId);
      toastSuccess('Sucesso', response.message);

      // atualizar localmente: se response.collection estiver presente, usar; senão adicionar id localmente
      setUser((prev) => {
        if (!prev) return prev;
        if (response?.collection) return { ...prev, collection: response.collection };
        const exists = (prev.collection || []).some((c) => String(c._id || c) === String(hotWheelId));
        if (exists) return prev;
        return { ...prev, collection: [...(prev.collection || []), hotWheelId] };
      });
    } catch (error) {
      console.error("Erro ao adicionar à coleção:", error);
      toastError('Erro', 'Erro ao adicionar à coleção. Tente novamente.');
    }
  };

  const handleAddToWishlist = async (hotWheelId) => {
    try {
      if (!isAuthenticated()) {
        toastWarning('Atenção', 'Você precisa estar logado para adicionar à lista de desejos!');
        return;
      }
      // pedir prioridade ao usuário antes de adicionar (lista clicável)
      const html = `
        <div style="display:flex;flex-direction:column;gap:8px;text-align:left">
          <button data-priority="high" class="swal-priority-btn" style="padding:10px;border-radius:6px;border:1px solid #ccc;background:#fff;cursor:pointer">Alta</button>
          <button data-priority="medium" class="swal-priority-btn" style="padding:10px;border-radius:6px;border:1px solid #ccc;background:#fff;cursor:pointer">Média</button>
          <button data-priority="low" class="swal-priority-btn" style="padding:10px;border-radius:6px;border:1px solid #ccc;background:#fff;cursor:pointer">Baixa</button>
        </div>
      `;

      await Swal.fire({
        title: 'Escolha a prioridade',
        html,
        showCancelButton: true,
        showConfirmButton: false,
        willOpen: () => {
          const container = Swal.getHtmlContainer();
          if (!container) return;
          container.querySelectorAll('.swal-priority-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
              const p = btn.getAttribute('data-priority');
              // fechar o modal retornando o valor via resolve
              Swal.close();
              // armazenar escolhido em dataset temporário para recuperar abaixo
              container.setAttribute('data-chosen-priority', p);
            });
          });
        }
      });

      // recuperar o escolhido
      const swalContainer = Swal.getHtmlContainer();
      const priority = swalContainer ? swalContainer.getAttribute('data-chosen-priority') : null;
      if (!priority) return; // cancelado ou nada escolhido

      // checar duplicata localmente
      const alreadyInWishlist = (user?.favorites || []).some((c) => String(c._id || c) === String(hotWheelId));
      if (alreadyInWishlist) {
        toastInfo('Aviso', 'Este modelo já está na sua lista de desejos.');
        return;
      }

      const response = await addToWishlist(hotWheelId, priority);
      toastSuccess('Sucesso', response.message);

      setUser((prev) => {
        if (!prev) return prev;
        if (response?.favorites) return { ...prev, favorites: response.favorites };
        // inserir objeto reduzido com prioridade para manter consistência local
        return { ...prev, favorites: [...(prev.favorites || []), { _id: hotWheelId, priority }] };
      });
    } catch (error) {
      console.error("Erro ao adicionar à lista de desejos:", error);
      toastError('Erro', 'Erro ao adicionar à lista de desejos. Tente novamente.');
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
      toastError('Erro!', 'Erro ao buscar usuários. Tente novamente.');
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

  // ==================== Stats ====================
  const stats = useMemo(() => {
    const totalModels = results.length;
    const myCollection = user?.collection?.length ?? 0;
    const wishlist = user?.favorites?.length ?? 0;
    const lastAdds = Math.min(myCollection, 15);
    return { totalModels, myCollection, wishlist, lastAdds };
  }, [results.length, user]);

  const onSearchClick = () => {
    if (activeTab === "hotwheels") handleSearchHotWheels();
    else handleSearchUsers();
  };

  useEffect(() => {
    if (activeTab === "hotwheels") handleSearchHotWheels(false);
    else if (activeTab === "users") handleSearchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ====================
  // Avatar helper (FIX)
  // ====================
  const resolveAvatar = (p) => {
    if (!p) return DEFAULT_PROFILE_IMAGE;

    // Se já for URL absoluta (CDN, backend, etc.)
    if (p.startsWith("http://") || p.startsWith("https://")) {
      return p;
    }

    // Garante caminho absoluto no frontend (/avatars/...)
    return p.startsWith("/") ? p : `/${p}`;
  };


  return (
    <div className="hw-page">
      <header className="hw-header">
        <div className="logo" style={{ cursor: "default" }}>
          <div className="logo-text">
            Diecast <span className="logo-accent">Social</span>
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

          <button
            className="user-search-btn"
            onClick={() => navigate('/minha-colecao')}
            title="Minha Coleção"
          >
            Minha Coleção
          </button>

          <button
            className="user-search-btn"
            onClick={() => navigate('/lista-de-desejos')}
            title="Minha Lista de Desejos"
          >
            Minha Lista de Desejos
          </button>

          <button
            className="user-search-btn"
            onClick={() => navigate('/feed')}
            title="Feed"
          >
            Feed
          </button>

          <div className="profile-icon" title="Meu perfil" onClick={() => navigate("/profile")}>
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
        </div>
      </header>

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
            <>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">Todas Categorias</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
                <option value="">Todos os Anos</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </>
          )}

          <button className="search-btn" onClick={onSearchClick}>
            Buscar
          </button>
          <div className="view-toggle" style={{ marginLeft: 12 }}>
            <button
              type="button"
              className={`toggle-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
            >
              Grid
            </button>
            <button
              type="button"
              className={`toggle-btn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
            >
              Lista
            </button>
          </div>
        </div>
      </div>

      <div className={`cards-grid ${viewMode === "list" ? "list-view" : ""}`}>
        {activeTab === "hotwheels"
          ? currentItems.map((car) => (
            <div className="card" key={car._id}>
              <div
                className="card-image"
                onClick={() => car.imageUrl && setPopupImage(car.imageUrl)}
                style={{ cursor: car.imageUrl ? "pointer" : "default" }}
              >
                {car.imageUrl ? (
                  <img
                    src={car.imageUrl}
                    alt={car.name || car.modelName || "Hot Wheels"}
                    className="card-img"
                    loading="lazy"
                    decoding="async"
                    fetchpriority="low"
                  />
                ) : (
                  <div className="card-placeholder"></div>
                )}
              </div>

              <div className="card-content">
                <div
                  className="card-title"
                  style={{ color: "#ffffffff" }}
                  title={car.name || car.modelName || car.title}
                >
                  {car.name || car.modelName || car.title || "Modelo"}
                </div>
                <div className="card-year">Ano: {car.year ?? "-"}</div>

                <div className="card-buttons">
                  <button
                    className="card-btn add-collection"
                    onClick={() => handleAddToCollection(car._id)}
                    aria-label="Adicionar à garagem"
                    title="Garagem"
                  >
                    <span className="card-btn-icon" aria-hidden="true">
                      <GiHomeGarage />
                    </span>
                    <span className="card-btn-text">Garagem</span>
                  </button>
                  <button
                    className="card-btn add-wishlist"
                    onClick={() => handleAddToWishlist(car._id)}
                    aria-label="Adicionar à lista de desejos"
                    title="Desejar"
                  >
                    <span className="card-btn-icon" aria-hidden="true">
                      <FaHeart />
                    </span>
                    <span className="card-btn-text">Desejar</span>
                  </button>
                </div>
              </div>
            </div>
          ))
          : currentItems.map((u) => (
            <div className="card" key={u._id}>
              <div className="card-image">
                <img
                  src={resolveAvatar(u.profilePicture)}
                  alt={u.name}
                  className="user-avatar"
                  loading="lazy"
                  decoding="async"
                  fetchpriority="low"
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_PROFILE_IMAGE;
                  }}
                />
              </div>

              <div className="card-content">
                <div
                  className="card-title"
                  style={{ color: "#ffffffff" }}
                  title={u.name || u.email}
                >
                  {u.name || u.email || 'Usuário'}
                </div>
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
                  {/* back button removed per request */}
                </div>
              </div>
            </div>
          ))}
      </div>

      {popupImage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setPopupImage(null)}
        >
          <img
            src={popupImage}
            alt="Hot Wheels grande"
            decoding="async"
            fetchpriority="high"
            style={{
              width: "400px",
              height: "400px",
              maxWidth: "90vw",
              maxHeight: "90vh",
              objectFit: "contain",
              borderRadius: 12,
              boxShadow: "0 4px 32px #0008",
              background: "#fff",
              padding: 8,
              display: "block",
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

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

      {/* <img
        src="/reconhecedor.png"
        alt="Reconhecer"
        className="recognizer-fab"
        onClick={() => navigate("/reconhecedor")}
      /> */}

      {/* Bottom Navigation (Mobile) */}
      <nav className="bottom-nav">
        <div className="bottom-nav-items">
          <div
            className={`bottom-nav-item ${activeTab === 'hotwheels' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('hotwheels');
              setCurrentPage(1);
            }}
          >
            <div className="bottom-nav-icon"><FaSearch /></div>
            <div className="bottom-nav-label">Buscar</div>
          </div>

          <div
            className="bottom-nav-item"
            onClick={() => navigate('/minha-colecao')}
          >
            <div className="bottom-nav-icon"><FaBox /></div>
            <div className="bottom-nav-label">Coleção</div>
          </div>

          <div
            className="bottom-nav-item"
            onClick={() => navigate('/lista-de-desejos')}
          >
            <div className="bottom-nav-icon"><FaHeart /></div>
            <div className="bottom-nav-label">Desejos</div>
          </div>

          <div
            className="bottom-nav-item"
            onClick={() => navigate('/feed')}
          >
            <div className="bottom-nav-icon"><FaNewspaper /></div>
            <div className="bottom-nav-label">Feed</div>
          </div>

          <div
            className={`bottom-nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('users');
              setCurrentPage(1);
            }}
          >
            <div className="bottom-nav-icon"><FaUsers /></div>
            <div className="bottom-nav-label">Usuários</div>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default HomePage;
