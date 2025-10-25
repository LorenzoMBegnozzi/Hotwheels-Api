import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../utils/auth';

const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    // Limpar localStorage em caso de token inválido
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;