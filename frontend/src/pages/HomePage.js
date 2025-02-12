import React, { useState, useEffect } from "react";
import axios from "axios";
import "../css/HomePage.css";
import { Link } from "react-router-dom";

const HomePage = () => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [yearFilter, setYearFilter] = useState(""); // Filtro de ano

  // Lista fixa de anos (de 2025 a 1969)
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
        alert("Token de autenticação não encontrado!");
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
        alert("Adicionado à coleção com sucesso!");
      } else {
        alert("Erro ao adicionar à coleção!");
      }
    } catch (error) {
      console.error("Erro ao adicionar à coleção:", error);
      alert("Erro ao adicionar à coleção. Confira o console.");
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
      alert("Adicionado aos favoritos!");
    } catch (error) {
      console.error("Erro ao adicionar aos favoritos:", error);
    }
  };

  return (
    <div className="home-container">
      <div className="search-section">
        <h1>Buscar Hot Wheels</h1>
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Digite o nome do modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="search-button" onClick={handleSearch}>
            Buscar
          </button>
        </div>

        {/* Filtro por ano */}
        <div className="filter-container">
          <label htmlFor="yearFilter">Filtrar por ano:</label>
          <select
            id="yearFilter"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <option value="">Todos</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Botão de "Ir para Minha Coleção" */}
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
