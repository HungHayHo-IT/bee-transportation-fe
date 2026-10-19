import type { OrderStatus } from '@/constants/orderStatus';

/** The backend resolves the tier from the caller's roles; the UI only labels it. */
export type ReportScopeLevel = 'company' | 'department' | 'personal';

export type RevenueGrouping = 'day' | 'month' | 'quarter';

export type BreakdownDimension =
  | 'service'
  | 'route'
  | 'customer'
  | 'sale'
  | 'department'
  /** Nhóm theo khối lượng — mốc chia do backend định nghĩa, nhãn lấy từ phản hồi. */
  | 'size';

export interface DashboardFilters {
  fromDate?: string;
  toDate?: string;
  departmentId?: number;
  userId?: number;
}

export interface DashboardSummary {
  scopeLevel: ReportScopeLevel;
  revenueThisMonth: number;
  revenuePrevMonth: number;
  ordersInRange: number;
  ordersClosed: number;
  ordersDecided: number;
  /** Null when no order has been decided yet — never render it as 0%. */
  winRate: number | null;
  slaLateCount: number;
}

/**
 * `period` is an instant at local midnight of the bucket, not a plain date, so it
 * must be formatted in the viewer's timezone rather than sliced as a string.
 */
export interface RevenuePoint {
  period: string;
  orderCount: number;
  revenue: number;
  avgValue: number;
  prevRevenue: number | null;
}

export interface BreakdownRow {
  key: string;
  label: string;
  orderCount: number;
  revenue: number;
  avgValue: number;
}

export interface FunnelStage {
  status: OrderStatus;
  label: string;
  orderCount: number;
}

export interface RejectReasonCount {
  reason: string;
  count: number;
}

export interface WinRateReport {
  won: number;
  rejected: number;
  decided: number;
  /** Null while nothing has been decided; a 0% win rate would be a lie. */
  winRate: number | null;
  reasons: RejectReasonCount[];
}

export interface ResponseTimeRow {
  departmentId: number;
  departmentName: string;
  hoursToClaim: number | null;
  hoursToFirstQuote: number | null;
  lateCount: number;
}

export interface CompetitionRow {
  departmentId: number;
  departmentName: string;
  participated: number;
  won: number;
  passed: number;
  quoteWinRate: number | null;
}

export interface WorkloadRow {
  id: number;
  name: string;
  orderCount: number;
  openCount: number;
}

export interface WorkloadReport {
  byDepartment: WorkloadRow[];
  byUser: WorkloadRow[];
}

export interface DrillFilters extends DashboardFilters {
  status?: OrderStatus;
  dimension?: BreakdownDimension;
  key?: string;
  revenueOnly?: boolean;
}
