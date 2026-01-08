// Application constants
// - In production: set REACT_APP_API_URL to your backend origin (e.g. https://...railway.app)
// - In local dev: default to http://localhost:5000
// - Legacy support: if REACT_APP_API_URL is set to a path like '/api', keep it as-is

const rawApiUrl = (process.env.REACT_APP_API_URL || process.env.REACT_APP_API_BASE_URL || '').trim();

const trimTrailingSlashes = (s) => String(s || '').replace(/\/+$/, '');
const joinUrl = (base, path) => `${trimTrailingSlashes(base)}${path}`;

export const API_URL = rawApiUrl && !rawApiUrl.startsWith('/')
  ? trimTrailingSlashes(rawApiUrl)
  : 'http://localhost:5000';

// When rawApiUrl is a path ('/api'), use it directly.
// Otherwise build it from the API origin.
export const API_BASE_URL = rawApiUrl && rawApiUrl.startsWith('/')
  ? rawApiUrl
  : joinUrl(API_URL, '/api');

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  PROFILE: '/profile',
  COLLECTION: '/my-collection',
  WISHLIST: '/wishlist',
  RECOGNIZER: '/recognizer',
  USER_PROFILE: '/user/:userId'
};

export const PAGINATION = {
  ITEMS_PER_PAGE: 12,
  DEFAULT_PAGE: 1
};

export const TABS = {
  COLLECTION: 'collection',
  WISHLIST: 'wishlist'
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
  NETWORK_ERROR: 'Erro de conexão. Tente novamente.'
};

// Imagem padrão única para todos os usuários (svg estilizado)
export const DEFAULT_PROFILE_IMAGE = '/default-user.png';