import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './UserProfilePage.module.css';
import { DEFAULT_PROFILE_IMAGE } from '../utils/constants';

// Custom hooks
import { useUserProfile } from '../hooks/useUserProfile';
import { usePagination } from '../hooks/usePagination';

// Components
import TabNavigation from '../components/common/TabNavigation';
import CarItem from '../components/common/CarItem';
import Pagination from '../components/common/Pagination';
import { followUser, getUserRelationship, unfollowUser } from '../utils/api';
import { toastError } from '../utils/alerts';

const UserProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('collection');
  const [relationship, setRelationship] = useState(null);
  const [relationshipLoading, setRelationshipLoading] = useState(false);
  const [followActionLoading, setFollowActionLoading] = useState(false);

  // Custom hooks
  const { user, collection, wishlist, loading, error } = useUserProfile(userId);

  const currentUserId = localStorage.getItem('userId');
  const isOwnProfile = currentUserId && String(currentUserId) === String(userId);
  const isLoggedIn = !!localStorage.getItem('token');

  useEffect(() => {
    const loadRelationship = async () => {
      if (isOwnProfile) {
        setRelationship(null);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        setRelationship(null);
        return;
      }

      try {
        setRelationshipLoading(true);
        const rel = await getUserRelationship(userId);
        setRelationship(rel);
      } catch (e) {
        setRelationship(null);
      } finally {
        setRelationshipLoading(false);
      }
    };

    loadRelationship();
  }, [userId, isOwnProfile]);

  const handleToggleFollow = async () => {
    if (!isLoggedIn) {
      toastError('Erro', 'Você precisa estar logado para seguir usuários.');
      return;
    }

    try {
      setFollowActionLoading(true);

      if (relationship?.isFollowing) {
        const res = await unfollowUser(userId);
        setRelationship((prev) => ({ ...(prev || {}), ...res }));
      } else {
        const res = await followUser(userId);
        setRelationship((prev) => ({ ...(prev || {}), ...res }));
      }

      // Recarrega para refletir follow-back / amizade
      try {
        const rel = await getUserRelationship(userId);
        setRelationship(rel);
      } catch (e) {
        // ignore
      }
    } catch (e) {
      const status = e?.status ? ` (${e.status})` : '';
      toastError('Erro', `${e?.message || 'Falha ao seguir'}${status}`);
    } finally {
      setFollowActionLoading(false);
    }
  };

  const followButtonLabel = relationship?.isFollowing
    ? 'Parar de seguir'
    : (relationship?.isFollowedBy ? 'Seguir de volta' : 'Seguir');
  
  // Determine which data to paginate based on active tab
  const currentData = activeTab === 'collection' ? collection : wishlist;
  const { currentPage, totalPages, paginatedData, goToPage } = usePagination(currentData);

  // Tab configuration
  const tabs = [
    { id: 'collection', label: `Coleção (${collection.length})` },
    { id: 'wishlist', label: `Lista de Desejos (${wishlist.length})` }
  ];

  if (loading) {
    return (
      <div className={styles.userProfileContainer}>
        <div className={styles.header}>
          <h1>Carregando...</h1>
          <button className={styles.backButton} onClick={() => navigate(-1)}>
            Voltar
          </button>
        </div>
        <p className={styles.loadingMessage}>Carregando dados do usuário...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.userProfileContainer}>
        <div className={styles.header}>
          <h1>Erro</h1>
          <button className={styles.backButton} onClick={() => navigate(-1)}>
            Voltar
          </button>
        </div>
        <p className={styles.errorMessage}>{error}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.userProfileContainer}>
        <div className={styles.header}>
          <h1>Usuário não encontrado</h1>
          <button className={styles.backButton} onClick={() => navigate(-1)}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.userProfileContainer}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          Voltar
        </button>
      </div>

      <div className={styles.userInfo}>
        <img 
          src={DEFAULT_PROFILE_IMAGE} 
          alt={user.name} 
          className={styles.userImage} 
        />
        <div className={styles.userDetails}>
          <div className={styles.userTitleRow}>
            <h1>{user.name}</h1>

            {!isOwnProfile && isLoggedIn && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button
                  className={styles.backButton}
                  onClick={() => navigate(`/feed?userId=${userId}`)}
                  type="button"
                >
                  Ver publicações
                </button>

                <button
                  className={styles.backButton}
                  onClick={handleToggleFollow}
                  disabled={relationshipLoading || followActionLoading}
                  type="button"
                >
                  {followButtonLabel}
                </button>
              </div>
            )}
          </div>
          <div className={styles.userStats}>
            <div className={styles.statItem}>
              <span></span>
              <span>Coleção: {collection.length} itens</span>
            </div>
            <div className={styles.statItem}>
              <span></span>
              <span>Lista de Desejos: {wishlist.length} itens</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.tabsContainer}>
        <TabNavigation 
          tabs={tabs} 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />
      </div>

      {currentData.length === 0 ? (
        <p className={styles.emptyMessage}>
          {activeTab === 'collection' 
            ? `${user.name} ainda não possui carrinhos na coleção.`
            : `${user.name} ainda não possui carrinhos na lista de desejos.`
          }
        </p>
      ) : (
        <>
          <div className={styles.resultsContainer}>
            {paginatedData.map((car) => (
              <CarItem
                key={car._id}
                car={car}
                showActions={false} // Não mostrar botões de ação para perfil de outros usuários
              />
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
          />
        </>
      )}
    </div>
  );
};

export default UserProfilePage;