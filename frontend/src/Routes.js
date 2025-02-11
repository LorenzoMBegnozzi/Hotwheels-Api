import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import MyCollection from "./pages/MyCollection"; // Importação da página Minha Coleção

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/minha-colecao" element={<MyCollection />} /> {/* Nova rota */}
      </Routes>
    </Router>
  );
};

export default AppRoutes;
