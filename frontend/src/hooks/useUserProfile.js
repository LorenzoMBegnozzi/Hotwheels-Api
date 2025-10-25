import { useState, useEffect, useCallback } from 'react';
import { getUserById, getUserCollection, getUserWishlist } from '../utils/api';

export const useUserProfile = (userId) => {
  const [user, setUser] = useState(null);
  const [collection, setCollection] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadUserData = useCallback(async () => {
    if (!userId) {
      setError('ID do usuário não fornecido');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Buscar dados do usuário, coleção e wishlist em paralelo
      const [userData, userCollection, userWishlist] = await Promise.allSettled([
        getUserById(userId),
        getUserCollection(userId),
        getUserWishlist(userId)
      ]);

      // Processar resultado do usuário
      if (userData.status === 'fulfilled') {
        setUser(userData.value);
      } else {
        throw new Error('Usuário não encontrado');
      }

      // Processar resultado da coleção
      if (userCollection.status === 'fulfilled') {
        setCollection(userCollection.value || []);
      } else {
        console.warn('Erro ao carregar coleção:', userCollection.reason);
        setCollection([]);
      }

      // Processar resultado da wishlist
      if (userWishlist.status === 'fulfilled') {
        setWishlist(userWishlist.value || []);
      } else {
        console.warn('Erro ao carregar wishlist:', userWishlist.reason);
        setWishlist([]);
      }

    } catch (err) {
      console.error('Erro ao carregar dados do usuário:', err);
      setError(err.message || 'Erro ao carregar dados do usuário');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  return {
    user,
    collection,
    wishlist,
    loading,
    error,
    refetch: loadUserData
  };
};