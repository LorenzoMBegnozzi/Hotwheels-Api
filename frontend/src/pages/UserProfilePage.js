import React, { useState } from 'react';
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

const UserProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('collection');

  // Custom hooks
  const { user, collection, wishlist, loading, error } = useUserProfile(userId);
  
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
          <h1>{user.name}</h1>
          <div className={styles.userStats}>
            <div className={styles.statItem}>
              <span>📦</span>
              <span>Coleção: {collection.length} itens</span>
            </div>
            <div className={styles.statItem}>
              <span>💙</span>
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