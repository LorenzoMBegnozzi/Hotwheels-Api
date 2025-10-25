import React, { useState, useEffect } from "react";
import "../css/Wishlist.css";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { fetchWishlist, removeFromWishlist as removeFromWishlistAPI } from "../utils/api";
import { isAuthenticated } from "../utils/auth";

const WishListPage = () => {
    const [wishlist, setWishlist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Verificar se o usuário está autenticado
        if (!isAuthenticated()) {
            navigate("/login");
            return;
        }

        const loadWishlist = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) {
                    throw new Error("Usuário não autenticado. Faça login.");
                }

                const wishlistData = await fetchWishlist();
                console.log("✅ Wishlist carregada:", wishlistData);

                if (Array.isArray(wishlistData)) {
                    setWishlist(wishlistData);
                }
            } catch (error) {
                console.error("❌ Erro ao buscar lista de desejos:", error);
                setError("Erro ao carregar sua lista de desejos.");
                
                // Se erro de autenticação, redirecionar para login
                if (error.message.includes('autenticação') || error.message.includes('token')) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("userId");
                    navigate("/login");
                }
            } finally {
                setLoading(false);
            }
        };

        loadWishlist();
    }, [navigate]);

    const handleRemoveFromWishlist = async (carId) => {
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
                    await removeFromWishlistAPI(carId);

                    setWishlist((prevWishlist) => prevWishlist.filter((car) => car._id !== carId));
                    Swal.fire("Removido!", "O item foi removido da sua lista de desejos.", "success");
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
                                onClick={() => handleRemoveFromWishlist(car._id)}
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