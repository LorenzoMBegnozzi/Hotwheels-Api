import React, { useState, useEffect } from "react";
import "../css/HomePage.css";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import axios from "axios";

const HomePage = () => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [yearFilter, setYearFilter] = useState("");

  const navigate = useNavigate();
  const years = Array.from({ length: 2025 - 1969 + 1 }, (_, i) => 2025 - i);

  useEffect(() => {
    if (yearFilter) {
      setFilteredResults(results.filter((car) => car.year.toString() === yearFilter));
    } else {
      setFilteredResults(results);
    }
  }, [yearFilter, results]);

  const handleSearch = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/hotwheels/search?name=${search}`);
      setResults(response.data);
    } catch (error) {
      console.error("Erro ao buscar Hot Wheels:", error);
    }
  };
  
  const addToCollection = async (hotWheelId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        Swal.fire("Erro!", "Token de autenticação não encontrado!", "error");
        return;
      }
  
      const response = await axios.post(
        "http://localhost:5000/api/collection/add",
        { userId: "ID_DO_USUÁRIO", hotWheelId },
        {
          headers: { "x-auth-token": token },
        }
      );
  
      if (response.status === 200) {
        Swal.fire("Sucesso!", "Adicionado à coleção com sucesso!", "success");
      } else {
        Swal.fire("Erro!", "Erro ao adicionar à coleção!", "error");
      }
    } catch (error) {
      console.error("Erro ao adicionar à coleção:", error);
      Swal.fire("Erro!", "Erro ao adicionar à coleção. Confira o console.", "error");
    }
  };
  
  
  const addToFavorites = async (hotWheelId) => {
    try {
      await axios.post(
        "http://localhost:5000/api/collection/favorite",
        { userId: "ID_DO_USUÁRIO", hotWheelId },
        {
          headers: { "x-auth-token": localStorage.getItem("token") },
        }
      );
  
      Swal.fire({
        title: "Sucesso!",
        text: "Adicionado aos favoritos!",
        icon: "success",
        confirmButtonText: "OK",
      });
    } catch (error) {
      console.error("Erro ao adicionar aos favoritos:", error);
  
      Swal.fire({
        title: "Erro!",
        text: "Não foi possível adicionar aos favoritos.",
        icon: "error",
        confirmButtonText: "Tentar novamente",
      });
    }
  };
  

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="home-container">
      {/* Cabeçalho com botão de logout */}
      <div className="header">
        <button className="logout-button" onClick={handleLogout}>🚪 Sair</button>
      </div>


      <div className="search-section">
        <h2>Virtual collection</h2>
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
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <button className="search-button" onClick={handleSearch}>Buscar</button>
          </div>
        </div>
        <div className="collection-button-container">
          <Link to="/minha-colecao" className="collection-button">
            🚗 Ir para Minha Coleção
          </Link>
        </div>
      </div>

      <div className="results-container">
        {filteredResults.map((car) => (
          <div key={car._id} className="car-item">
            <h3>
              {car.name} ({car.year})
            </h3>
            <img src={car.imageUrl} alt={car.name} className="car-image" />
            <div className="buttons">
              <button onClick={() => addToCollection(car._id)}>➕ Adicionar à Coleção</button>
              <button onClick={() => addToFavorites(car._id)}>⭐ Adicionar aos Favoritos</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomePage;
