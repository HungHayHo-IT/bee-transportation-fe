import type { DepartmentState, OrderStatus } from '@/constants/orderStatus';

export interface QueueItem {
  orderId: number;
  code: string;
  serviceName: string;
  customerName: string | null;
  originProvince: string | null;
  destinationProvince: string | null;
  state: DepartmentState;
  /** The ORDER's status, not the department's: a cancelled order keeps state `pending`. */
  orderStatus: OrderStatus;
  assigneeName: string | null;
  /** Người phụ trách nhập báo giá. */
  assigneeId?: number | null;
  distributedAt: string;
  /** Computed by the backend against the service SLA; never recomputed here. */
  slaLate: boolean;
  /** Departments already on this order; the transfer dialog excludes them. */
  participatingDeptIds: number[];
}
