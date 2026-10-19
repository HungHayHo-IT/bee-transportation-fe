import {
  IconAlertTriangle,
  IconAt,
  IconBan,
  IconCircleCheck,
  IconClockExclamation,
  IconFileInvoice,
  IconInbox,
  IconProgressCheck,
  IconRefreshDot,
  IconThumbDown,
  IconTrophy,
  IconUserCheck,
  IconX,
} from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import type { OrderDetailTab } from './orderDetailTabs';

/** Mirrors `NotifType` in the backend; unknown types still render with a neutral fallback. */
export const NOTIFICATION_TYPES = [
  'new_order',
  'assigned',
  'quote_received',
  'all_passed',
  'revision_requested',
  'quote_won',
  'quote_lost',
  'order_closed',
  'order_rejected',
  'order_cancelled',
  'milestone_updated',
  'sla_late',
  'quote_expired',
  'mention',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationIntent = 'default' | 'primary' | 'success' | 'warning' | 'error';

export interface NotificationTypeDescriptor {
  icon: Icon;
  intent: NotificationIntent;
  labelKey: string;
}

/**
 * The single registry every notification surface reads — bell, inbox, e-mail
 * preferences. No screen may switch on the type itself.
 */
export const NOTIFICATION_TYPE_REGISTRY: Record<NotificationType, NotificationTypeDescriptor> = {
  new_order: { icon: IconInbox, intent: 'primary', labelKey: 'notifications.type.newOrder' },
  assigned: { icon: IconUserCheck, intent: 'primary', labelKey: 'notifications.type.assigned' },
  quote_received: {
    icon: IconFileInvoice,
    intent: 'primary',
    labelKey: 'notifications.type.quoteReceived',
  },
  all_passed: {
    icon: IconAlertTriangle,
    intent: 'warning',
    labelKey: 'notifications.type.allPassed',
  },
  revision_requested: {
    icon: IconRefreshDot,
    intent: 'warning',
    labelKey: 'notifications.type.revisionRequested',
  },
  quote_won: { icon: IconTrophy, intent: 'success', labelKey: 'notifications.type.quoteWon' },
  quote_lost: { icon: IconX, intent: 'default', labelKey: 'notifications.type.quoteLost' },
  order_closed: {
    icon: IconCircleCheck,
    intent: 'success',
    labelKey: 'notifications.type.orderClosed',
  },
  order_rejected: {
    icon: IconThumbDown,
    intent: 'warning',
    labelKey: 'notifications.type.orderRejected',
  },
  order_cancelled: { icon: IconBan, intent: 'error', labelKey: 'notifications.type.orderCancelled' },
  milestone_updated: {
    icon: IconProgressCheck,
    intent: 'success',
    labelKey: 'notifications.type.milestoneUpdated',
  },
  sla_late: {
    icon: IconClockExclamation,
    intent: 'error',
    labelKey: 'notifications.type.slaLate',
  },
  quote_expired: {
    icon: IconClockExclamation,
    intent: 'warning',
    labelKey: 'notifications.type.quoteExpired',
  },
  mention: { icon: IconAt, intent: 'primary', labelKey: 'notifications.type.mention' },
};

const FALLBACK_DESCRIPTOR: NotificationTypeDescriptor = {
  icon: IconInbox,
  intent: 'default',
  labelKey: 'notifications.type.unknown',
};

/**
 * Where a notification should land. A notification about a quote is useless if it
 * opens the overview tab, so the type decides the tab the order opens on.
 */
const NOTIFICATION_TARGET_TAB: Partial<Record<NotificationType, OrderDetailTab>> = {
  new_order: 'departments',
  assigned: 'departments',
  quote_received: 'departments',
  all_passed: 'departments',
  revision_requested: 'departments',
  quote_won: 'departments',
  quote_lost: 'departments',
  quote_expired: 'departments',
  order_closed: 'milestones',
  milestone_updated: 'milestones',
  mention: 'discussion',
};

export function findNotificationTargetTab(type: string): OrderDetailTab | undefined {
  const known = findNotificationType(type);
  return known === undefined ? undefined : NOTIFICATION_TARGET_TAB[known];
}

export function findNotificationType(value: string): NotificationType | undefined {
  return NOTIFICATION_TYPES.find((option) => option === value);
}

/** A type the backend adds later must still render, so this never returns undefined. */
export function describeNotificationType(type: string): NotificationTypeDescriptor {
  const known = findNotificationType(type);
  return known === undefined ? FALLBACK_DESCRIPTOR : NOTIFICATION_TYPE_REGISTRY[known];
}
