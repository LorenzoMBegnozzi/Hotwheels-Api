// Application constants
// - Production (Railway): set REACT_APP_API_URL=https://<backend>.up.railway.app
// - Local dev: defaults to http://localhost:5000
// - Legacy: if REACT_APP_API_URL is a path like '/api', it will be respected

const rawApiUrl = (
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_API_BASE_URL ||
  ''
).trim();

const trimTrailingSlashes = (s) => String(s || '').replace(/\/+$/, '');
const joinUrl = (base, path) => `${trimTrailingSlashes(base)}${path}`;

// Origin (scheme + host + optional port)
const isPathOnlyApiUrl = rawApiUrl?.startsWith('/');
export const API_URL = rawApiUrl
  ? (isPathOnlyApiUrl
    // Edge case: someone set '/api' — treat as localhost origin
    ? 'http://localhost:5000'
    : trimTrailingSlashes(rawApiUrl))
  : 'http://localhost:5000';

// Base API path used by fetch/axios
export const API_BASE_URL = isPathOnlyApiUrl
  // If rawApiUrl is '/api', use it directly
  ? rawApiUrl
  // Otherwise, append '/api' to the origin
  : joinUrl(API_URL, '/api');

// Convert a relative backend asset path (e.g. '/uploads/x.png') into an absolute URL
// so it works when frontend and backend are hosted on different origins (Railway).
export const resolveApiAssetUrl = (value) => {
  const s = String(value || '').trim();
  if (!s) return '';

  // Already absolute or browser-local
  if (/^https?:\/\//i.test(s) || /^data:/i.test(s) || /^blob:/i.test(s)) return s;

  // Backend-served assets are exposed at the API origin.
  if (s.startsWith('/')) return joinUrl(API_URL, s);

  return s;
};

/* =========================
   App constants
========================= */

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  PROFILE: '/profile',
  COLLECTION: '/my-collection',
  WISHLIST: '/wishlist',
  RECOGNIZER: '/recognizer',
  USER_PROFILE: '/user/:userId',
};

export const PAGINATION = {
  ITEMS_PER_PAGE: 12,
  DEFAULT_PAGE: 1,
};

export const TABS = {
  COLLECTION: 'collection',
  WISHLIST: 'wishlist',
};

export const MESSAGES = {
  LOGIN_SUCCESS: 'Login realizado com sucesso!',
  LOGIN_ERROR: 'Erro no login. Verifique suas credenciais.',
  REGISTER_SUCCESS: 'Cadastro realizado com sucesso!',
  REGISTER_ERROR: 'Erro no cadastro. Tente novamente.',
  ADD_TO_COLLECTION_SUCCESS: 'Adicionado à coleção!',
  ADD_TO_COLLECTION_ERROR: 'Erro ao adicionar à coleção.',
  ADD_TO_WISHLIST_SUCCESS: 'Adicionado à lista de desejos!',
  ADD_TO_WISHLIST_ERROR: 'Erro ao adicionar à lista de desejos.',
  REMOVE_SUCCESS: 'Item removido com sucesso!',
  REMOVE_ERROR: 'Erro ao remover item.',
  SEARCH_ERROR: 'Erro ao buscar dados.',
  NETWORK_ERROR: 'Erro de conexão. Tente novamente.',
};

// Default profile image
export const DEFAULT_PROFILE_IMAGE = '/avatars/default-user.png';
