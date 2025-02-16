import React, { useState, useEffect } from "react";
import "../css/HomePage.css";
import { Link } from "react-router-dom";
import axios from "axios";

const WishListPage = () => {
    const [wishlist, setWishlist] = useState([]);

    useEffect(() => {
        const fetchWishlist = async () => {
            try {
                const response = await axios.get("http://localhost:5000/api/collection/wishlist", {
                    headers: { "x-auth-token": localStorage.getItem("token") },
                });

                console.log("Dados recebidos:", response.data); // Verificar a resposta da API

                setWishlist(response.data);
            } catch (error) {
                console.error("Erro ao buscar lista de desejos:", error);
            }
        };

        fetchWishlist();
    }, []);

    return (
        <div className="home-container">
            <h2>Minha Lista de Desejos</h2>
            <Link to="/" className="collection-button">🏠 Voltar para Home</Link>
            <div className="results-container">
                {wishlist.map((car) => (
                    <div key={car._id} className="car-item">
                        <h3>{car.name} ({car.year})</h3>
                        <img src={car.imageUrl} alt={car.name} className="car-image" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WishListPage;
