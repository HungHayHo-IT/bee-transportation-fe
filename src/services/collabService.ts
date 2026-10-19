import apiClient from './apiClient';
import { COLLABORATION_ENDPOINTS } from './apiEndpoints';
import { adaptOrderFile } from './orderService';
import { adaptPage } from './pageAdapter';
import type { ApiPage } from './pageAdapter';
import { THREAD_PAGE_LIMIT } from '@/constants/pagination';
import type { MentionableUser, OrderComment, OrderFile } from '@/types/order';
import type { Page } from '@/types/pagination';

/**
 * A thread is genuinely paginated, not a catalogue with a natural ceiling: the
 * backend defaults to 20 per page and caps a page at 100. Ask for the cap in one
 * request and carry `total` back, so the tab can say what it is not showing.
 */
export async function fetchComments(orderId: number): Promise<Page<OrderComment>> {
  const response = await apiClient.get<ApiPage<OrderComment>>(
    COLLABORATION_ENDPOINTS.COMMENTS(orderId),
    { params: { limit: THREAD_PAGE_LIMIT } },
  );
  return adaptPage(response.data, (comment) => comment);
}

/** Who the caller may @mention, already filtered to the thread they write into. */
export async function fetchMentionables(orderId: number): Promise<MentionableUser[]> {
  const response = await apiClient.get<ApiPage<MentionableUser>>(
    COLLABORATION_ENDPOINTS.MENTIONABLES(orderId),
  );
  return response.data.items;
}

/**
 * The response is the thread's last page, not the one comment just written. The
 * caller refetches the thread it is showing anyway, so the body is dropped rather
 * than half-adapted into something shaped like the new comment.
 */
export async function postComment(
  orderId: number,
  body: string,
  options: { departmentId?: number; mentions?: number[] } = {},
): Promise<void> {
  await apiClient.post(COLLABORATION_ENDPOINTS.COMMENTS(orderId), {
    body,
    ...(options.departmentId === undefined ? {} : { departmentId: options.departmentId }),
    ...(options.mentions === undefined || options.mentions.length === 0
      ? {}
      : { mentions: options.mentions }),
  });
}

export async function fetchOrderFiles(orderId: number): Promise<OrderFile[]> {
  const response = await apiClient.get<ApiPage<Parameters<typeof adaptOrderFile>[0]>>(
    COLLABORATION_ENDPOINTS.FILES(orderId),
  );
  return response.data.items.map(adaptOrderFile);
}

/**
 * Files are streamed through an authorised endpoint, never served statically, so
 * downloading means fetching a blob and handing it to the browser.
 */
export async function downloadOrderFile(orderId: number, file: OrderFile): Promise<void> {
  const response = await apiClient.get<Blob>(
    COLLABORATION_ENDPOINTS.FILE_DOWNLOAD(orderId, file.id),
    { responseType: 'blob' },
  );
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
}

export async function deleteOrderFile(orderId: number, fileId: string): Promise<void> {
  await apiClient.delete(COLLABORATION_ENDPOINTS.FILE_DELETE(orderId, fileId));
}
