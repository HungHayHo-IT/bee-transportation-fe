import {
  CANCELLABLE_STATUSES,
  CLOSABLE_STATUSES,
  OrderStatus,
} from '@/constants/orderStatus';

/**
 * The lifecycle moves itself through business actions, not a status setter — so a
 * Kanban card can only be dragged onto a column that a real, guarded action
 * reaches: closing, rejecting or cancelling. Every other drop snaps back.
 */
export type KanbanAction = 'close' | 'reject' | 'cancel';

interface ActionColumn {
  action: KanbanAction;
  from: readonly OrderStatus[];
}

/** Which target column maps to which action, and the states it is legal from. */
const ACTION_BY_COLUMN: Partial<Record<OrderStatus, ActionColumn>> = {
  [OrderStatus.Closed]: { action: 'close', from: CLOSABLE_STATUSES },
  // Không còn cột "Khách từ chối" để thả vào: đường đó nay kết thúc ở 'cancelled'
  // như mọi đơn huỷ. Thao tác "Khách từ chối" vẫn còn ở thanh hành động trong
  // chi tiết đơn, nơi người dùng chọn được lý do.
  [OrderStatus.Cancelled]: { action: 'cancel', from: CANCELLABLE_STATUSES },
};

/** A column is a drop target only when it stands for one of the three actions. */
export function isKanbanActionColumn(status: OrderStatus): boolean {
  return status in ACTION_BY_COLUMN;
}

/**
 * The action a drag from `fromStatus` onto `toStatus` should trigger, or `null`
 * when the move is not one a user performs by hand (it happens on its own, or the
 * order's state does not allow it). A `null` result means "snap back".
 */
export function resolveKanbanAction(
  fromStatus: OrderStatus,
  toStatus: OrderStatus,
): KanbanAction | null {
  if (fromStatus === toStatus) return null;
  const column = ACTION_BY_COLUMN[toStatus];
  if (column === undefined) return null;
  return column.from.includes(fromStatus) ? column.action : null;
}
