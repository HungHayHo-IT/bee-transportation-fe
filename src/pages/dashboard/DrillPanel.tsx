import { useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Drawer,
  IconButton,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { IconExternalLink, IconX } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DRILL_ROW_LIMIT } from '@/constants/pagination';
import { EmptyState } from '@/components/EmptyState';
import { StatusChip } from '@/components/StatusChip';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { fetchDrillOrders } from '@/services/dashboardService';
import { formatCurrencyVnd, formatDate } from '@/utils/formatters';
import { buildOrderDetailPath, RoutePath } from '@/routes/routePaths';
import type { DrillFilters } from '@/types/dashboard';
import type { OrderSummary } from '@/types/order';

export interface DrillTarget {
  title: string;
  filters: DrillFilters;
}

export interface DrillPanelProps {
  target: DrillTarget | null;
  onClose: () => void;
}

/** Every chart element opens the orders behind it; a chart without this is incomplete. */
export function DrillPanel({ target, onClose }: DrillPanelProps): ReactNode {
  const { t } = useTranslation();

  const load = useCallback((): Promise<OrderSummary[]> => {
    if (target === null) return Promise.resolve([]);
    return fetchDrillOrders(target.filters);
  }, [target]);
  const resource = useAsyncResource<OrderSummary[]>(load, [load]);
  const orders = resource.data ?? [];

  return (
    <Drawer
      anchor="right"
      open={target !== null}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', md: 760 } } } }}
    >
      <Stack sx={{ height: '100%' }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Box>
            <Typography variant="h6">{t('dashboard.drill.title')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {target?.title ?? ''}
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label={t('common.actions.close')}>
            <IconX size={18} />
          </IconButton>
        </Stack>

        {resource.isRefetching ? <LinearProgress /> : null}

        <Box sx={{ flexGrow: 1, overflow: 'auto', px: 3, py: 2 }}>
          {resource.errorMessage === null ? null : (
            <Alert severity="error" sx={{ mb: 2 }}>
              {resource.errorMessage}
            </Alert>
          )}

          {orders.length === 0 && !resource.isRefetching ? (
            <EmptyState title={t('dashboard.drill.empty')} />
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('queue.code')}</TableCell>
                  <TableCell>{t('customers.contactName')}</TableCell>
                  <TableCell>{t('common.table.status')}</TableCell>
                  <TableCell>{t('orders.list.department')}</TableCell>
                  <TableCell align="right">{t('orders.list.value')}</TableCell>
                  <TableCell>{t('orders.detail.closedAt')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>
                      <Link to={buildOrderDetailPath(order.id)}>{order.code}</Link>
                    </TableCell>
                    <TableCell>{order.customerName ?? '—'}</TableCell>
                    <TableCell>
                      <StatusChip status={order.status} />
                    </TableCell>
                    <TableCell>{order.departmentName ?? '—'}</TableCell>
                    <TableCell align="right">{formatCurrencyVnd(order.finalAmount)}</TableCell>
                    <TableCell>{formatDate(order.closedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Box>

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider' }}
        >
          <Typography variant="body2" color="text.secondary">
            {orders.length === DRILL_ROW_LIMIT
              ? t('dashboard.drill.capped', { count: DRILL_ROW_LIMIT })
              : t('common.table.totalRows', { count: orders.length })}
          </Typography>
          <Button
            component={Link}
            to={RoutePath.Orders}
            endIcon={<IconExternalLink size={16} />}
            color="inherit"
          >
            {t('dashboard.drill.openList')}
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}
