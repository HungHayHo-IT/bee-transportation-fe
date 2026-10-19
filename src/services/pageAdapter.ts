import type { Page } from '@/types/pagination';

/** The wire shape of every list response. */
export interface ApiPage<TApiItem> {
  items: TApiItem[];
  total: number;
  page: number;
  limit: number;
}

/** Maps the items of a page and carries the counters through unchanged. */
export function adaptPage<TApiItem, TItem>(
  api: ApiPage<TApiItem>,
  adaptItem: (item: TApiItem) => TItem,
): Page<TItem> {
  return {
    items: api.items.map(adaptItem),
    total: api.total,
    page: api.page,
    limit: api.limit,
  };
}
