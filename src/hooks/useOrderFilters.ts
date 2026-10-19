import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ALL_OPTION, EMPTY_FILTERS, ORDER_DATE_FIELDS } from '@/pages/orders/orderFilterValues';
import type { OrderFilterValues } from '@/pages/orders/orderFilterValues';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@/constants/pagination';
import { ORDER_SORT_COLUMNS } from '@/types/order';
import type { OrderFilters, OrderSortColumn } from '@/types/order';
import type { SortState } from '@/utils/sortState';
import { findOrderStatus } from '@/constants/orderStatus';

export interface OrderFilterState {
  values: OrderFilterValues;
  page: number;
  /** Any filter change resets to the first page. */
  setValues: (values: OrderFilterValues) => void;
  setPage: (page: number) => void;
  /** null means the server's default order (newest first). */
  sort: SortState<OrderSortColumn> | null;
  /** A new order starts again from the first page, like any filter change. */
  setSort: (sort: SortState<OrderSortColumn> | null) => void;
  requestFilters: OrderFilters;
}

/**
 * Filters live in the query string so a filtered view survives a refresh and can
 * be pasted to a colleague.
 */
export function useOrderFilters(): OrderFilterState {
  const [searchParams, setSearchParams] = useSearchParams();

  const values = useMemo<OrderFilterValues>(
    () => ({
      q: searchParams.get('q') ?? EMPTY_FILTERS.q,
      status: searchParams.get('status') ?? EMPTY_FILTERS.status,
      serviceId: searchParams.get('serviceId') ?? EMPTY_FILTERS.serviceId,
      departmentId: searchParams.get('departmentId') ?? EMPTY_FILTERS.departmentId,
      assigneeId: searchParams.get('assigneeId') ?? EMPTY_FILTERS.assigneeId,
      customerId: searchParams.get('customerId') ?? EMPTY_FILTERS.customerId,
      originProvince: searchParams.get('originProvince') ?? EMPTY_FILTERS.originProvince,
      destinationProvince:
        searchParams.get('destinationProvince') ?? EMPTY_FILTERS.destinationProvince,
      fromDate: searchParams.get('fromDate') ?? EMPTY_FILTERS.fromDate,
      toDate: searchParams.get('toDate') ?? EMPTY_FILTERS.toDate,
      dateField: searchParams.get('dateField') ?? EMPTY_FILTERS.dateField,
      serviceFieldKey: searchParams.get('serviceFieldKey') ?? EMPTY_FILTERS.serviceFieldKey,
      serviceFieldValue: searchParams.get('serviceFieldValue') ?? EMPTY_FILTERS.serviceFieldValue,
    }),
    [searchParams],
  );

  // A tampered or mistyped ?page= (0, -2, "abc") must not reach the API as a
  // number it rejects with a raw English message; clamp to the first page.
  const parsedPage = Number(searchParams.get('page') ?? DEFAULT_PAGE);
  const page = Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : DEFAULT_PAGE;

  // Same defence as the page number: an unknown column would be answered 400.
  const sort = useMemo<SortState<OrderSortColumn> | null>(() => {
    const column = ORDER_SORT_COLUMNS.find((key) => key === searchParams.get('sortBy'));
    if (column === undefined) return null;
    return { column, order: searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc' };
  }, [searchParams]);

  const writeParams = useCallback(
    (
      next: OrderFilterValues,
      nextPage: number,
      nextSort: SortState<OrderSortColumn> | null,
    ): void => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(next)) {
        if (value === '' || value === ALL_OPTION) continue;
        if (key === 'dateField' && value === 'created') continue;
        params.set(key, value);
      }
      if (nextSort !== null) {
        params.set('sortBy', nextSort.column);
        params.set('sortOrder', nextSort.order);
      }
      if (nextPage !== DEFAULT_PAGE) params.set('page', String(nextPage));
      setSearchParams(params, { replace: true });
    },
    [setSearchParams],
  );

  const setValues = useCallback(
    (next: OrderFilterValues) => writeParams(next, DEFAULT_PAGE, sort),
    [writeParams, sort],
  );
  const setPage = useCallback(
    (nextPage: number) => writeParams(values, nextPage, sort),
    [writeParams, values, sort],
  );
  const setSort = useCallback(
    (nextSort: SortState<OrderSortColumn> | null) => writeParams(values, DEFAULT_PAGE, nextSort),
    [writeParams, values],
  );

  const requestFilters = useMemo<OrderFilters>(() => {
    const filters: OrderFilters = { page, limit: DEFAULT_PAGE_SIZE };
    if (values.q.trim() !== '') filters.q = values.q.trim();
    const status = findOrderStatus(values.status);
    if (status !== undefined) filters.status = status;
    if (values.serviceId !== ALL_OPTION) filters.serviceId = Number(values.serviceId);
    if (values.departmentId !== ALL_OPTION) filters.departmentId = Number(values.departmentId);
    if (values.assigneeId !== ALL_OPTION) filters.assigneeId = Number(values.assigneeId);
    if (values.customerId !== '') filters.customerId = Number(values.customerId);
    if (values.originProvince !== ALL_OPTION) filters.originProvince = values.originProvince;
    if (values.destinationProvince !== ALL_OPTION) {
      filters.destinationProvince = values.destinationProvince;
    }
    if (values.fromDate !== '') filters.fromDate = values.fromDate;
    if (values.toDate !== '') filters.toDate = values.toDate;
    const dateField = ORDER_DATE_FIELDS.find((field) => field === values.dateField);
    if (dateField !== undefined && dateField !== 'created') filters.dateField = dateField;
    // The API takes the pair as one `key:value` string. Both halves are required —
    // a key with no value would filter on "any value", which the list already shows.
    if (values.serviceFieldKey !== '' && values.serviceFieldValue !== '')
      filters.sf = `${values.serviceFieldKey}:${values.serviceFieldValue}`;
    if (sort !== null) {
      filters.sortBy = sort.column;
      filters.sortOrder = sort.order;
    }
    return filters;
  }, [values, page, sort]);

  return { values, page, setValues, setPage, sort, setSort, requestFilters };
}
