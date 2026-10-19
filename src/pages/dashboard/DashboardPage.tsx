import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { BeeLoader } from '@/components/BeeLoader';
import { Alert, Box, LinearProgress, Stack } from '@mui/material';
import {
  IconAlarm,
  IconPackages,
  IconTrophy,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { OrderStatus } from '@/constants/orderStatus';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useCurrentUser } from '@/store/sessionContext';
import {
  fetchDashboardSummary,
  fetchFunnel,
  fetchRevenueSeries,
  fetchWinRate,
} from '@/services/dashboardService';
import type {
  DashboardFilters,
  DashboardSummary,
  FunnelStage,
  RevenuePoint,
  WinRateReport,
} from '@/types/dashboard';
import { DashboardFiltersBar } from './DashboardFiltersBar';
import { StaffScorecardSection } from './StaffScorecardSection';
import { DrillPanel } from './DrillPanel';
import type { DrillTarget } from './DrillPanel';
import { FunnelChart } from './FunnelChart';
import { RevenueChart } from './RevenueChart';
import { RevenueHeroCard } from './RevenueHeroCard';
import { ScopeBadge } from './ScopeBadge';
import { StatTile } from './StatTile';
import { WinRateCard } from './WinRateCard';
import { resolvePeriodRange } from './revenuePeriod';

const SCOPE_LABEL_KEY = {
  company: 'dashboard.scope.company',
  department: 'dashboard.scope.department',
  personal: 'dashboard.scope.personal',
} as const;

function formatPercent(value: number | null): string {
  if (value === null) return '—';
  return `${value.toFixed(1).replace('.', ',')}%`;
}

export function DashboardPage(): ReactNode {
  const { t } = useTranslation();
  const user = useCurrentUser();

  const [filters, setFilters] = useState<DashboardFilters>({});
  const [drillTarget, setDrillTarget] = useState<DrillTarget | null>(null);

  const summaryResource = useAsyncResource<DashboardSummary>(
    useCallback(() => fetchDashboardSummary(filters), [filters]),
    [filters],
  );
  const revenueResource = useAsyncResource<RevenuePoint[]>(
    useCallback(() => fetchRevenueSeries(filters, 'month', true), [filters]),
    [filters],
  );
  const funnelResource = useAsyncResource<FunnelStage[]>(
    useCallback(() => fetchFunnel(filters), [filters]),
    [filters],
  );
  const winRateResource = useAsyncResource<WinRateReport>(
    useCallback(() => fetchWinRate(filters), [filters]),
    [filters],
  );

  const summary = summaryResource.data;

  const scopeDescription = useMemo(() => {
    if (summary === null) return '';
    if (summary.scopeLevel === 'department') {
      return t(SCOPE_LABEL_KEY.department, { department: user?.departmentName ?? '—' });
    }
    return t(SCOPE_LABEL_KEY[summary.scopeLevel]);
  }, [summary, t, user]);

  if (summaryResource.isFirstLoad) {
    return (
      <BeeLoader />
    );
  }

  const averageOrderValue =
    summary === null || summary.ordersClosed === 0
      ? null
      : Math.round(summary.revenueThisMonth / summary.ordersClosed);

  return (
    <PageContainer
      title={t('nav.dashboard')}
      description={t('dashboard.description')}
      action={
        summary === null ? null : (
          <ScopeBadge scope={summary.scopeLevel} label={scopeDescription} />
        )
      }
    >
      <Stack spacing={2}>
        <SectionCard>
          <DashboardFiltersBar filters={filters} onChange={setFilters} />
        </SectionCard>

        {summaryResource.errorMessage === null ? null : (
          <Alert severity="error" onClose={summaryResource.clearError}>
            {summaryResource.errorMessage}
          </Alert>
        )}

        {summary === null ? null : (
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              // The revenue card owns half the row on a wide screen; the three
              // supporting figures share the other half.
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(6, minmax(0, 1fr))',
              },
            }}
          >
            <Box sx={{ gridColumn: { xs: 'auto', sm: 'span 2', lg: 'span 3' } }}>
              <RevenueHeroCard
                amount={summary.revenueThisMonth}
                previousAmount={summary.revenuePrevMonth}
                closedCount={summary.ordersClosed}
                averageValue={averageOrderValue}
                onOpenBreakdown={() =>
                  setDrillTarget({
                    title: t('dashboard.tiles.revenueThisMonth'),
                    filters: { ...filters, revenueOnly: true },
                  })
                }
              />
            </Box>
            <StatTile
              label={t('dashboard.tiles.ordersInRange')}
              value={String(summary.ordersInRange)}
              hint={t('dashboard.tiles.ordersClosed', { count: summary.ordersClosed })}
              icon={<IconPackages size={20} stroke={1.7} />}
            />
            <StatTile
              label={t('dashboard.tiles.winRate')}
              value={formatPercent(summary.winRate)}
              hint={t('dashboard.tiles.decided', { count: summary.ordersDecided })}
              icon={<IconTrophy size={20} stroke={1.7} />}
              intent="success"
            />
            <StatTile
              label={t('dashboard.tiles.slaLate')}
              value={String(summary.slaLateCount)}
              hint={t('dashboard.tiles.slaLateHint')}
              icon={<IconAlarm size={20} stroke={1.7} />}
              intent={summary.slaLateCount > 0 ? 'warning' : 'default'}
            />
          </Box>
        )}

        <SectionCard title={t('dashboard.revenue.title')} subtitle={t('dashboard.revenue.subtitle')}>
          {revenueResource.isRefetching ? <LinearProgress /> : null}
          <RevenueChart
            points={revenueResource.data ?? []}
            groupBy="month"
            onPeriodSelected={(point) =>
              setDrillTarget({
                title: t('dashboard.drill.byPeriod'),
                filters: { ...filters, ...resolvePeriodRange(point.period, 'month'), revenueOnly: true },
              })
            }
          />
        </SectionCard>

        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="stretch">
          <Stack sx={{ flex: 1 }}>
            <SectionCard title={t('dashboard.funnel.title')} subtitle={t('dashboard.funnel.subtitle')}>
              {funnelResource.isRefetching ? <LinearProgress /> : null}
              <FunnelChart
                stages={funnelResource.data ?? []}
                onStageSelected={(stage) =>
                  setDrillTarget({
                    title: stage.label,
                    filters: { ...filters, status: stage.status },
                  })
                }
              />
            </SectionCard>
          </Stack>
          <Stack sx={{ flex: 1 }}>
            <SectionCard title={t('dashboard.winRate.title')} subtitle={t('dashboard.winRate.subtitle')}>
              {winRateResource.data === null ? null : (
                <WinRateCard
                  report={winRateResource.data}
                  onReasonSelected={(reason) =>
                    setDrillTarget({
                      title: reason,
                      // 'rejected' khong con; khach che gia nay ve 'cancelled'.
                      filters: { ...filters, status: OrderStatus.Cancelled },
                    })
                  }
                />
              )}
            </SectionCard>
          </Stack>
        </Stack>
      </Stack>

      {/* Đánh giá nhân viên đứng CUỐI bảng điều khiển: nó là bảng đọc kỹ, không
          phải con số liếc một cái. Mấy thẻ số và biểu đồ doanh thu ở trên mới
          là thứ người mở bảng điều khiển cần thấy ngay. Dùng chung bộ lọc thời
          gian với cả trang — hai bộ lọc trên một trang thì không ai biết con số
          nào đang theo cái nào. */}
      <StaffScorecardSection fromDate={filters.fromDate} toDate={filters.toDate} />

      <DrillPanel target={drillTarget} onClose={() => setDrillTarget(null)} />
    </PageContainer>
  );
}
