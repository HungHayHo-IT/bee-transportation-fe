import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import type { VariantType } from 'notistack';
import { fetchUnreadCount } from '@/services/notificationService';
import { openNotificationStream } from '@/services/notificationStream';
import type { StreamNotification, StreamStatus } from '@/services/notificationStream';
import {
  describeNotificationType,
  findNotificationTargetTab,
} from '@/constants/notificationTypes';
import type { NotificationIntent } from '@/constants/notificationTypes';
import { buildOrderDetailPath, RoutePath } from '@/routes/routePaths';
import { setUnreadBadge } from '@/utils/documentTitle';
import { NotificationContext } from './notificationContext';
import type { NotificationContextValue } from './notificationContext';

export interface NotificationProviderProps {
  children: ReactNode;
}

/**
 * While the live stream is up the timer is only a safety net against a missed
 * event; when the stream is down it is the whole mechanism, so it runs hard.
 */
const POLL_WHEN_LIVE_MS = 300_000;
const POLL_WHEN_FALLBACK_MS = 5_000;

/** The inbox's colour intent, mapped to a notistack toast variant. */
const INTENT_VARIANT: Record<NotificationIntent, VariantType> = {
  default: 'default',
  primary: 'info',
  success: 'success',
  warning: 'warning',
  error: 'error',
};

function targetOf(notification: StreamNotification): string {
  if (notification.orderId === null) return RoutePath.Notifications;
  const tab = findNotificationTargetTab(notification.type);
  const base = buildOrderDetailPath(notification.orderId);
  return tab === undefined ? base : `${base}?tab=${tab}`;
}

/**
 * The badge count is the only piece of notification state shared across screens, so
 * it lives here: the inbox marking everything read must update the bell at once.
 *
 * Delivery is a live SSE stream with a polling fallback — see notificationStream.
 * A live event also raises a toast so an arrival is seen, not only counted.
 */
export function NotificationProvider({ children }: NotificationProviderProps): ReactNode {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const [unreadCount, setUnreadCount] = useState(0);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('fallback');

  // Subscribers (the bell) re-read their own list when something arrives. A ref, not
  // state: adding a listener must never re-render the whole tree.
  const listeners = useRef(new Set<() => void>());

  const refreshUnreadCount = useCallback((): void => {
    fetchUnreadCount()
      .then(setUnreadCount)
      // A missing badge count must never break the screen behind it.
      .catch(() => setUnreadCount((current) => current));
  }, []);

  const subscribe = useCallback((listener: () => void): (() => void) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const showArrival = useCallback(
    (notification: StreamNotification): void => {
      const variant = INTENT_VARIANT[describeNotificationType(notification.type).intent];
      const target = targetOf(notification);
      enqueueSnackbar(notification.title, {
        variant,
        // Longer than the app default: an actionable toast needs time to be read
        // and clicked before it slides away.
        autoHideDuration: 8000,
        action: (key) => (
          <Button
            color="inherit"
            size="small"
            onClick={() => {
              closeSnackbar(key);
              navigate(target);
            }}
          >
            {t('notifications.toast.view')}
          </Button>
        ),
      });
    },
    [enqueueSnackbar, closeSnackbar, navigate, t],
  );

  // An arrival always refreshes the count and the open list; when the frame parsed,
  // it also pops a toast.
  const onArrival = useCallback(
    (notification: StreamNotification | null): void => {
      refreshUnreadCount();
      for (const listener of listeners.current) listener();
      if (notification !== null) showArrival(notification);
    },
    [refreshUnreadCount, showArrival],
  );

  // Held in a ref so the stream opens once and never reconnects when the handler's
  // identity changes (language switch, navigation).
  const onArrivalRef = useRef(onArrival);
  useEffect(() => {
    onArrivalRef.current = onArrival;
  }, [onArrival]);

  // The tab title is the only notification surface visible while the tab is in the
  // background, so it follows the count directly.
  useEffect(() => {
    setUnreadBadge(unreadCount);
    return () => setUnreadBadge(0);
  }, [unreadCount]);

  useEffect(() => {
    const handle = openNotificationStream({
      onNotification: (notification) => onArrivalRef.current(notification),
      onStatusChange: setStreamStatus,
    });
    return () => handle.close();
  }, []);

  useEffect(() => {
    refreshUnreadCount();
    const refreshIfVisible = (): void => {
      if (document.visibilityState === 'visible') refreshUnreadCount();
    };
    const period = streamStatus === 'live' ? POLL_WHEN_LIVE_MS : POLL_WHEN_FALLBACK_MS;
    const timer = window.setInterval(refreshIfVisible, period);
    window.addEventListener('focus', refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshIfVisible);
    };
  }, [refreshUnreadCount, streamStatus]);

  const value = useMemo<NotificationContextValue>(
    () => ({ unreadCount, refreshUnreadCount, subscribe }),
    [refreshUnreadCount, subscribe, unreadCount],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
