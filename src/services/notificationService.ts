import apiClient from './apiClient';
import { NOTIFICATION_ENDPOINTS } from './apiEndpoints';
import { adaptPage } from './pageAdapter';
import type { ApiPage } from './pageAdapter';
import type { Page } from '@/types/pagination';
import { findNotificationType } from '@/constants/notificationTypes';
import type { NotificationType } from '@/constants/notificationTypes';
import type { MyTask, NotificationItem, NotificationPreferences } from '@/types/notification';

interface ApiNotification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  orderId: number | null;
  isRead: boolean;
  createdAt: string;
}

function adaptNotification(api: ApiNotification): NotificationItem {
  return {
    id: api.id,
    type: api.type,
    title: api.title,
    body: api.body,
    orderId: api.orderId,
    isRead: api.isRead,
    createdAt: api.createdAt,
  };
}

export interface NotificationFilters {
  isRead?: boolean;
  page?: number;
  limit?: number;
}

export async function fetchNotifications(
  filters: NotificationFilters = {},
): Promise<Page<NotificationItem>> {
  const response = await apiClient.get<ApiPage<ApiNotification>>(NOTIFICATION_ENDPOINTS.LIST, {
    params: filters,
  });
  return adaptPage(response.data, adaptNotification);
}

export async function fetchUnreadCount(): Promise<number> {
  const response = await apiClient.get<{ count: number }>(NOTIFICATION_ENDPOINTS.UNREAD_COUNT);
  return response.data.count;
}

export async function markNotificationsRead(ids: number[]): Promise<void> {
  await apiClient.post(NOTIFICATION_ENDPOINTS.MARK_READ, { ids });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post(NOTIFICATION_ENDPOINTS.MARK_READ, { all: true });
}

export async function fetchMyTasks(): Promise<MyTask[]> {
  const response = await apiClient.get<ApiPage<MyTask>>(NOTIFICATION_ENDPOINTS.MY_TASKS);
  return response.data.items.map((task) => ({
    orderId: task.orderId,
    code: task.code,
    reason: task.reason,
    since: task.since,
  }));
}

export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  const response = await apiClient.get<{ emailOff: string[] }>(NOTIFICATION_ENDPOINTS.PREFERENCES);
  // An unknown type in the stored array is dropped rather than rendered as a dead switch.
  const known = response.data.emailOff
    .map(findNotificationType)
    .filter((type): type is NotificationType => type !== undefined);
  return { emailOff: known };
}

export async function saveNotificationPreferences(
  emailOff: NotificationType[],
): Promise<void> {
  await apiClient.put(NOTIFICATION_ENDPOINTS.PREFERENCES, { emailOff });
}
