// Application constants
export const API_BASE_URL = 'http://192.168.0.4:5000/api';

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

export const DEFAULT_PROFILE_IMAGE = '/default-profile.png';