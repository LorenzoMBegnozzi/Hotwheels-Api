import React from 'react';
import styles from './Pagination.module.css';

const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  hasNextPage, 
  hasPrevPage,
  className = '' 
}) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className={`${styles.pagination} ${className}`}>
      <button
        className={`${styles.pageButton} ${styles.navButton}`}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPrevPage}
      >
        ‹ Anterior
      </button>

      {getPageNumbers().map((page, index) => (
        <React.Fragment key={index}>
          {page === '...' ? (
            <span className={styles.ellipsis}>...</span>
          ) : (
            <button
              className={`${styles.pageButton} ${currentPage === page ? styles.active : ''}`}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          )}
        </React.Fragment>
      ))}

      <button
        className={`${styles.pageButton} ${styles.navButton}`}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNextPage}
      >
        Próxima ›
      </button>
    </div>
  );
};

export default Pagination;