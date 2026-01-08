import React, { useMemo, useEffect, useState } from "react";
import "../css/Wishlist.css";
import { Link } from "react-router-dom";
import axios from "axios";
import { removeFromWishlist as apiRemoveFromWishlist, addToCollection as apiAddToCollection } from '../utils/api';
import { API_BASE_URL } from "../utils/constants";
import Swal from "sweetalert2";
import { toastSuccess, toastError, toastWarning } from '../utils/alerts';

const WishListPage = () => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [newCar, setNewCar] = useState({ name: "", year: "", image: null });

  // filtros (só UI / client-side)
  const [searchTerm, setSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all"); // all | high | medium | low

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Usuário não autenticado. Faça login.");

        const response = await axios.get(`${API_BASE_URL}/wishlist`, {
          headers: { "x-auth-token": token },
        });

        if (response.data?.favorites && Array.isArray(response.data.favorites)) {
          // normalize priority to 'high'|'medium'|'low' (default medium)
          const normalized = response.data.favorites.map((c) => ({
            ...c,
            priority:
              c.priority && ["high", "medium", "low", "Alta", "Média", "Baixa"].includes(c.priority)
                ? (c.priority === "Alta" ? "high" : c.priority === "Baixa" ? "low" : c.priority === "Média" ? "medium" : c.priority)
                : "medium",
          }));
          setWishlist(normalized);
        } else {
          setWishlist([]);
        }
      } catch (err) {
        console.error("❌ Erro ao buscar lista de desejos:", err);
        setError("Erro ao carregar sua lista de desejos.");
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, []);

  const removeFromWishlist = async (carId) => {
    Swal.fire({
      title: "Tem certeza?",
      text: "Você deseja remover este item da sua lista de desejos?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sim, remover!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const resp = await apiRemoveFromWishlist(carId);
          // backend returns updated favorites array
          const updated = resp.favorites || [];
          setWishlist(updated);
          // notify other parts of the app
          try { window.dispatchEvent(new CustomEvent('user:wishlist:changed', { detail: resp })); } catch (e) {}
          toastSuccess('Removido!', 'O item foi removido da sua lista de desejos.');
        } catch (err) {
          console.error("❌ Erro ao remover item da wishlist:", err);
          const status = err && err.status ? ` (status ${err.status})` : '';
          let bodyMsg = '';
          if (err && err.body) {
            try {
              bodyMsg = typeof err.body === 'string' ? err.body : JSON.stringify(err.body);
            } catch (e) {
              bodyMsg = String(err.body);
            }
          }
          toastError('Erro!', `Erro ao remover o item.${status} ${bodyMsg ? ' Detalhes: ' + bodyMsg : ''}`.trim());
        }
      }
    });
  };

  const handleMoveToCollection = async (car) => {
    const token = localStorage.getItem("token");
    if (!token) {
      toastWarning('Atenção', 'Faça login para mover itens para a coleção.');
      return;
    }

    try {
      // 1) adicionar à coleção (backend previne duplicatas)
      const addResp = await apiAddToCollection(car._id || car);

      // 2) remover da wishlist
      const remResp = await apiRemoveFromWishlist(car._id || car);

      const updated = remResp.favorites || [];
      setWishlist(updated);

      // notificar outras partes da aplicação
      try { window.dispatchEvent(new CustomEvent('user:collection:changed', { detail: addResp })); } catch (e) {}
      try { window.dispatchEvent(new CustomEvent('user:wishlist:changed', { detail: remResp })); } catch (e) {}

      toastSuccess('Sucesso', 'Item movido para sua coleção.');
    } catch (err) {
      console.error("Erro ao mover item para a coleção:", err);
      // se o backend indicar que já existe na wishlist/coleção, mostrar mensagem apropriada
      const msg = err?.message || err?.response?.data?.message || "Não foi possível mover o item.";
      toastError('Erro', msg);
    }
  };

  const handlePriorityChange = (carId, newPriority) => {
    // otimista update
    setWishlist((prev) => prev.map((c) => (c._id === carId ? { ...c, priority: newPriority } : c)));

    // persistir no backend
    (async () => {
      try {
        await axios.put(`${API_BASE_URL}/wishlist/${carId}/priority`, { priority: newPriority }, {
          headers: { "x-auth-token": localStorage.getItem("token"), "Content-Type": "application/json" }
        });
      } catch (err) {
        console.error('❌ Erro ao salvar prioridade:', err);
        // reverter state se falhar
        setWishlist((prev) => prev.map((c) => (c._id === carId ? { ...c, priority: c.priority || 'medium' } : c)));
        toastError('Erro', 'Não foi possível atualizar a prioridade.');
      }
    })();
  };

  const handleFileChange = (event) => {
    setNewCar({ ...newCar, image: event.target.files[0] });
  };

  const handleAddCarToWishlist = async () => {
    if (!newCar.name || !newCar.year || !newCar.image) {
      toastError('Erro!', 'Todos os campos são obrigatórios!');
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      toastError('Erro!', 'Usuário não autenticado!');
      return;
    }

    const formData = new FormData();
    formData.append("name", newCar.name);
    formData.append("year", newCar.year);
    formData.append("image", newCar.image);

    try {
      // 1) cria carro custom (mesmo fluxo da coleção)
      const createRes = await axios.post(`${API_BASE_URL}/collection/add-custom`, formData, {
        headers: { "x-auth-token": token, "Content-Type": "multipart/form-data" },
      });

      const createdCar = createRes.data.car;

      // 2) adiciona na wishlist
      const wishlistRes = await axios.post(
        `${API_BASE_URL}/wishlist`,
        { hotWheelId: createdCar._id },
        { headers: { "x-auth-token": token, "Content-Type": "application/json" } }
      );

      const added = wishlistRes.data?.favorite || createdCar;

      // 3) atualiza estado local
      setWishlist((prev) => [added, ...prev]);

      setShowModal(false);
      setNewCar({ name: "", year: "", image: null });
      toastSuccess('Sucesso!', 'Carro adicionado à lista de desejos!');
    } catch (err) {
      console.error("Erro ao adicionar carro à wishlist:", err);
      if (err.response?.data?.message === "Carro já existe na lista de desejos") {
        toastWarning('Erro!', 'Este carro já está na sua lista de desejos!');
      } else {
        toastError('Erro!', 'Não foi possível adicionar o carro à wishlist.');
      }
    }
  };

  // ===== Stats do template (com seus dados) =====
  // Seu backend não tem prioridade -> então por padrão tudo fica "medium"
  const getPriority = (car) => car.priority || "medium";

  const stats = useMemo(() => {
    const total = wishlist.length;
    const high = wishlist.filter((c) => getPriority(c) === "high").length;
    const medium = wishlist.filter((c) => getPriority(c) === "medium").length;
    const low = wishlist.filter((c) => getPriority(c) === "low").length;
    return { total, high, medium, low };
  }, [wishlist]);

  // anos para filtro
  const yearOptions = useMemo(() => {
    const set = new Set(
      wishlist
        .map((c) => String(c.year ?? ""))
        .filter((y) => y && y !== "undefined" && y !== "null")
    );
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [wishlist]);

  // lista filtrada
  const filtered = useMemo(() => {
    return wishlist.filter((car) => {
      const matchesSearch =
        !searchTerm ||
        String(car.name || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesYear = !yearFilter || String(car.year) === String(yearFilter);

      const p = getPriority(car);
      const matchesPriority =
        priorityFilter === "all" ? true : p === priorityFilter;

      return matchesSearch && matchesYear && matchesPriority;
    });
  }, [wishlist, searchTerm, yearFilter, priorityFilter]);

  const userInitial = (localStorage.getItem("userName") || "U").trim().slice(0, 1).toUpperCase();

  // UI helpers
  const priorityLabel = (p) =>
    p === "high" ? "Alta Prioridade" : p === "low" ? "Baixa Prioridade" : "Média Prioridade";

  const priorityClass = (p) =>
    p === "high" ? "priority-high" : p === "low" ? "priority-low" : "priority-medium";

  return (
    <div className="wl-page">
      {/* Header */}
      <header className="wl-header">
        <div className="logo">
          <div className="logo-text">
            Diecast <span className="logo-accent">Social</span>
          </div>
        </div>

        <div className="header-actions">
          <Link to="/home" className="home-btn">
            Home
          </Link>
          <div className="profile-icon" title="Perfil">
            {userInitial}
          </div>
        </div>
      </header>

      <main className="main-container">
        <div className="page-header">
          <h1 className="page-title">
            Lista de Desejos
          </h1>
          <p className="page-subtitle">Hot Wheels que você deseja adicionar à sua coleção</p>
        </div>

        {/* Loading / Error */}
        {loading ? (
          <div className="wl-state">Carregando...</div>
        ) : error ? (
          <div className="wl-state wl-error">{error}</div>
        ) : (
          <>
            {/* Stats */}
            <div className="stats-bar">
              <div className="stat-card">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">Total de Desejos</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.high}</div>
                <div className="stat-label">Alta Prioridade</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.medium}</div>
                <div className="stat-label">Média Prioridade</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.low}</div>
                <div className="stat-label">Baixa Prioridade</div>
              </div>
            </div>

            {/* Filters */}
            <div className="filter-bar">
              <input
                type="text"
                className="search-input"
                placeholder="🔍 Buscar nos desejos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              {/* placeholder: sem categoria no seu model */}
              <select className="filter-select" disabled title="Sem categorias no modelo atual">
                <option>Todas Categorias</option>
              </select>

              <select
                className="filter-select"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
              >
                <option value="">Todos os Anos</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              <div className="priority-filter">
                <button
                  type="button"
                  className={`priority-btn ${priorityFilter === "all" ? "active" : ""}`}
                  onClick={() => setPriorityFilter("all")}
                >
                  Todos
                </button>
                <button
                  type="button"
                  className={`priority-btn ${priorityFilter === "high" ? "active" : ""}`}
                  onClick={() => setPriorityFilter("high")}
                >
                  Alta
                </button>
                <button
                  type="button"
                  className={`priority-btn ${priorityFilter === "medium" ? "active" : ""}`}
                  onClick={() => setPriorityFilter("medium")}
                >
                  Média
                </button>
                <button
                  type="button"
                  className={`priority-btn ${priorityFilter === "low" ? "active" : ""}`}
                  onClick={() => setPriorityFilter("low")}
                >
                  Baixa
                </button>
              </div>
            </div>

            {/* Cards */}
            <div className="cards-grid">
              {/* Add Card */}
              <div className="add-card" onClick={() => setShowModal(true)} role="button" tabIndex={0}>
                <div className="add-icon">+</div>
                <div className="add-text">Adicionar Desejo</div>
              </div>

              {filtered.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon"></div>
                  <div className="empty-title">Nenhum desejo encontrado</div>
                  <div className="empty-text">Adicione um Hot Wheel à sua lista de desejos.</div>
                </div>
              ) : (
                filtered.map((car) => {
                  const p = getPriority(car);

                  return (
                    <div key={car._id} className="wishlist-card">
                      <div className="card-image">
                        <span className={`priority-badge ${priorityClass(p)}`}>{priorityLabel(p)}</span>

                        <div className="card-menu priority-control" title="Prioridade">
                          <select
                            className="priority-select"
                            value={p}
                            onChange={(e) => handlePriorityChange(car._id, e.target.value)}
                            title="Escolher prioridade"
                          >
                            <option value="high">Alta</option>
                            <option value="medium">Média</option>
                            <option value="low">Baixa</option>
                          </select>
                        </div>

                        <img
                          src={car.imageUrl || "https://via.placeholder.com/600x400"}
                          alt={car.name}
                        />
                      </div>

                      <div className="card-content">
                        <div className="card-meta">
                          <span className="meta-badge">{car.year || "-"}</span>
                          <span className="meta-badge">Custom</span>
                        </div>

                        <div className="card-title">{car.name}</div>

                        {/* O template tem informações extras; como seu model não tem, deixo simples */}
                        <div className="card-actions">
                          <button
                            type="button"
                            className="card-btn btn-move"
                            onClick={() => handleMoveToCollection(car)}
                          >
                            ✓ Mover p/ Coleção
                          </button>

                          <button
                            type="button"
                            className="card-btn btn-delete"
                            onClick={() => removeFromWishlist(car._id)}
                            title="Excluir"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Adicionar Hot Wheel</h2>

            <input
              type="text"
              placeholder="Nome do carro"
              value={newCar.name}
              onChange={(e) => setNewCar({ ...newCar, name: e.target.value })}
            />

            <input
              type="number"
              placeholder="Ano"
              value={newCar.year}
              onChange={(e) => setNewCar({ ...newCar, year: e.target.value })}
            />

            <input type="file" accept="image/*" onChange={handleFileChange} />

            <div className="modal-actions">
              <button type="button" onClick={handleAddCarToWishlist}>
                Salvar
              </button>
              <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WishListPage;
