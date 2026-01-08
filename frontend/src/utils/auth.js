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

const stripBearer = (token) => {
  const t = String(token || '').trim();
  return t.toLowerCase().startsWith('bearer ') ? t.slice(7).trim() : t;
};

// JWT payload is base64url-encoded (not standard base64).
const decodeBase64Url = (base64Url) => {
  const input = String(base64Url || '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = input.length % 4;
  const padded = pad ? input + '='.repeat(4 - pad) : input;
  return atob(padded);
};

const tryDecodeJwtPayload = (token) => {
  const raw = stripBearer(token);
  const parts = raw.split('.');
  if (parts.length < 2) return null;
  try {
    const json = decodeBase64Url(parts[1]);
    return JSON.parse(json);
  } catch (error) {
    return null;
  }
};

export const getUserFromToken = () => {
  const token = getToken();
  if (!token) return null;

  const payload = tryDecodeJwtPayload(token);
  if (!payload) return null;
  return payload;
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

  const payload = tryDecodeJwtPayload(token);
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
  // allow custom timeout (currently not altering behavior, kept for API compatibility)
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