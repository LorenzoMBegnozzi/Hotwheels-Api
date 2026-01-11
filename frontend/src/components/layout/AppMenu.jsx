import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaHome, FaNewspaper, FaHeart, FaUser } from 'react-icons/fa';
import { GiHomeGarage } from 'react-icons/gi';

import '../../css/AppMenu.css';

const navItems = [
  { to: '/home', label: 'Home', Icon: FaHome },
  { to: '/feed', label: 'Feed', Icon: FaNewspaper },
  { to: '/minha-colecao', label: 'Coleção', Icon: GiHomeGarage },
  { to: '/lista-de-desejos', label: 'Desejos', Icon: FaHeart },
  { to: '/profile', label: 'Perfil', Icon: FaUser },
];

const AppMenu = () => {
  return (
    <nav className="app-menu" aria-label="Menu principal">
      <div className="app-menu-inner">
        {navItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `app-menu-link${isActive ? ' active' : ''}`}
          >
            <span className="app-menu-icon" aria-hidden="true">
              <Icon />
            </span>
            <span className="app-menu-label">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default AppMenu;
