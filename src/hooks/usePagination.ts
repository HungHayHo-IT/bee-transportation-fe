import { useCallback, useState } from 'react';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@/constants/pagination';

export interface PaginationState {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  /** Any filter change must reset the list to the first page. */
  resetToFirstPage: () => void;
}

export function usePagination(initialPageSize: number = DEFAULT_PAGE_SIZE): PaginationState {
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const resetToFirstPage = useCallback(() => setPage(DEFAULT_PAGE), []);

  const setPageSize = useCallback((nextPageSize: number) => {
    setPageSizeState(nextPageSize);
    setPage(DEFAULT_PAGE);
  }, []);

  return { page, pageSize, setPage, setPageSize, resetToFirstPage };
}
