import apiClient from './apiClient';
import { ORDER_ENDPOINTS, QUOTE_ENDPOINTS } from './apiEndpoints';
import type { ApiPage } from './pageAdapter';
import { adaptOrderSummary } from './orderService';
import type { DepartmentState, OrderStatus } from '@/constants/orderStatus';
import type { QueueItem } from '@/types/queue';
import type { OrderSummary } from '@/types/order';

interface ApiQueueItem {
  orderId: number;
  code: string;
  serviceName: string;
  customerName: string | null;
  originProvince: string | null;
  destinationProvince: string | null;
  state: string;
  orderStatus: string;
  assigneeName: string | null;
  assigneeId?: number | null;
  distributedAt: string;
  slaLate: boolean;
  participatingDeptIds?: number[];
}

function adaptQueueItem(api: ApiQueueItem): QueueItem {
  return {
    orderId: api.orderId,
    code: api.code,
    serviceName: api.serviceName,
    customerName: api.customerName,
    originProvince: api.originProvince,
    destinationProvince: api.destinationProvince,
    state: api.state as DepartmentState,
    orderStatus: api.orderStatus as OrderStatus,
    assigneeName: api.assigneeName,
    assigneeId: api.assigneeId ?? null,
    distributedAt: api.distributedAt,
    slaLate: api.slaLate,
    participatingDeptIds: api.participatingDeptIds ?? [],
  };
}

/** The queue answers with one full page, so the screen works on the rows. */
export interface QueuePage {
  items: QueueItem[];
  /** Total matching rows on the server, which can exceed `items` — see below. */
  total: number;
}

/**
 * `total` is carried through rather than dropped. The endpoint returns at most
 * 200 rows per page, and this screen asks for one page. Once a department holds
 * more than that, the oldest orders fall off the list — and without `total` the
 * screen would report the truncated count as if it were the whole queue, so
 * nobody would ever find out.
 */
export async function fetchQueue(): Promise<QueuePage> {
  const response = await apiClient.get<ApiPage<ApiQueueItem>>(QUOTE_ENDPOINTS.QUEUE);
  return { items: response.data.items.map(adaptQueueItem), total: response.data.total };
}

export async function claimOrder(orderId: number, departmentId: number): Promise<void> {
  await apiClient.post(QUOTE_ENDPOINTS.CLAIM(orderId, departmentId));
}

export async function assignOrder(
  orderId: number,
  departmentId: number,
  assigneeId: number,
): Promise<void> {
  await apiClient.post(QUOTE_ENDPOINTS.ASSIGN(orderId, departmentId), { assigneeId });
}

/** The backend rejects an empty reason, so the dialog must enforce one. */
export async function passOrder(
  orderId: number,
  departmentId: number,
  reason: string,
): Promise<void> {
  await apiClient.post(QUOTE_ENDPOINTS.PASS(orderId, departmentId), { reason });
}

export async function fetchUnroutedOrders(): Promise<OrderSummary[]> {
  const response = await apiClient.get<ApiPage<Parameters<typeof adaptOrderSummary>[0]>>(
    ORDER_ENDPOINTS.UNROUTED,
  );
  return response.data.items.map(adaptOrderSummary);
}

export async function addDepartmentToOrder(
  orderId: number,
  departmentId: number,
): Promise<void> {
  await apiClient.post(QUOTE_ENDPOINTS.ADD_DEPARTMENT(orderId), { departmentId });
}

/** The backend rejects an empty reason, so the dialog must enforce one. */
export async function transferOrder(
  orderId: number,
  departmentId: number,
  toDepartmentId: number,
  reason: string,
): Promise<void> {
  await apiClient.post(QUOTE_ENDPOINTS.TRANSFER(orderId, departmentId), {
    toDepartmentId,
    reason,
  });
}
