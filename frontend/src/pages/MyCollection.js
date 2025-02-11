import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

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
        const res = await axios.get(`http://localhost:5000/api/collection/${userId}`, {
          headers: { "x-auth-token": token },
        });
        setCollection(res.data);
      } catch (error) {
        console.error("Erro ao buscar coleção", error);
      }
    };

    fetchCollection();
  }, [navigate]);

  return (
    <div>
      <h1>Minha Coleção</h1>
      {collection.length > 0 ? (
        <ul>
          {collection.map((car) => (
            <li key={car._id}>
              <img src={car.imageUrl} alt={car.name} width="100" />
              <p>{car.name}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p>Você ainda não possui carros na sua coleção.</p>
      )}
    </div>
  );
};

export default MyCollection;
