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
import SubscriptionPlansPage from "./pages/SubscriptionPlansPage";
import SubscriptionSuccessPage from "./pages/SubscriptionSuccessPage";

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/register" element={<LoginPage />} />
        <Route path="/minha-colecao" element={<MyCollection />} /> 
        <Route path="/login" element={<LoginPage />} />
        <Route path="/lista-de-desejos" element={<WishListPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/settings" element={<ProfileSettingsPage />} />
        <Route path="/assinatura" element={<SubscriptionPlansPage />} />
        <Route path="/assinatura/sucesso" element={<SubscriptionSuccessPage />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/reconhecedor" element={<RecognizerPage />} />
        <Route path="/user/:userId" element={<UserProfilePage />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
