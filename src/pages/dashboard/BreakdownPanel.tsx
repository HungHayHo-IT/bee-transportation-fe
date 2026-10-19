import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  LinearProgress,
  Stack,
  Tab,
  Table,
  TableContainer,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/EmptyState';
import { SectionCard } from '@/components/SectionCard';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { fetchRevenueBreakdown } from '@/services/dashboardService';
import { formatCurrencyVnd } from '@/utils/formatters';
import type {
  BreakdownDimension,
  BreakdownRow,
  DashboardFilters,
} from '@/types/dashboard';

export interface BreakdownPanelProps {
  filters: DashboardFilters;
  /** The caller decides which dimensions the tier allows; this component renders them all the same way. */
  dimensions: readonly BreakdownDimension[];
  onDrill: (dimension: BreakdownDimension, row: BreakdownRow) => void;
  action?: ReactNode;
}

const DIMENSION_LABEL_KEY: Record<BreakdownDimension, string> = {
  service: 'dashboard.dimension.service',
  route: 'dashboard.dimension.route',
  customer: 'dashboard.dimension.customer',
  sale: 'dashboard.dimension.sale',
  department: 'dashboard.dimension.department',
  size: 'dashboard.dimension.size',
};

export function BreakdownPanel({
  filters,
  dimensions,
  onDrill,
  action,
}: BreakdownPanelProps): ReactNode {
  const { t } = useTranslation();
  const [dimension, setDimension] = useState<BreakdownDimension>(dimensions[0] ?? 'service');

  const load = useCallback(
    (): Promise<BreakdownRow[]> => fetchRevenueBreakdown(filters, dimension),
    [dimension, filters],
  );
  const resource = useAsyncResource<BreakdownRow[]>(load, [load]);
  const rows = resource.data ?? [];

  return (
    <SectionCard
      title={t('dashboard.breakdown.title')}
      subtitle={t('dashboard.breakdown.subtitle')}
      action={action}
    >
      <Stack spacing={1.5}>
        <Tabs
          value={dimension}
          onChange={(_event, value: BreakdownDimension) => setDimension(value)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {dimensions.map((value) => (
            <Tab key={value} value={value} label={t(DIMENSION_LABEL_KEY[value])} />
          ))}
        </Tabs>

        {resource.isRefetching ? <LinearProgress /> : null}
        {resource.errorMessage === null ? null : (
          <Alert severity="error" onClose={resource.clearError}>
            {resource.errorMessage}
          </Alert>
        )}

        {rows.length === 0 && !resource.isRefetching ? (
          <EmptyState title={t('dashboard.breakdown.empty')} />
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            {/* Bảng báo cáo rộng hơn màn hình điện thoại. Thiếu khung cuộn này thì
                Paper của thẻ cắt mất cột cuối và không cách nào xem tới. */}
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t(DIMENSION_LABEL_KEY[dimension])}</TableCell>
                  <TableCell align="right">{t('dashboard.breakdown.orderCount')}</TableCell>
                  <TableCell align="right">{t('dashboard.breakdown.revenue')}</TableCell>
                  <TableCell align="right">{t('dashboard.breakdown.avgValue')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={`${dimension}-${row.key}`}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => onDrill(dimension, row)}
                  >
                    <TableCell>{row.label}</TableCell>
                    <TableCell align="right">{row.orderCount}</TableCell>
                    <TableCell align="right">{formatCurrencyVnd(row.revenue)}</TableCell>
                    <TableCell align="right">{formatCurrencyVnd(row.avgValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Stack>
    </SectionCard>
  );
}
