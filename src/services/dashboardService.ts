import apiClient from './apiClient';
import { DASHBOARD_ENDPOINTS } from './apiEndpoints';
import { DRILL_ROW_LIMIT } from '@/constants/pagination';
import { adaptOrderSummary } from './orderService';
import type { OrderStatus } from '@/constants/orderStatus';
import type { StaffScorecard } from '@/types/pricing';
import type { OrderSummary } from '@/types/order';
import type { ApiPage } from './pageAdapter';
import type {
  BreakdownDimension,
  BreakdownRow,
  CompetitionRow,
  DashboardFilters,
  DashboardSummary,
  DrillFilters,
  FunnelStage,
  ResponseTimeRow,
  RevenueGrouping,
  RevenuePoint,
  WinRateReport,
  WorkloadReport,
} from '@/types/dashboard';

interface ApiRevenuePoint {
  period: string;
  orderCount: number;
  revenue: number;
  avgValue: number;
  prevRevenue?: number;
}

function adaptRevenuePoint(api: ApiRevenuePoint): RevenuePoint {
  return {
    period: api.period,
    orderCount: api.orderCount,
    revenue: api.revenue,
    avgValue: api.avgValue,
    // The comparison series is present only when `compare` was requested.
    prevRevenue: api.prevRevenue ?? null,
  };
}

export async function fetchDashboardSummary(
  filters: DashboardFilters,
): Promise<DashboardSummary> {
  const response = await apiClient.get<DashboardSummary>(DASHBOARD_ENDPOINTS.SUMMARY, {
    params: filters,
  });
  const api = response.data;
  return {
    scopeLevel: api.scopeLevel,
    revenueThisMonth: api.revenueThisMonth,
    revenuePrevMonth: api.revenuePrevMonth,
    ordersInRange: api.ordersInRange,
    ordersClosed: api.ordersClosed,
    ordersDecided: api.ordersDecided,
    winRate: api.winRate,
    slaLateCount: api.slaLateCount,
  };
}

export async function fetchRevenueSeries(
  filters: DashboardFilters,
  groupBy: RevenueGrouping,
  withComparison: boolean,
): Promise<RevenuePoint[]> {
  const response = await apiClient.get<ApiRevenuePoint[]>(DASHBOARD_ENDPOINTS.REVENUE, {
    params: { ...filters, groupBy, ...(withComparison ? { compare: 'true' } : {}) },
  });
  return response.data.map(adaptRevenuePoint);
}

export async function fetchRevenueBreakdown(
  filters: DashboardFilters,
  dimension: BreakdownDimension,
): Promise<BreakdownRow[]> {
  const response = await apiClient.get<BreakdownRow[]>(DASHBOARD_ENDPOINTS.REVENUE_BY, {
    params: { ...filters, dimension },
  });
  return response.data.map((row) => ({
    key: row.key,
    label: row.label,
    orderCount: row.orderCount,
    revenue: row.revenue,
    avgValue: row.avgValue,
  }));
}

export async function fetchFunnel(filters: DashboardFilters): Promise<FunnelStage[]> {
  const response = await apiClient.get<{ status: string; label: string; orderCount: number }[]>(
    DASHBOARD_ENDPOINTS.FUNNEL,
    { params: filters },
  );
  return response.data.map((stage) => ({
    status: stage.status as OrderStatus,
    label: stage.label,
    orderCount: stage.orderCount,
  }));
}

export async function fetchWinRate(filters: DashboardFilters): Promise<WinRateReport> {
  const response = await apiClient.get<WinRateReport>(DASHBOARD_ENDPOINTS.WIN_RATE, {
    params: filters,
  });
  const api = response.data;
  return {
    won: api.won,
    rejected: api.rejected,
    decided: api.decided,
    winRate: api.winRate,
    reasons: api.reasons.map((row) => ({ reason: row.reason, count: row.count })),
  };
}

export async function fetchResponseTime(filters: DashboardFilters): Promise<ResponseTimeRow[]> {
  const response = await apiClient.get<ResponseTimeRow[]>(DASHBOARD_ENDPOINTS.RESPONSE_TIME, {
    params: filters,
  });
  return response.data.map((row) => ({
    departmentId: row.departmentId,
    departmentName: row.departmentName,
    hoursToClaim: row.hoursToClaim,
    hoursToFirstQuote: row.hoursToFirstQuote,
    lateCount: row.lateCount,
  }));
}

export async function fetchCompetition(filters: DashboardFilters): Promise<CompetitionRow[]> {
  const response = await apiClient.get<CompetitionRow[]>(DASHBOARD_ENDPOINTS.COMPETITION, {
    params: filters,
  });
  return response.data.map((row) => ({
    departmentId: row.departmentId,
    departmentName: row.departmentName,
    participated: row.participated,
    won: row.won,
    passed: row.passed,
    quoteWinRate: row.quoteWinRate,
  }));
}

export async function fetchAverageDepartmentsPerOrder(
  filters: DashboardFilters,
): Promise<number | null> {
  const response = await apiClient.get<{ avgDepartmentsPerOrder: number | null }>(
    DASHBOARD_ENDPOINTS.COMPETITION_AVG_DEPARTMENTS,
    { params: filters },
  );
  return response.data.avgDepartmentsPerOrder;
}

export async function fetchWorkload(filters: DashboardFilters): Promise<WorkloadReport> {
  const response = await apiClient.get<WorkloadReport>(DASHBOARD_ENDPOINTS.WORKLOAD, {
    params: filters,
  });
  const adaptRow = (row: WorkloadReport['byUser'][number]): WorkloadReport['byUser'][number] => ({
    id: row.id,
    name: row.name,
    orderCount: row.orderCount,
    openCount: row.openCount,
  });
  return {
    byDepartment: response.data.byDepartment.map(adaptRow),
    byUser: response.data.byUser.map(adaptRow),
  };
}

/** The orders behind one chart element, scoped exactly as the chart itself was. */
export async function fetchDrillOrders(filters: DrillFilters): Promise<OrderSummary[]> {
  const response = await apiClient.get<ApiPage<Parameters<typeof adaptOrderSummary>[0]>>(
    DASHBOARD_ENDPOINTS.DRILL,
    {
      params: {
        ...filters,
        limit: DRILL_ROW_LIMIT,
        ...(filters.revenueOnly === true ? { revenueOnly: 'true' } : {}),
      },
    },
  );
  return response.data.items.map(adaptOrderSummary);
}

export async function downloadDashboardExport(filters: DrillFilters): Promise<Blob> {
  const response = await apiClient.get<Blob>(DASHBOARD_ENDPOINTS.EXPORT, {
    params: filters,
    responseType: 'blob',
  });
  return response.data;
}


/**
 * Bảng đánh giá nhân viên — đơn, tổng báo giá, doanh thu, tỷ lệ chuyển đổi.
 *
 * Hai bảng riêng cho hai vai: người tạo đơn và người nhập giá. `conversionRate`
 * là `null` khi chưa có đơn nào ra kết quả — KHÁC 0%, và màn hình phải in ra
 * khác nhau, nếu không thì người mới vào trông như người chốt hụt tất cả.
 */
export async function fetchStaffScorecard(
  filters: { fromDate?: string; toDate?: string } = {},
): Promise<StaffScorecard> {
  const response = await apiClient.get<StaffScorecard>(DASHBOARD_ENDPOINTS.STAFF_SCORECARD, {
    params: filters,
  });
  return response.data;
}
