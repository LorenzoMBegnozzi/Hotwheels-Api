// Frontend: React Component
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../css/MyCollection.css";
import Swal from "sweetalert2";

const MyCollection = () => {
  const [collection, setCollection] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCollection = async () => {
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");

      if (!userId || !token) {
        console.error("❌ Erro: userId ou token não encontrados no localStorage");
        return;
      }

      try {
        const response = await axios.get(`http://localhost:5000/api/collection/${userId}`, {
          headers: { "x-auth-token": token },
        });

        console.log("📌 Dados recebidos no frontend:", response.data.collection);
        setCollection(response.data.collection || []);
      } catch (error) {
        console.error("❌ Erro ao buscar coleção:", error);
      }
    };

    fetchCollection();
  }, []);

  const removeFromCollection = async (carId) => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");

    if (!token || !userId) {
      Swal.fire("Erro!", "Usuário não autenticado!", "error");
      return;
    }

    try {
      const response = await axios.delete(`http://localhost:5000/api/collection/${userId}/${carId}`, {
        headers: { "x-auth-token": token },
      });

      if (response.status === 200) {
        setCollection((prevCollection) => prevCollection.filter((car) => car._id !== carId));
        Swal.fire("Sucesso!", "Item removido com sucesso!", "success");
      } else {
        Swal.fire("Erro!", "Erro ao remover o item!", "error");
      }
    } catch (error) {
      console.error("Erro ao remover item:", error);
      Swal.fire("Erro!", "Erro ao remover o item. Tente novamente.", "error");
    }
  };

  return (
    <div className="my-collection-container">
      <h1>Minha Coleção</h1>
      <button className="back-button" onClick={() => navigate("/home")}>🔙 Voltar para Home</button>
      {collection.length > 0 ? (
        <div className="car-list">
          {collection.map((car) => (
            <div key={car._id} className="car-item">
              <img src={car.imageUrl || "https://via.placeholder.com/150"} alt={car.name} className="car-image" />
              <h3>{car.name.replace(/^'\d{2}\s/, "")} ({car.year})</h3>
              <button onClick={() => removeFromCollection(car._id)} className="delete-button">🗑️</button>
            </div>
          ))}
        </div>
      ) : (
        <p>📭 Sua coleção está vazia.</p>
      )}
    </div>
  );
};

export default MyCollection;