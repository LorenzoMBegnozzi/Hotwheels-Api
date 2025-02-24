import React, { useState, useEffect } from "react";
import "../css/HomePage.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";

const HomePage = () => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [yearFilter, setYearFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [user, setUser] = useState(null);
  const itemsPerPage = 100;
  const navigate = useNavigate();
  const years = Array.from({ length: 2025 - 1969 + 1 }, (_, i) => 2025 - i);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        let token = localStorage.getItem("token");
        if (token && !token.startsWith("Bearer ")) {
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

  useEffect(() => {
    setFilteredResults(
      yearFilter ? results.filter((car) => car.year.toString() === yearFilter) : results
    );
    setCurrentPage(1);
  }, [yearFilter, results]);

  const handleSearch = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/hotwheels/search?name=${search}`);
      setResults(response.data);
    } catch (error) {
      console.error("Erro ao buscar Hot Wheels:", error);
    }
  };

  const handleAddToCollection = async (hotWheelId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        Swal.fire("Atenção", "Você precisa estar logado para adicionar à coleção!", "warning");
        return;
      }
      const response = await axios.post(
        "http://localhost:5000/api/collection/add",
        { hotWheelId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Swal.fire("Sucesso", response.data.message, "success");
    } catch (error) {
      console.error("Erro ao adicionar à coleção:", error);
      Swal.fire("Erro", "Erro ao adicionar à coleção. Tente novamente.", "error");
    }
  };

  const handleAddToWishlist = async (hotWheelId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        Swal.fire("Atenção", "Você precisa estar logado para adicionar à lista de desejos!", "warning");
        return;
      }
      const response = await axios.post(
        "http://localhost:5000/api/wishlist",
        { hotWheelId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Swal.fire("Sucesso", response.data.message, "success");
    } catch (error) {
      console.error("Erro ao adicionar à lista de desejos:", error);
      Swal.fire("Erro", "Erro ao adicionar à lista de desejos. Tente novamente.", "error");
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredResults.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="home-container">
      <div className="header">
        <button className="logout-button" onClick={() => navigate("/login")}>🚪 Sair</button>
        {user && (
          <div className="profile-section" onClick={() => navigate("/profile")}>
            <img 
              src={user.profilePicture ? `http://localhost:5000${user.profilePicture}` : "/default-profile.png"} 
              alt="Perfil" 
              className="profile-picture-small" 
            />
          </div>
        )}
      </div>

      <div className="search-section">
        <h2>Virtual Collection</h2>
        <div className="search-filter-container">
          <div className="search-container">
            <div className="search-input-container">
              <input
                type="text"
                className="search-input"
                placeholder="Digite o nome do modelo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="search-icon">🔍</span>
            </div>
            <select id="yearFilter" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
              <option value="">Todos os anos</option>
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <button className="search-button" onClick={handleSearch}>Buscar</button>
          </div>
        </div>
      </div>

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
    </div>
  );
};

export default HomePage;
