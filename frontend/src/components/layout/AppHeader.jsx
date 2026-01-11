import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FaHome, FaNewspaper, FaHeart, FaUser } from 'react-icons/fa';
import { GiHomeGarage } from 'react-icons/gi';

import { logout } from '../../utils/auth';
import '../../css/AppHeader.css';

const navItems = [
  { to: '/home', label: 'Home', Icon: FaHome },
  { to: '/feed', label: 'Feed', Icon: FaNewspaper },
  { to: '/minha-colecao', label: 'Minha Coleção', Icon: GiHomeGarage },
  { to: '/lista-de-desejos', label: 'Lista de Desejos', Icon: FaHeart },
  { to: '/profile', label: 'Perfil', Icon: FaUser },
];

const AppHeader = () => {
  const navigate = useNavigate();

  return (
    <header className="app-header" role="banner">
      <div className="app-header-inner">
        <div className="app-header-brand" role="button" tabIndex={0} onClick={() => navigate('/home')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate('/home');
            }
          }}
          aria-label="Ir para Home"
        >
          <div className="app-header-logo">Diecast <span className="app-header-accent">Social</span></div>
        </div>

        <nav className="app-header-nav" aria-label="Navegação">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `app-header-link${isActive ? ' active' : ''}`}
            >
              <span className="app-header-link-icon" aria-hidden="true"><Icon /></span>
              <span className="app-header-link-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="app-header-actions">
          <button type="button" className="app-header-btn" onClick={() => navigate('/profile/settings')}>Configurações</button>
          <button type="button" className="app-header-btn danger" onClick={() => logout()}>Sair</button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
