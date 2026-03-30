import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import HomePage from "./pages/HomePage";
import MyCollection from "./pages/MyCollection";
import WishListPage from "./pages/WishListPage";
import ProfilePage from "./pages/ProfilePage";
import ProfileSettingsPage from "./pages/ProfileSettingsPage";
import RecognizerPage from "./pages/RecognizerPage";
import UserProfilePage from "./pages/UserProfilePage";
import FeedPage from "./pages/FeedPage";
import UsersPage from "./pages/UsersPage";
import AppLayout from "./components/layout/AppLayout";
import PixSupportPopup from "./components/common/PixSupportPopup";
import AdminDashboardPage from "./pages/AdminDashboardPage";

const AppRoutes = () => {
  return (
    <Router>
      <PixSupportPopup intervalMs={900_000} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Rotas do app com menu fixo */}
        <Route element={<AppLayout />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/minha-colecao" element={<MyCollection />} />
          <Route path="/lista-de-desejos" element={<WishListPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/settings" element={<ProfileSettingsPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/reconhecedor" element={<RecognizerPage />} />
          <Route path="/user/:userId" element={<UserProfilePage />} />
        </Route>

        {/* Admin — fora do AppLayout para ter layout próprio */}
        <Route path="/admin" element={<AdminDashboardPage />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
