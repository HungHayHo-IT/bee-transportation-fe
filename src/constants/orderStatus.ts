/**
 * Bảy trạng thái, khớp đúng enum OrderStatus của backend (migration 023).
 * Bốn cái đã bỏ: in_progress, completed, rejected, awaiting_customer.
 */
export const OrderStatus = {
  AwaitingInfo: 'awaiting_info',
  New: 'new',
  Distributed: 'distributed',
  Quoting: 'quoting',
  /** Nhãn "Chờ chốt giá" — gồm cả chờ sale chọn lẫn chờ khách xác nhận. */
  AwaitingSelection: 'awaiting_selection',
  Closed: 'closed',
  Cancelled: 'cancelled',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

/** Thứ tự vòng đời, dùng cho bảng Kanban và bộ lọc trạng thái. */
export const ORDER_STATUS_SEQUENCE: readonly OrderStatus[] = [
  OrderStatus.AwaitingInfo,
  OrderStatus.New,
  OrderStatus.Distributed,
  OrderStatus.Quoting,
  OrderStatus.AwaitingSelection,
  OrderStatus.Closed,
  OrderStatus.Cancelled,
];

export function findOrderStatus(value: string): OrderStatus | undefined {
  return ORDER_STATUS_SEQUENCE.find((status) => status === value);
}

export const ORDER_STATUS_LABEL_KEY: Record<OrderStatus, string> = {
  [OrderStatus.AwaitingInfo]: 'orderStatus.awaitingInfo',
  [OrderStatus.New]: 'orderStatus.new',
  [OrderStatus.Distributed]: 'orderStatus.distributed',
  [OrderStatus.Quoting]: 'orderStatus.quoting',
  [OrderStatus.AwaitingSelection]: 'orderStatus.awaitingSelection',
  [OrderStatus.Closed]: 'orderStatus.closed',
  [OrderStatus.Cancelled]: 'orderStatus.cancelled',
};

/**
 * Soi đúng máy trạng thái ở `orders/order-state.helper.ts` bên backend để không
 * mời người dùng bấm một nút chắc chắn trả về 409. Backend vẫn là nơi quyết định.
 */
export const CLOSABLE_STATUSES: readonly OrderStatus[] = [OrderStatus.AwaitingSelection];

/**
 * "Khách từ chối" giờ đưa đơn về 'cancelled' chứ không còn trạng thái riêng, nhưng
 * thao tác vẫn giữ: nó ghi lý do khách chê giá, và win rate đếm đơn huỷ-đã-báo-giá
 * vào mẫu số.
 */
export const REJECTABLE_STATUSES: readonly OrderStatus[] = [
  OrderStatus.Distributed,
  OrderStatus.Quoting,
  OrderStatus.AwaitingSelection,
];

/** Huỷ được từ mọi nơi trừ chính trạng thái đã huỷ. */
export const CANCELLABLE_STATUSES: readonly OrderStatus[] = [
  OrderStatus.AwaitingInfo,
  OrderStatus.New,
  OrderStatus.Distributed,
  OrderStatus.Quoting,
  OrderStatus.AwaitingSelection,
  OrderStatus.Closed,
];

/**
 * Soi `DEPT_WORKABLE` bên backend. Ra khỏi tập này — đã chốt hoặc đã huỷ — là
 * phòng ban hết nhận, gán, bỏ qua được, nên hàng đợi phải thôi mời các thao tác đó.
 */
export const DEPT_WORKABLE_STATUSES: readonly OrderStatus[] = [
  OrderStatus.New,
  OrderStatus.Distributed,
  OrderStatus.Quoting,
  OrderStatus.AwaitingSelection,
];

export function isDeptWorkable(status: OrderStatus): boolean {
  return DEPT_WORKABLE_STATUSES.includes(status);
}

export const DepartmentState = {
  Pending: 'pending',
  Claimed: 'claimed',
  Quoted: 'quoted',
  Passed: 'passed',
  Won: 'won',
  Lost: 'lost',
} as const;

export type DepartmentState = (typeof DepartmentState)[keyof typeof DepartmentState];

export const DEPARTMENT_STATE_LABEL_KEY: Record<DepartmentState, string> = {
  [DepartmentState.Pending]: 'departmentState.pending',
  [DepartmentState.Claimed]: 'departmentState.claimed',
  [DepartmentState.Quoted]: 'departmentState.quoted',
  [DepartmentState.Passed]: 'departmentState.passed',
  [DepartmentState.Won]: 'departmentState.won',
  [DepartmentState.Lost]: 'departmentState.lost',
};

export const MilestoneStatus = {
  Pending: 'pending',
  Done: 'done',
  Skipped: 'skipped',
} as const;

export type MilestoneStatus = (typeof MilestoneStatus)[keyof typeof MilestoneStatus];
