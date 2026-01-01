import Swal from 'sweetalert2';

// Authentication utility functions
export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

export const getToken = () => {
  return localStorage.getItem('token');
};

export const setToken = (token) => {
  localStorage.setItem('token', token);
};

export const removeToken = () => {
  localStorage.removeItem('token');
};

export const getUserFromToken = () => {
  const token = getToken();
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch (error) {
    console.error('Erro ao decodificar token:', error);
    return null;
  }
};

export const logout = () => {
  removeToken();
  window.location.href = '/';
};

let _tokenExpiryTimeout = null;
let _inactivityTimeout = null;
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const _activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'click'];

let _activityHandler = null;

const clearExpiryTimeout = () => {
  if (_tokenExpiryTimeout) {
    clearTimeout(_tokenExpiryTimeout);
    _tokenExpiryTimeout = null;
  }
};

export const handleTokenExpired = () => {
  clearExpiryTimeout();
  removeToken();
  Swal.fire({
    icon: 'warning',
    title: 'Sessão expirada',
    text: 'Sua sessão expirou por inatividade. Faça login novamente.',
    timer: 3000,
    timerProgressBar: true,
    showConfirmButton: false,
  }).then(() => {
    window.location.href = '/login';
  });
};

const doLogoutAndRedirect = () => {
  // cleanup
  clearExpiryTimeout();
  if (_inactivityTimeout) {
    clearTimeout(_inactivityTimeout);
    _inactivityTimeout = null;
  }
  removeToken();
  window.location.href = '/login';
};

const handleInactivityExpiry = () => {
  // show confirm alert, then logout
  Swal.fire({
    icon: 'warning',
    title: 'Foi desconectado por inatividade',
    text: 'Você foi desconectado por inatividade.',
    confirmButtonText: 'OK',
    allowOutsideClick: false,
    allowEscapeKey: false,
  }).then(() => {
    doLogoutAndRedirect();
  });
};

const scheduleExpiryFromToken = () => {
  clearExpiryTimeout();
  const token = getToken();
  if (!token) return;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload || !payload.exp) return;
    const expiresAt = payload.exp * 1000; // exp is in seconds
    const msUntilExpiry = expiresAt - Date.now();
    if (msUntilExpiry <= 0) {
      handleTokenExpired();
      return;
    }
    // schedule the expiry handler
    _tokenExpiryTimeout = setTimeout(() => {
      handleTokenExpired();
    }, msUntilExpiry + 50); // small buffer
  } catch (e) {
    console.error('Erro ao agendar expiração do token', e);
  }
};

export const startTokenExpiryWatcher = () => {
  // schedule initially
  scheduleExpiryFromToken();

  // when token is changed in other tabs
  window.addEventListener('storage', (e) => {
    if (e.key === 'token') {
      scheduleExpiryFromToken();
    }
  });

  // custom event when token is updated in this tab
  window.addEventListener('token:updated', () => {
    scheduleExpiryFromToken();
  });
  // start inactivity watcher
  startInactivityWatcher();
};

export const stopTokenExpiryWatcher = () => {
  clearExpiryTimeout();
  window.removeEventListener('token:updated', scheduleExpiryFromToken);
};

const clearInactivityTimeout = () => {
  if (_inactivityTimeout) {
    clearTimeout(_inactivityTimeout);
    _inactivityTimeout = null;
  }
};

const resetInactivityTimer = () => {
  clearInactivityTimeout();
  const token = getToken();
  if (!token) return;
  _inactivityTimeout = setTimeout(() => {
    handleInactivityExpiry();
  }, INACTIVITY_TIMEOUT_MS);
};

export const startInactivityWatcher = (timeoutMs = INACTIVITY_TIMEOUT_MS) => {
  // allow custom timeout
  const t = typeof timeoutMs === 'number' ? timeoutMs : INACTIVITY_TIMEOUT_MS;
  // set constant (not necessary to overwrite, but respect passed value)
  // setup handler
  _activityHandler = () => resetInactivityTimer();

  _activityEvents.forEach((ev) => window.addEventListener(ev, _activityHandler));
  // listen to token changes to reset timer
  window.addEventListener('token:updated', _activityHandler);
  window.addEventListener('storage', (e) => { if (e.key === 'token') _activityHandler(); });

  // start first timer
  resetInactivityTimer();
};

export const stopInactivityWatcher = () => {
  clearInactivityTimeout();
  if (_activityHandler) {
    _activityEvents.forEach((ev) => window.removeEventListener(ev, _activityHandler));
    window.removeEventListener('token:updated', _activityHandler);
    _activityHandler = null;
  }
};