import React from 'react';
import { Outlet } from 'react-router-dom';
import AppMenu from './AppMenu';
import AppHeader from './AppHeader';

import '../../css/AppMenu.css';

const AppLayout = () => {
  return (
    <div className="app-shell">
      <AppHeader />
      <div className="app-shell-content">
        <Outlet />
      </div>
      <AppMenu />
    </div>
  );
};

export default AppLayout;
