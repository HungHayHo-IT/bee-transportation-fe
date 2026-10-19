import type { NotificationType } from '@/constants/notificationTypes';

export interface NotificationItem {
  id: number;
  /** Kept as a plain string: a type the backend adds later must still render. */
  type: string;
  title: string;
  body: string | null;
  /** Null for notifications that are not about a specific order. */
  orderId: number | null;
  isRead: boolean;
  createdAt: string;
}

/** One thing waiting for the signed-in user; the reason text comes from the backend. */
export interface MyTask {
  orderId: number;
  code: string;
  reason: string;
  since: string;
}

export interface NotificationPreferences {
  /** Event types whose email is switched off. In-app delivery cannot be switched off. */
  emailOff: NotificationType[];
}
