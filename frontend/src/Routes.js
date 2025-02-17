import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import MyCollection from "./pages/MyCollection";
import WishListPage from "./pages/WishListPage";

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/minha-colecao" element={<MyCollection />} /> 
        <Route path="/login" element={<LoginPage />} />
        <Route path="/lista-de-desejos" element={<WishListPage />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
