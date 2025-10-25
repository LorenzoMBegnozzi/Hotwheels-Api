import { useState, useMemo } from 'react';

export const usePagination = (items, itemsPerPage = 12) => {
  const [currentPage, setCurrentPage] = useState(1);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(items.length / itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);

  const reset = () => setCurrentPage(1);

  return {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    nextPage,
    prevPage,
    reset,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1
  };
};