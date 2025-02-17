import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../css/MyCollection.css";
import Swal from "sweetalert2";


const MyCollection = () => {
  const [collection, setCollection] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");

    if (!token || !userId) {
      alert("Usuário não autenticado!");
      navigate("/");
      return;
    }

    const fetchCollection = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/collection/${userId}`, {
          headers: { "x-auth-token": token },
        });

        console.log("Dados recebidos:", response.data);

        if (response.data && response.data.collection) {
          setCollection(response.data.collection);
        } else {
          setCollection([]);
        }
      } catch (error) {
        console.error("Erro ao buscar coleção:", error);
      }
    };

    fetchCollection();
  }, [navigate]);

  const removeFromCollection = async (carId) => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");
  
    console.log("Tentando remover:", { userId, carId });
  
    if (!token || !userId) {
      Swal.fire("Erro!", "Usuário não autenticado!", "error");
      return;
    }
  
    if (!carId || carId.length !== 24 || userId.length !== 24) {
      Swal.fire("Erro!", "ID inválido", "error");
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
      console.error("Erro ao remover item:", error.response?.data || error.message);
      Swal.fire("Erro!", "Erro ao remover o item. Tente novamente.", "error");
    }
  };
  
  return (
    <div className="my-collection-container">
      <h1>Minha Coleção</h1>
  
      <button className="back-button" onClick={() => navigate("/home")}>
        🔙 Voltar para Home
      </button>
  
      {collection.length > 0 ? (
        <div className="car-list">
          {collection.map((car) => (
            <div key={car._id} className="car-item">
              <img src={car.imageUrl || "https://via.placeholder.com/150"} alt={car.name} className="car-image" />
              <h3>{car.name.replace(/^'\d{2}\s/, '')} ({car.year})</h3>
              <button onClick={() => removeFromCollection(car._id)} className="delete-button">
                🗑️
              </button>
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
