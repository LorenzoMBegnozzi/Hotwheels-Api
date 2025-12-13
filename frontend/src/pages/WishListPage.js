import React, { useState, useEffect } from "react";
import "../css/Wishlist.css";
import { Link } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";

const WishListPage = () => {
    const [wishlist, setWishlist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [newCar, setNewCar] = useState({ name: "", year: "", image: null });

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

    const handleFileChange = (event) => {
        setNewCar({ ...newCar, image: event.target.files[0] });
    };

    const handleAddCarToWishlist = async () => {
        if (!newCar.name || !newCar.year || !newCar.image) {
            Swal.fire("Erro!", "Todos os campos são obrigatórios!", "error");
            return;
        }

        const token = localStorage.getItem("token");
        if (!token) {
            Swal.fire("Erro!", "Usuário não autenticado!", "error");
            return;
        }

        const formData = new FormData();
        formData.append("name", newCar.name);
        formData.append("year", newCar.year);
        formData.append("image", newCar.image);

        try {
            // 1) Cria um carro customizado (mesmo fluxo da coleção)
            const createRes = await axios.post(
                "http://localhost:5000/api/collection/add-custom",
                formData,
                { headers: { "x-auth-token": token, "Content-Type": "multipart/form-data" } }
            );

            const createdCar = createRes.data.car;

            // 2) Adiciona o carro criado à wishlist
            const wishlistRes = await axios.post(
                "http://localhost:5000/api/wishlist",
                { hotWheelId: createdCar._id },
                { headers: { "x-auth-token": token, "Content-Type": "application/json" } }
            );

            // 3) Atualiza estado local
            const added = wishlistRes.data?.favorite || createdCar;
            setWishlist((prev) => [added, ...prev]);

            setShowModal(false);
            setNewCar({ name: "", year: "", image: null });
            Swal.fire("Sucesso!", "Carro adicionado à lista de desejos!", "success");
        } catch (error) {
            console.error("Erro ao adicionar carro à wishlist:", error);
            if (error.response?.data?.message === "Carro já existe na lista de desejos") {
                Swal.fire("Erro!", "Este carro já está na sua lista de desejos!", "warning");
            } else {
                Swal.fire("Erro!", "Não foi possível adicionar o carro à wishlist.", "error");
            }
        }
    };

    return (
        <div className="home-container">
            <h2>Minha Lista de Desejos</h2>
            <Link to="/home" className="collection-button">Home</Link>

            {loading ? (
                <p>Carregando...</p>
            ) : error ? (
                <p className="error-message">{error}</p>
            ) : (
                <div className="results-container">
                    {/* Botão para adicionar novo carro (sempre visível) */}
                    <div className="add-car-button" onClick={() => setShowModal(true)}>
                        <div className="plus-icon">➕</div>
                        <p>Adicionar Hot Wheel</p>
                    </div>
                    {wishlist.length > 0 && (
                        wishlist.map((car) => (
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
                        ))
                    )}
                </div>
            )}

            {showModal && (
                <div className="modal">
                    <div className="modal-content">
                        <h2>Adicionar Hot Wheel</h2>
                        <input
                            type="text"
                            placeholder="Nome do carro"
                            value={newCar.name}
                            onChange={(e) => setNewCar({ ...newCar, name: e.target.value })}
                        />
                        <input
                            type="number"
                            placeholder="Ano"
                            value={newCar.year}
                            onChange={(e) => setNewCar({ ...newCar, year: e.target.value })}
                        />
                        <input type="file" accept="image/*" onChange={handleFileChange} />
                        <button onClick={handleAddCarToWishlist}>Salvar</button>
                        <button onClick={() => setShowModal(false)}>Cancelar</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WishListPage;