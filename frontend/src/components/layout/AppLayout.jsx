import React from 'react';
import { Outlet } from 'react-router-dom';
import AppMenu from './AppMenu';
import AppHeader from './AppHeader';

import '../../css/AppMenu.css';

const AppLayout = () => {
  return (
    <div className="app-shell">
      <AppHeader />
      <div className="app-mobile-topbar" role="banner">
        <div className="app-mobile-topbar-inner">
          <div className="app-mobile-topbar-logo">
            Diecast <span className="app-mobile-topbar-accent">Social</span>
          </div>
        </div>
      </div>
      <div className="app-shell-content">
        <Outlet />
      </div>
      <AppMenu />
    </div>
  );
};

export default AppLayout;
