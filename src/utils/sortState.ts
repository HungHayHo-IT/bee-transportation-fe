export type SortOrder = 'asc' | 'desc';

export interface SortState<Column extends string> {
  column: Column;
  order: SortOrder;
}

/**
 * Three states per column: unsorted → ascending → descending → unsorted. The
 * third click hands the order back to the server's default rather than leaving
 * the user unable to undo a sort without resetting every filter.
 */
export function nextSortState<Column extends string>(
  current: SortState<Column> | null,
  column: Column,
): SortState<Column> | null {
  if (current?.column !== column) return { column, order: 'asc' };
  return current.order === 'asc' ? { column, order: 'desc' } : null;
}
