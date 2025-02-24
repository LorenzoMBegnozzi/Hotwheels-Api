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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  const navigate = useNavigate();
  const years = Array.from({ length: 2025 - 1969 + 1 }, (_, i) => 2025 - i);

  useEffect(() => {
    if (yearFilter) {
      setFilteredResults(results.filter((car) => car.year.toString() === yearFilter));
    } else {
      setFilteredResults(results);
    }
  }, [yearFilter, results]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredResults]);

  const handleSearch = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/hotwheels/search?name=${search}`);
      setResults(response.data);
    } catch (error) {
      console.error("Erro ao buscar Hot Wheels:", error);
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredResults.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="home-container">
      <div className="header">
        <button className="logout-button" onClick={() => navigate("/login")}>🚪 Sair</button>
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

      <div className="results-container">
        {currentItems.map((car) => (
          <div key={car._id} className="car-item">
            <h3>{car.name} ({car.year})</h3>
            <img src={car.imageUrl} alt={car.name} className="car-image" />
            <div className="buttons">
              <button>➕ Adicionar à Coleção</button>
              <button>💙 Adicionar à Lista de Desejos</button>
            </div>
          </div>
        ))}
      </div>

      <div className="pagination">
        <button disabled={currentPage === 1} onClick={() => paginate(currentPage - 1)}>Anterior</button>
        {[...Array(totalPages).keys()].map((number) => (
          <button key={number + 1} className={currentPage === number + 1 ? "active" : ""} onClick={() => paginate(number + 1)}>
            {number + 1}
          </button>
        ))}
        <button disabled={currentPage === totalPages} onClick={() => paginate(currentPage + 1)}>Próximo</button>
      </div>
    </div>
  );
};

export default HomePage;
