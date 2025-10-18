import React, { useState, useEffect } from "react";
import "../css/Wishlist.css";
import { Link } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";

const WishListPage = () => {
    const [wishlist, setWishlist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchWishlist = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) {
                    throw new Error("Usuário não autenticado. Faça login.");
                }

                const response = await axios.get("http://localhost:5000/api/wishlist", {
                    headers: { "x-auth-token": token },
                });

                console.log("✅ Wishlist carregada:", response.data);

                if (response.data?.favorites && Array.isArray(response.data.favorites)) {
                    setWishlist(response.data.favorites);
                }
            } catch (error) {
                console.error("❌ Erro ao buscar lista de desejos:", error);
                setError("Erro ao carregar sua lista de desejos.");
            } finally {
                setLoading(false);
            }
        };

        fetchWishlist();
    }, []);

    const removeFromWishlist = async (carId) => {
        Swal.fire({
            title: "Tem certeza?",
            text: "Você deseja remover este item da sua lista de desejos?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Sim, remover!"
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const response = await axios.delete(`http://localhost:5000/api/wishlist/${carId}`, {
                        headers: { "x-auth-token": localStorage.getItem("token") },
                    });

                    if (response.status === 200) {
                        setWishlist((prevWishlist) => prevWishlist.filter((car) => car._id !== carId));
                        Swal.fire("Removido!", "O item foi removido da sua lista de desejos.", "success");
                    }
                } catch (error) {
                    console.error("❌ Erro ao remover item da wishlist:", error);
                    Swal.fire("Erro!", "Erro ao remover o item. Tente novamente.", "error");
                }
            }
        });
    };

    return (
        <div className="home-container">
            <h2>Minha Lista de Desejos</h2>
            <Link to="/home" className="collection-button">Home</Link>

            {loading ? (
                <p>Carregando...</p>
            ) : error ? (
                <p className="error-message">{error}</p>
            ) : wishlist.length > 0 ? (
                <div className="results-container">
                    {wishlist.map((car) => (
                        <div key={car._id} className="car-item">
                            <h3>{car.name} ({car.year})</h3>
                            <img src={car.imageUrl} alt={car.name} className="car-image" />
                            <button
                                onClick={() => removeFromWishlist(car._id)}
                                className="delete-button"
                            >
                                Excluir
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <p>Sua lista de desejos está vazia!</p>
            )}
        </div>
    );
};

export default WishListPage;