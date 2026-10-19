/**
 * Every list endpoint answers with this envelope. Six of them used to return a
 * plain array; the backend unified the shape on 23/08/2026 (QA-05), so a screen
 * no longer has to remember which contract a resource follows.
 *
 * Small catalogues (departments, services, the department queue) answer with a
 * single full page rather than pretending to have more.
 */
export interface Page<TItem> {
  items: TItem[];
  total: number;
  page: number;
  limit: number;
}

/** Paging parameters accepted by every list endpoint. */
export interface PageParams {
  page?: number;
  limit?: number;
}
