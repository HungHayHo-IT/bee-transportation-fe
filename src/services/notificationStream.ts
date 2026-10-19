import { NOTIFICATION_ENDPOINTS } from './apiEndpoints';

/**
 * Live notification transport.
 *
 * The API is reached through a proxy rewrite in production, and a proxy is free to
 * buffer or drop `text/event-stream`. So the stream is treated as an optimisation,
 * never as the only path: after a few consecutive failures this reports `fallback`
 * and the caller polls instead, while a slow timer keeps trying to get back.
 */
export type StreamStatus = 'live' | 'fallback';

/** Consecutive drops before giving up. One retry is a network blip; three is a wall. */
const FAILURES_BEFORE_FALLBACK = 3;
const RETRY_AFTER_FALLBACK_MS = 60_000;

/**
 * What a live event carries, mirroring the backend's `NotificationEvents.streamFor`
 * frame. It is enough to raise a toast, but never the source of truth — the caller
 * still refetches the unread count and the list. `null` when the frame could not be
 * parsed: the arrival still counts, only the toast is skipped.
 */
export interface StreamNotification {
  type: string;
  title: string;
  orderId: number | null;
}

export interface StreamHandlers {
  /** A notification arrived. The payload is a hint; the caller refetches the truth. */
  onNotification: (notification: StreamNotification | null) => void;
  onStatusChange: (status: StreamStatus) => void;
}

export interface StreamHandle {
  close: () => void;
}

function parseStreamNotification(raw: string): StreamNotification | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const record: Record<string, unknown> = { ...parsed };
  const { type, title, orderId } = record;
  if (typeof type !== 'string' || typeof title !== 'string') return null;
  if (orderId !== null && orderId !== undefined && typeof orderId !== 'number') return null;
  return { type, title, orderId: typeof orderId === 'number' ? orderId : null };
}

/**
 * `EventSource` reconnects on its own, so this counts drops rather than reconnecting
 * by hand — and only tears the connection down once the drops look permanent.
 */
export function openNotificationStream(handlers: StreamHandlers): StreamHandle {
  let source: EventSource | null = null;
  let retryTimer: number | null = null;
  let failures = 0;
  let closed = false;

  const connect = (): void => {
    if (closed) return;
    // withCredentials sends the httpOnly session cookie; without it the stream 401s.
    const es = new EventSource(NOTIFICATION_ENDPOINTS.STREAM, { withCredentials: true });
    source = es;

    es.onopen = () => {
      failures = 0;
      handlers.onStatusChange('live');
    };

    // Heartbeats arrive as a named `ping` event and never reach this handler, which
    // is what keeps them from triggering a refetch every 25 seconds.
    es.onmessage = (event: MessageEvent<string>) => {
      handlers.onNotification(parseStreamNotification(event.data));
    };

    es.onerror = () => {
      failures += 1;
      if (failures < FAILURES_BEFORE_FALLBACK) return; // let EventSource retry itself
      es.close();
      source = null;
      handlers.onStatusChange('fallback');
      retryTimer = window.setTimeout(() => {
        failures = 0;
        connect();
      }, RETRY_AFTER_FALLBACK_MS);
    };
  };

  connect();

  return {
    close: () => {
      closed = true;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      source?.close();
      source = null;
    },
  };
}
