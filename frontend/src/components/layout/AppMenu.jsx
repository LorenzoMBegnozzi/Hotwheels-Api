import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FaHome, FaNewspaper, FaHeart, FaUser, FaUsers, FaCog } from 'react-icons/fa';
import { GiHomeGarage } from 'react-icons/gi';
import { api } from '../../utils/api';

import '../../css/AppMenu.css';

const ADMIN_EMAIL = 'lorenzobegnozzi@hotmail.com';

const baseNavItems = [
  { to: '/home', label: 'Home', Icon: FaHome },
  { to: '/users', label: 'Usuários', Icon: FaUsers },
  { to: '/feed', label: 'Feed', Icon: FaNewspaper },
  { to: '/minha-colecao', label: 'Coleção', Icon: GiHomeGarage },
  { to: '/lista-de-desejos', label: 'Desejos', Icon: FaHeart },
  { to: '/profile', label: 'Perfil', Icon: FaUser },
];

const AppMenu = () => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let token = localStorage.getItem('token');
    if (!token) return;
    if (!token.startsWith('Bearer ')) token = `Bearer ${token}`;

    api
      .get('/api/auth/profile', { headers: { Authorization: token } })
      .then(({ data }) => {
        if (data?.email?.toLowerCase() === ADMIN_EMAIL) setIsAdmin(true);
      })
      .catch(() => {});
  }, []);

  const navItems = isAdmin
    ? [...baseNavItems, { to: '/admin', label: 'Admin', Icon: FaCog }]
    : baseNavItems;

  return (
    <nav className="app-menu" aria-label="Menu principal">
      <div className={`app-menu-inner${isAdmin ? ' app-menu-inner--7' : ''}`}>
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
