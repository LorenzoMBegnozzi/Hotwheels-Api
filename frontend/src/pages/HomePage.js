import React, { useState } from "react";
import axios from "axios";
import './HomePage.css'; // Certifique-se de que o CSS seja importado corretamente

const HomePage = () => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const userId = "ID_DO_USUÁRIO"; // Troque pelo ID do usuário logado

  const handleSearch = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/hotwheels/search?name=${search}`);
      setResults(res.data);
    } catch (err) {
      alert("Erro ao buscar Hot Wheels");
    }
  };

  const addToCollection = async (hotWheelId) => {
    try {
      await axios.post("http://localhost:5000/api/collection/add", { userId, hotWheelId });
      alert("Adicionado à coleção!");
    } catch (err) {
      alert("Erro ao adicionar à coleção");
    }
  };

  const addToFavorites = async (hotWheelId) => {
    try {
      await axios.post("http://localhost:5000/api/collection/favorite", { userId, hotWheelId });
      alert("Adicionado aos favoritos!");
    } catch (err) {
      alert("Erro ao adicionar aos favoritos");
    }
  };

  return (
    <div className="home-container">
      <h1 className="title">Hot Wheels Collection</h1>
      
      <div className="search-container">
        <div className="search-bar">
          <input 
            type="text" 
            placeholder="Buscar Hot Wheels" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
        <button onClick={handleSearch} className="search-button">Buscar</button>
      </div>

      <div>
        {results.map((car) => (
          <div key={car._id} className="car-item">
            <p>{car.name}</p>
            {car.imageUrl && <img src={car.imageUrl} alt={car.name} className="car-image" />} {/* Alterando aqui */}
            <div className="buttons">
              <button onClick={() => addToCollection(car._id)}>Adicionar à Coleção</button>
              <button onClick={() => addToFavorites(car._id)}>Adicionar aos Favoritos</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomePage;
