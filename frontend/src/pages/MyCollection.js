import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import "../css/MyCollection.css";

const MyCollection = () => {
  const [collection, setCollection] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newCar, setNewCar] = useState({ name: "", year: "", image: null });

  const navigate = useNavigate();

  useEffect(() => {
    const fetchCollection = async () => {
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");

      if (!token || !userId) return;

      try {
        const response = await axios.get(`http://localhost:5000/api/collection/${userId}`, {
          headers: { "x-auth-token": token },
        });

        if (response.status === 200) {
          setCollection(response.data.collection); // Atualiza a coleção no estado
        }
      } catch (error) {
        console.error("Erro ao buscar coleção:", error);
      }
    };

    fetchCollection();
  }, []);

  const handleFileChange = (event) => {
    setNewCar({ ...newCar, image: event.target.files[0] });
  };

  const handleAddCar = async () => {
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
      const response = await axios.post("http://localhost:5000/api/collection/add-custom", formData, {
        headers: { "x-auth-token": token, "Content-Type": "multipart/form-data" },
      });

      setCollection([...collection, response.data.car]);
      setShowModal(false);
      setNewCar({ name: "", year: "", image: null });
      Swal.fire("Sucesso!", "Carro adicionado à coleção!", "success");
    } catch (error) {
      console.error("Erro ao adicionar carro:", error);

      if (error.response?.data?.message === "Carro já existe na coleção") {
        Swal.fire("Erro!", "Este carro já está na sua coleção!", "warning");
      } else {
        Swal.fire("Erro!", "Não foi possível adicionar o carro.", "error");
      }
    }
  };

  const handleRemoveCar = async (carId) => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");

    if (!token || !userId) {
      Swal.fire("Erro!", "Usuário não autenticado!", "error");
      return;
    }

    Swal.fire({
      title: "Tem certeza?",
      text: "Você deseja remover este item da sua coleção?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sim, remover!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`http://localhost:5000/api/collection/${userId}/${carId}`, {
            headers: { "x-auth-token": token },
          });

          setCollection((prevCollection) => prevCollection.filter((car) => car._id !== carId));
          Swal.fire("Removido!", "O item foi removido da sua coleção.", "success");
        } catch (error) {
          console.error("Erro ao remover item:", error);
          Swal.fire("Erro!", "Erro ao remover o item. Tente novamente.", "error");
        }
      }
    });
  };

  return (
    <div className="my-collection-container">
      <h1>Minha Coleção</h1>
      <button className="back-button" onClick={() => navigate("/home")}>Home</button>

      <div className="car-list">
        {/* Botão para adicionar novo carro */}
        <div className="add-car-button" onClick={() => setShowModal(true)}>
          <div className="plus-icon">➕</div>
          <p>Adicionar Hot Wheel</p>
        </div>

        {/* Botão para o reconhecedor */}
        <div className="add-car-button" onClick={() => navigate("/reconhecedor")}>
          <div className="plus-icon">🔍</div>
          <p>Reconhecer Imagem</p>
        </div>

        {/* Lista de carros */}
        {collection.map((car) => (
          <div key={car._id} className="car-item">
            <img
              src={car.imageUrl || "https://via.placeholder.com/150"}
              alt={car.name}
              className="car-image"
            />
            <h3>
              {car.name} ({car.year})
            </h3>
            <button
              className="delete-button"
              onClick={() => handleRemoveCar(car._id)}
            >
              Excluir
            </button>
          </div>
        ))}
      </div>


      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Adicionar Hot Wheel</h2>
            <input type="text" placeholder="Nome do carro" value={newCar.name} onChange={(e) => setNewCar({ ...newCar, name: e.target.value })} />
            <input type="number" placeholder="Ano" value={newCar.year} onChange={(e) => setNewCar({ ...newCar, year: e.target.value })} />
            <input type="file" accept="image/*" onChange={handleFileChange} />
            <button onClick={handleAddCar}>Salvar</button>
            <button onClick={() => setShowModal(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCollection;
