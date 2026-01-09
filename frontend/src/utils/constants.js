// frontend/src/utils/constants.js

// Base do backend (origem). Em produção no Railway: REACT_APP_API_URL=https://<backend>.up.railway.app
// Em dev local: default http://localhost:5000
const raw = (process.env.REACT_APP_API_URL || '').trim();

const trimTrailingSlashes = (s) => String(s || '').replace(/\/+$/, '');

// origem do backend
export const API_URL = (raw || 'http://localhost:5000').replace(/\/+$/, '');

// base da API (todas as rotas começam com /api no backend)
export const API_BASE_URL = `${API_URL}/api`;

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

// Default profile image (precisa existir em: frontend/public/avatars/default-user.png)
export const DEFAULT_PROFILE_IMAGE = '/avatars/default-user.png';
