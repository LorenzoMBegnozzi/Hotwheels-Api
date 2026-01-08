import axios from 'axios';
import { API_BASE_URL, API_URL } from './constants';

// Centralized axios client.
// Always use absolute API origin when available (REACT_APP_API_URL), fallback to localhost.
// Usage: api.get('/api/hotwheels')
export const api = axios.create({
  baseURL: API_URL,
});

// Helper function to get auth headers
const getAuthHeaders = () => {
  let token = localStorage.getItem('token');
  if (token && !String(token).startsWith('Bearer ')) token = `Bearer ${token}`;
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': token })
  };
};

// Helper: parse errors with body
const buildHttpError = async (response, fallbackMessage) => {
  let details = null;
  try {
    details = await response.clone().json();
  } catch (e) {
    try {
      details = await response.clone().text();
    } catch (e2) {
      details = null;
    }
  }
  const msg = (details && details.message)
    ? details.message
    : (typeof details === 'string' && details ? details : fallbackMessage);
  const err = new Error(msg);
  err.status = response.status;
  err.body = details;
  throw err;
};

// User related API functions
export const getUserById = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar usuário');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    throw error;
  }
};

export const getUserRelationship = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/relationship`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      await buildHttpError(response, 'Erro ao buscar relacionamento');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar relacionamento:', error);
    throw error;
  }
};

export const followUser = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/follow`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      await buildHttpError(response, 'Erro ao seguir usuário');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao seguir usuário:', error);
    throw error;
  }
};

export const unfollowUser = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/follow`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      await buildHttpError(response, 'Erro ao parar de seguir');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao parar de seguir:', error);
    throw error;
  }
};

// =========================
// Feed API
// =========================

export const fetchFeedPosts = async (options = {}) => {
  try {
    const authorId = options?.authorId;
    const qs = authorId ? `?authorId=${encodeURIComponent(authorId)}` : '';

    const response = await fetch(`${API_BASE_URL}/feed${qs}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      await buildHttpError(response, 'Erro ao buscar feed');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar feed:', error);
    throw error;
  }
};

export const createFeedPost = async ({ text, imageFile }) => {
  try {
    const token = localStorage.getItem('token');
    const form = new FormData();
    form.append('text', text);
    if (imageFile) form.append('image', imageFile);

    const response = await fetch(`${API_BASE_URL}/feed`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: form,
    });

    if (!response.ok) {
      await buildHttpError(response, 'Erro ao criar publicação');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao criar publicação:', error);
    throw error;
  }
};

export const likeFeedPost = async (postId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/feed/${postId}/like`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      await buildHttpError(response, 'Erro ao curtir');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao curtir:', error);
    throw error;
  }
};

export const addFeedComment = async (postId, text) => {
  try {
    const response = await fetch(`${API_BASE_URL}/feed/${postId}/comments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      await buildHttpError(response, 'Erro ao comentar');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao comentar:', error);
    throw error;
  }
};

export const deleteFeedPost = async (postId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/feed/${postId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      await buildHttpError(response, 'Erro ao excluir publicação');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao excluir publicação:', error);
    throw error;
  }
};

// Collection related API functions
export const getUserCollection = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/collection/${userId}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar coleção do usuário');
    }

    const data = await response.json();
    return data.collection || [];
  } catch (error) {
    console.error('Erro ao buscar coleção:', error);
    throw error;
  }
};

// Wishlist related API functions
export const getUserWishlist = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/wishlist/user/${userId}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar lista de desejos do usuário');
    }

    const data = await response.json();
    return data.favorites || [];
  } catch (error) {
    console.error('Erro ao buscar lista de desejos:', error);
    throw error;
  }
};

// Current user's wishlist (authenticated route)
export const fetchWishlist = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/wishlist`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar lista de desejos');
    }

    const data = await response.json();
    return data.favorites || [];
  } catch (error) {
    console.error('Erro ao buscar lista de desejos:', error);
    throw error;
  }
};

// Hot Wheels related API functions
export const searchHotWheels = async (query, options = {}) => {
  try {
    const params = new URLSearchParams();
    if (query && query.trim() !== '') {
      params.append('name', query.trim());
    }
    if (options.category && options.category.trim() !== '') {
      params.append('category', options.category.trim());
    }

    const url = params.toString()
      ? `${API_BASE_URL}/hotwheels/search?${params.toString()}`
      : `${API_BASE_URL}/hotwheels`;

    const response = await fetch(url, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar Hot Wheels');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar Hot Wheels:', error);
    throw error;
  }
};

export const fetchHotwheelCategories = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/hotwheels/categories`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error('Erro ao buscar categorias');
    }
    const data = await response.json();
    return data.categories || [];
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    throw error;
  }
};

// Collection management
export const addToCollection = async (hotWheelId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/collection/add`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ hotWheelId })
    });

    if (!response.ok) {
      throw new Error('Erro ao adicionar à coleção');
    }

    // notifica outros componentes no front-end que coleção do usuário mudou
    try {
      const payload = await response.clone().json();
      window.dispatchEvent(new CustomEvent('user:collection:changed', { detail: payload }));
    } catch (e) {
      // ignorar falha na notificação
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao adicionar à coleção:', error);
    throw error;
  }
};

export const removeFromCollection = async (userId, carId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/collection/${userId}/${carId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Erro ao remover da coleção');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao remover da coleção:', error);
    throw error;
  }
};

// Wishlist management
export const addToWishlist = async (hotWheelId, priority = 'medium') => {
  try {
    const response = await fetch(`${API_BASE_URL}/wishlist`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ hotWheelId, priority })
    });

    if (!response.ok) {
      throw new Error('Erro ao adicionar à lista de desejos');
    }

    // notifica outros componentes no front-end que wishlist do usuário mudou
    try {
      const payload = await response.clone().json();
      window.dispatchEvent(new CustomEvent('user:wishlist:changed', { detail: payload }));
    } catch (e) {
      // ignorar falha na notificação
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao adicionar à lista de desejos:', error);
    throw error;
  }
};

export const removeFromWishlist = async (carId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/wishlist/${carId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      let body = null;
      try { body = await response.clone().json(); } catch (e) { try { body = await response.clone().text(); } catch (e2) { body = null; } }
      const err = new Error('Erro ao remover da lista de desejos');
      err.status = response.status;
      err.body = body;
      throw err;
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao remover da lista de desejos:', error);
    throw error;
  }
};

// Auth related functions
export const loginUser = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      throw new Error('Credenciais inválidas');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro no login:', error);
    throw error;
  }
};

export const registerUser = async (name, email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, email, password })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erro no registro');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro no registro:', error);
    throw error;
  }
};

// Search users
export const searchUsers = async (name) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/search?name=${encodeURIComponent(name)}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar usuários');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    throw error;
  }
};
