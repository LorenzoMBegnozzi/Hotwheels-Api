import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import 'sweetalert2/dist/sweetalert2.min.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { startTokenExpiryWatcher } from './utils/auth';


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();

// start token expiry watcher
const token = (localStorage.getItem('token') || '').replace(/^Bearer\s+/i, '').trim();
if (token.split('.').length === 3) {
  startTokenExpiryWatcher();
}
