import { createContext, useContext } from 'react';

export interface NotificationContextValue {
  unreadCount: number;
  /** Called after any action that plausibly changes the count, not only on a timer. */
  refreshUnreadCount: () => void;
  /**
   * Fires when a notification arrives on the live stream. Returns the unsubscribe.
   * The bell uses it to refresh a dropdown the user already has open.
   */
  subscribe: (listener: () => void) => () => void;
}

export const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotificationCenter(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (context === null) {
    throw new Error('useNotificationCenter must be used inside NotificationProvider');
  }
  return context;
}
