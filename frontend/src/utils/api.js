// Base da API. Usar localhost para evitar inconsistências se o IP da rede mudar.
// Caso a API esteja em outro host, atualize esta constante.
const API_BASE_URL = 'http://localhost:5000/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
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
export const addToWishlist = async (hotWheelId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/wishlist`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ hotWheelId })
    });

    if (!response.ok) {
      throw new Error('Erro ao adicionar à lista de desejos');
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
      throw new Error('Erro ao remover da lista de desejos');
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