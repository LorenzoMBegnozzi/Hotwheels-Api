import Swal from 'sweetalert2';

// =========================
// Token helpers
// =========================

export const isAuthenticated = () => {
  const t = localStorage.getItem('token');
  return !!t && String(t).trim() !== '';
};

export const getToken = () => localStorage.getItem('token');

export const setToken = (token) => {
  if (token == null) return;
  localStorage.setItem('token', String(token));
  try { window.dispatchEvent(new Event('token:updated')); } catch (e) {}
};

export const removeToken = () => {
  localStorage.removeItem('token');
};

const stripBearer = (token) => {
  const t = String(token || '').trim();
  return t.toLowerCase().startsWith('bearer ') ? t.slice(7).trim() : t;
};

// JWT payload é base64url (não base64 padrão)
const decodeBase64Url = (base64Url) => {
  try {
    const input = String(base64Url || '').replace(/-/g, '+').replace(/_/g, '/');
    if (!input) return null;

    const pad = input.length % 4;
    const padded = pad ? input + '='.repeat(4 - pad) : input;

    return atob(padded);
  } catch {
    return null;
  }
};

const tryDecodeJwtPayload = (token) => {
  const raw = stripBearer(token);
  const parts = String(raw || '').split('.');
  if (parts.length !== 3) return null;

  const decoded = decodeBase64Url(parts[1]);
  if (!decoded) return null;

  try {
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

export const getUserFromToken = () => {
  const token = getToken();
  if (!token) return null;
  return tryDecodeJwtPayload(token);
};

export const logout = () => {
  removeToken();
  window.location.href = '/';
};

// =========================
// Watchers
// =========================

let _tokenExpiryTimeout = null;
let _inactivityTimeout = null;

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
const _activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'click'];
let _activityHandler = null;

// Para não registrar listeners duplicados (StrictMode pode chamar 2x)
let _watcherStarted = false;

const clearExpiryTimeout = () => {
  if (_tokenExpiryTimeout) {
    clearTimeout(_tokenExpiryTimeout);
    _tokenExpiryTimeout = null;
  }
};

const clearInactivityTimeout = () => {
  if (_inactivityTimeout) {
    clearTimeout(_inactivityTimeout);
    _inactivityTimeout = null;
  }
};

export const handleTokenExpired = () => {
  clearExpiryTimeout();
  removeToken();

  Swal.fire({
    icon: 'warning',
    title: 'Sessão expirada',
    text: 'Sua sessão expirou. Faça login novamente.',
    timer: 3000,
    timerProgressBar: true,
    showConfirmButton: false,
  }).then(() => {
    window.location.href = '/login';
  });
};

const doLogoutAndRedirect = () => {
  clearExpiryTimeout();
  clearInactivityTimeout();
  removeToken();
  window.location.href = '/login';
};

const handleInactivityExpiry = () => {
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

  const raw = stripBearer(token);
  if (raw.split('.').length !== 3) return;

  const payload = tryDecodeJwtPayload(token);
  if (!payload || !payload.exp) return;

  const expiresAt = payload.exp * 1000; // exp em segundos
  const msUntilExpiry = expiresAt - Date.now();

  if (msUntilExpiry <= 0) {
    handleTokenExpired();
    return;
  }

  _tokenExpiryTimeout = setTimeout(() => {
    handleTokenExpired();
  }, msUntilExpiry + 50);
};

const resetInactivityTimer = (timeoutMs = INACTIVITY_TIMEOUT_MS) => {
  clearInactivityTimeout();
  const token = getToken();
  if (!token) return;

  _inactivityTimeout = setTimeout(() => {
    handleInactivityExpiry();
  }, timeoutMs);
};

export const startInactivityWatcher = (timeoutMs = INACTIVITY_TIMEOUT_MS) => {
  _activityHandler = () => resetInactivityTimer(timeoutMs);

  _activityEvents.forEach((ev) => window.addEventListener(ev, _activityHandler));

  window.addEventListener('token:updated', _activityHandler);
  window.addEventListener('storage', (e) => { if (e.key === 'token') _activityHandler(); });

  resetInactivityTimer(timeoutMs);
};

export const stopInactivityWatcher = () => {
  clearInactivityTimeout();

  if (_activityHandler) {
    _activityEvents.forEach((ev) => window.removeEventListener(ev, _activityHandler));
    window.removeEventListener('token:updated', _activityHandler);
    _activityHandler = null;
  }
};

export const startTokenExpiryWatcher = () => {
  if (_watcherStarted) return; // evita duplicar listeners
  _watcherStarted = true;

  scheduleExpiryFromToken();
  startInactivityWatcher();

  window.addEventListener('storage', (e) => {
    if (e.key === 'token') scheduleExpiryFromToken();
  });

  window.addEventListener('token:updated', scheduleExpiryFromToken);
};

export const stopTokenExpiryWatcher = () => {
  _watcherStarted = false;

  clearExpiryTimeout();
  stopInactivityWatcher();

  window.removeEventListener('token:updated', scheduleExpiryFromToken);
};
