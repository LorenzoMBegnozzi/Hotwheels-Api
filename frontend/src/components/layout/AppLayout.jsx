import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AppMenu from './AppMenu';
import AppHeader from './AppHeader';
import ScannerModal from '../common/ScannerModal';

import '../../css/AppMenu.css';
import '../../css/ScannerModal.css';

const AppLayout = () => {
  const [scannerOpen, setScannerOpen] = useState(false);
  const location = useLocation();
  const isUserProfile = /^\/user\//.test(location.pathname);

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

      {/* FAB — identificar carrinho (oculto em perfis de outros usuários) */}
      {!isUserProfile && (
        <button
          className="scanner-fab"
          title="Identificar carrinho"
          onClick={() => setScannerOpen(true)}
          aria-label="Identificar carrinho com câmera"
        >
          📷
        </button>
      )}

      {scannerOpen && (
        <ScannerModal onClose={() => setScannerOpen(false)} />
      )}
    </div>
  );
};

export default AppLayout;
