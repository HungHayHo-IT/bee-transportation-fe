import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Button,
  FormControlLabel,
  LinearProgress,
  MenuItem,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import { IconFileExport } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { ScopeBadge } from './ScopeBadge';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { usePermissions } from '@/hooks/usePermissions';
import { useCurrentUser } from '@/store/sessionContext';
import { downloadDashboardExport, fetchRevenueSeries } from '@/services/dashboardService';
import { downloadBlobAsFile } from '@/utils/fileDownload';
import { describeError } from '@/services/apiClient';
import type {
  BreakdownDimension,
  DashboardFilters,
  RevenueGrouping,
  RevenuePoint,
} from '@/types/dashboard';
import { BreakdownPanel } from './BreakdownPanel';
import { DashboardFiltersBar } from './DashboardFiltersBar';
import { DrillPanel } from './DrillPanel';
import type { DrillTarget } from './DrillPanel';
import { RevenueChart } from './RevenueChart';
import { resolvePeriodRange } from './revenuePeriod';

const GROUPINGS: readonly RevenueGrouping[] = ['day', 'month', 'quarter'];

function findGrouping(value: string): RevenueGrouping | undefined {
  return GROUPINGS.find((option) => option === value);
}

/**
 * Sale and department slices are a ranking of colleagues, so they belong to the
 * company tier. The backend answers 403 below it — this list only keeps a dead
 * control off the screen.
 */
const COMPANY_DIMENSIONS: readonly BreakdownDimension[] = [
  'service',
  'route',
  'size',
  'customer',
  'sale',
  'department',
];
// 'sale' và 'department' là bảng xếp hạng doanh thu của đồng nghiệp nên backend
// chặn ở tầng công ty; 'size' thì không — nó chỉ nhóm chính đơn của người xem.
const SCOPED_DIMENSIONS: readonly BreakdownDimension[] = ['service', 'route', 'size', 'customer'];

export function RevenueReportPage(): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const { reportTier } = usePermissions();
  const user = useCurrentUser();

  const [filters, setFilters] = useState<DashboardFilters>({});
  const [groupBy, setGroupBy] = useState<RevenueGrouping>('month');
  const [withComparison, setWithComparison] = useState(true);
  const [drillTarget, setDrillTarget] = useState<DrillTarget | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const resource = useAsyncResource<RevenuePoint[]>(
    useCallback(
      () => fetchRevenueSeries(filters, groupBy, withComparison),
      [filters, groupBy, withComparison],
    ),
    [filters, groupBy, withComparison],
  );

  const handleExport = async (): Promise<void> => {
    setIsExporting(true);
    try {
      downloadBlobAsFile(
        await downloadDashboardExport({ ...filters, revenueOnly: true }),
        'beeops-revenue.xlsx',
      );
    } catch (error) {
      enqueueSnackbar(describeError(error), { variant: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const scopeLabel =
    reportTier === 'department'
      ? t('dashboard.scope.department', { department: user?.departmentName ?? '—' })
      : t(reportTier === 'company' ? 'dashboard.scope.company' : 'dashboard.scope.personal');

  return (
    <PageContainer
      title={t('nav.revenueReport')}
      description={t('dashboard.revenue.pageDescription')}
      action={<ScopeBadge scope={reportTier} label={scopeLabel} />}
    >
      <Stack spacing={2}>
        <SectionCard>
          <DashboardFiltersBar filters={filters} onChange={setFilters}>
            <TextField
              select
              label={t('dashboard.filters.groupBy')}
              value={groupBy}
              onChange={(event) => {
                const next = findGrouping(event.target.value);
                if (next !== undefined) setGroupBy(next);
              }}
              sx={{ minWidth: 170 }}
            >
              {GROUPINGS.map((value) => (
                <MenuItem key={value} value={value}>
                  {t(`dashboard.filters.groupBy_${value}`)}
                </MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              control={
                <Switch
                  checked={withComparison}
                  onChange={(event) => setWithComparison(event.target.checked)}
                />
              }
              label={t('dashboard.filters.compare')}
            />
            <Button
              variant="outlined"
              startIcon={<IconFileExport size={18} />}
              disabled={isExporting}
              onClick={() => void handleExport()}
            >
              {t('common.actions.export')}
            </Button>
          </DashboardFiltersBar>
        </SectionCard>

        <SectionCard title={t('dashboard.revenue.title')} subtitle={t('dashboard.revenue.subtitle')}>
          {resource.isRefetching ? <LinearProgress /> : null}
          <RevenueChart
            points={resource.data ?? []}
            groupBy={groupBy}
            onPeriodSelected={(point) =>
              setDrillTarget({
                title: t('dashboard.drill.byPeriod'),
                filters: {
                  ...filters,
                  ...resolvePeriodRange(point.period, groupBy),
                  revenueOnly: true,
                },
              })
            }
          />
        </SectionCard>

        <BreakdownPanel
          filters={filters}
          dimensions={reportTier === 'company' ? COMPANY_DIMENSIONS : SCOPED_DIMENSIONS}
          onDrill={(dimension, row) =>
            setDrillTarget({
              title: row.label,
              filters: { ...filters, dimension, key: row.key, revenueOnly: true },
            })
          }
        />
      </Stack>

      <DrillPanel target={drillTarget} onClose={() => setDrillTarget(null)} />
    </PageContainer>
  );
}
