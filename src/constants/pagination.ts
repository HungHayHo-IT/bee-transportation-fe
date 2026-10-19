export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const SEARCH_DEBOUNCE_MS = 350;

/** Kanban columns are capped by the backend; the cap is shown to the user. */
export const KANBAN_COLUMN_LIMIT = 50;

/**
 * A drill-down asks for at most this many orders. The backend would otherwise
 * answer up to 500 rows in one array, and a chart element can cover far more.
 */
export const DRILL_ROW_LIMIT = 200;

/**
 * The comment thread and the order timeline are really paginated, and the backend
 * caps a page at 100. Both tabs read one page of that size and say so when `total`
 * exceeds it, rather than showing a truncated list as if it were the whole thing.
 */
export const THREAD_PAGE_LIMIT = 100;
