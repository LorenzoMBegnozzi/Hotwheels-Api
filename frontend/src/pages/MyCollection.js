import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Swal, toastSuccess, toastError } from '../utils/alerts';
import "../css/MyCollection.css";
import { api } from "../utils/api";

const MyCollection = () => {
  const [collection, setCollection] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newCar, setNewCar] = useState({ name: "", year: "", image: null });

  // (UI do template) filtros locais (não muda seu backend)
  const [searchTerm, setSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"

  useEffect(() => {
    const fetchCollection = async () => {
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");
      if (!token || !userId) return;

      try {
        const response = await api.get(`/api/collection/${userId}`, {
          headers: { "x-auth-token": token },
        });

        if (response.status === 200) {
          setCollection(response.data.collection || []);
        }
      } catch (error) {
        console.error("Erro ao buscar coleção:", error);
      }
    };

    fetchCollection();
  }, []);

  const handleFileChange = (event) => {
    setNewCar({ ...newCar, image: event.target.files[0] });
  };

  const handleAddCar = async () => {
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
      const response = await api.post(`/api/collection/add-custom`, formData, {
        headers: { "x-auth-token": token, "Content-Type": "multipart/form-data" },
      });

      setCollection((prev) => [...prev, response.data.car]);
      setShowModal(false);
      setNewCar({ name: "", year: "", image: null });
      toastSuccess('Sucesso!', 'Carro adicionado à coleção!');
    } catch (error) {
      console.error("Erro ao adicionar carro:", error);

      if (error.response?.data?.message === "Carro já existe na coleção") {
        toastError('Erro!', 'Este carro já está na sua coleção!');
      } else {
        toastError('Erro!', 'Não foi possível adicionar o carro.');
      }
    }
  };

  const handleRemoveCar = async (carId) => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");

    if (!token || !userId) {
      toastError('Erro!', 'Usuário não autenticado!');
      return;
    }

    Swal.fire({
      title: "Tem certeza?",
      text: "Você deseja remover este item da sua coleção?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sim, remover!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/api/collection/${userId}/${carId}`, {
            headers: { "x-auth-token": token },
          });

          setCollection((prev) => prev.filter((car) => car._id !== carId));
          toastSuccess('Removido!', 'O item foi removido da sua coleção.');
        } catch (error) {
          console.error("Erro ao remover item:", error);
          toastError('Erro!', 'Erro ao remover o item. Tente novamente.');
        }
      }
    });
  };

  // ======== Stats do template usando seus dados ========
  const stats = useMemo(() => {
    const total = collection.length;

    const years = collection
      .map((c) => Number(c.year))
      .filter((y) => Number.isFinite(y));

    const newest = years.length ? Math.max(...years) : "-";
    const oldest = years.length ? Math.min(...years) : "-";

      // Conta categorias únicas usando `primaryCategory` ou `categories` quando disponíveis
      const categorySet = new Set();
      collection.forEach((c) => {
        if (c.primaryCategory) categorySet.add(c.primaryCategory);
        if (Array.isArray(c.categories)) c.categories.forEach((x) => x && categorySet.add(x));
      });

      const categoriesCount = categorySet.size;

    return { total, categoriesCount, newest, oldest };
  }, [collection]);

  // anos disponíveis para filtro
  const yearOptions = useMemo(() => {
    const set = new Set(
      collection
        .map((c) => String(c.year ?? ""))
        .filter((y) => y && y !== "undefined" && y !== "null")
    );
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [collection]);

  // categorias disponíveis para filtro
  const categoryOptions = useMemo(() => {
    const set = new Set();
    collection.forEach((c) => {
      if (c.primaryCategory) set.add(c.primaryCategory);
      if (Array.isArray(c.categories)) c.categories.forEach((cat) => cat && set.add(cat));
    });
    return Array.from(set).sort();
  }, [collection]);

  // lista filtrada (somente client-side)
  const filtered = useMemo(() => {
    return collection.filter((car) => {
      const matchesSearch =
        !searchTerm ||
        String(car.name || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesYear = !yearFilter || String(car.year) === String(yearFilter);
      const matchesCategory =
        !categoryFilter ||
        (car.primaryCategory && String(car.primaryCategory) === String(categoryFilter)) ||
        (Array.isArray(car.categories) && car.categories.includes(categoryFilter));

      return matchesSearch && matchesYear && matchesCategory;
    });
  }, [collection, searchTerm, yearFilter, categoryFilter]);

  const userInitial = (localStorage.getItem("userName") || "U").trim().slice(0, 1).toUpperCase();

  return (
    <div className="mc-page">
      {/* Header */}
      <header className="mc-header">
        <div className="logo">
          <div className="logo-text">
            Diecast <span className="logo-accent">Social</span>
          </div>
        </div>

        <div className="header-actions">
          <Link to="/home" className="home-btn home-btn-home">
            Home
          </Link>
          <div className="profile-icon" title="Perfil">
            {userInitial}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="main-container">
        <div className="page-header">
          <h1 className="page-title">Minha Coleção</h1>
          <p className="page-subtitle">Gerencie e visualize todos os seus Hot Wheels</p>
        </div>

        {/* Stats */}
        <div className="stats-bar">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total na Coleção</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.categoriesCount}</div>
            <div className="stat-label">Categorias</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.newest}</div>
            <div className="stat-label">Ano Mais Recente</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.oldest}</div>
            <div className="stat-label">Ano Mais Antigo</div>
          </div>
        </div>

        {/* Filters */}
        <div className="filter-bar">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Buscar na coleção..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            title="Filtrar por categoria"
          >
            <option value="">Todas Categorias</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
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

          <div className="view-toggle">
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

        {/* Cards */}
        <div className={`cards-grid ${viewMode === "list" ? "list-view" : ""}`}>
          {/* Add Card */}
          <div className="add-card" onClick={() => setShowModal(true)} role="button" tabIndex={0}>
            <div className="add-icon">+</div>
            <div className="add-text">Adicionar Hot Wheel</div>
          </div>

          {/* Empty */}
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"></div>
              <div className="empty-title">Nada por aqui ainda</div>
              <div className="empty-text">Adicione seu primeiro Hot Wheel à coleção.</div>
            </div>
          ) : (
            filtered.map((car) => (
              <div key={car._id} className="collection-card">
                <div className="card-image">
                  <img
                    src={car.imageUrl || "https://via.placeholder.com/600x400"}
                    alt={car.name}
                    loading="lazy"
                    decoding="async"
                    fetchpriority="low"
                  />
                </div>

                <div className="card-content">
                  <div className="card-meta">
                    <span className="meta-badge">{car.year || "-"}</span>
                    {/* Mostrar categoria real quando disponível */}
                    <span className="meta-badge">
                      {car.primaryCategory || (Array.isArray(car.categories) && car.categories[0]) || "Custom"}
                    </span>
                  </div>

                  <div className="card-title">{car.name}</div>

                  <div className="card-actions">
                    {/* Se você quiser navegar pra uma página de detalhes no futuro, troca o onClick */}
                    <button type="button" className="card-btn btn-view" onClick={() => {}}>
                      Ver Detalhes
                    </button>

                    <button
                      type="button"
                      className="card-btn btn-delete"
                      onClick={() => handleRemoveCar(car._id)}
                      title="Excluir"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Modal (mantém seus campos) */}
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
              <button type="button" onClick={handleAddCar}>
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

export default MyCollection;
