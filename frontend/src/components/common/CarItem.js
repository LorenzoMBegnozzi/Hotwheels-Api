import React from 'react';
import styles from './CarItem.module.css';

const CarItem = ({ car, onAddToCollection, onAddToWishlist, showActions = true }) => {
  const handleImageError = (e) => {
    e.target.src = '/default-car-image.png'; // Fallback image
  };

  return (
    <div className={`${styles.carItem} ${!showActions ? styles.noActions : ''}`}>
      <div className={styles.imageContainer}>
        <img
          src={car.imageUrl || '/default-car-image.png'}
          alt={car.name}
          className={styles.carImage}
          loading="lazy"
          decoding="async"
          fetchpriority="low"
          onError={handleImageError}
        />
      </div>
      
      <div className={styles.carInfo}>
        <h3 className={styles.carName}>{car.name}</h3>
        <p className={styles.carYear}>Ano: {car.year}</p>
      </div>

      {showActions && (
        <div className={styles.actions}>
          <button
            className={`${styles.actionButton} ${styles.collectionButton}`}
            onClick={() => onAddToCollection && onAddToCollection(car._id)}
            title="Adicionar à coleção"
          >
            + Coleção
          </button>
          <button
            className={`${styles.actionButton} ${styles.wishlistButton}`}
            onClick={() => onAddToWishlist && onAddToWishlist(car._id)}
            title="Adicionar à lista de desejos"
          >
            + Wishlist
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(CarItem);