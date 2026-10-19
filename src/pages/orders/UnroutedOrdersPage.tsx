import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  Button,
  MenuItem,
  TableCell,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { IconRoute } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { DataTableShell } from '@/components/DataTableShell';
import { EllipsisCell } from '@/components/EllipsisCell';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { fetchDepartments } from '@/services/organisationService';
import { addDepartmentToOrder, fetchUnroutedOrders } from '@/services/queueService';
import { formatDateTime } from '@/utils/formatters';
import { RoutePath } from '@/routes/routePaths';
import type { Department } from '@/types/organisation';
import type { OrderSummary } from '@/types/order';
import { describeError } from '@/services/apiClient';

interface UnroutedPageData {
  orders: OrderSummary[];
  departments: Department[];
}

async function loadPageData(): Promise<UnroutedPageData> {
  const [orders, departments] = await Promise.all([fetchUnroutedOrders(), fetchDepartments()]);
  return { orders, departments };
}

export function UnroutedOrdersPage(): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const resource = useAsyncResource(loadPageData);

  const [target, setTarget] = useState<OrderSummary | null>(null);
  const [departmentId, setDepartmentId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const orders = resource.data?.orders ?? [];
  // Phòng Sale không tham gia báo giá — backend cũng chặn.
  const departments = (resource.data?.departments ?? []).filter(
    (item) => item.isActive && !item.isSales,
  );

  const handleAssignDepartment = async (): Promise<void> => {
    if (target === null || departmentId === '') return;
    setIsSubmitting(true);
    try {
      await addDepartmentToOrder(target.id, Number(departmentId));
      setTarget(null);
      setDepartmentId('');
      resource.reload();
      enqueueSnackbar(t('unrouted.assigned'), { variant: 'success' });
    } catch (error) {
      enqueueSnackbar(describeError(error), { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageContainer title={t('nav.unroutedOrders')} description={t('unrouted.description')}>
      {orders.length > 0 ? (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button
              component={Link}
              to={RoutePath.AdminRouting}
              size="small"
              color="inherit"
              startIcon={<IconRoute size={16} />}
            >
              {t('unrouted.openMatrix')}
            </Button>
          }
        >
          {t('unrouted.warning', { count: orders.length })}
        </Alert>
      ) : null}

      <SectionCard disableContentPadding>
        <DataTableShell
          isFirstLoad={resource.isFirstLoad}
          isRefetching={resource.isRefetching}
          errorMessage={resource.errorMessage}
          onDismissError={resource.clearError}
          isEmpty={orders.length === 0}
          emptyTitle={t('unrouted.emptyTitle')}
          emptyDescription={t('unrouted.emptyDescription')}
          totalRows={orders.length}
          minWidth={880}
          head={
            <TableRow>
              <TableCell>{t('queue.code')}</TableCell>
              <TableCell>{t('orders.fields.service')}</TableCell>
              <TableCell>{t('customers.contactName')}</TableCell>
              <TableCell>{t('unrouted.route')}</TableCell>
              <TableCell>{t('unrouted.createdAt')}</TableCell>
              <TableCell align="right">{t('common.actions.actions')}</TableCell>
            </TableRow>
          }
        >
          {orders.map((order) => (
            <TableRow key={order.id} hover>
              <TableCell>
                <Typography variant="body2" fontWeight={700} noWrap>
                  {order.code}
                </Typography>
              </TableCell>
              <TableCell sx={{ maxWidth: 190 }}>
                <EllipsisCell text={order.serviceName} />
              </TableCell>
              <TableCell>{order.customerName ?? '—'}</TableCell>
              <TableCell>
                {order.originProvince ?? '—'} → {order.destinationProvince ?? '—'}
              </TableCell>
              <TableCell>{formatDateTime(order.createdAt)}</TableCell>
              <TableCell align="right">
                <Button size="small" variant="contained" onClick={() => setTarget(order)}>
                  {t('unrouted.assign')}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </DataTableShell>
      </SectionCard>

      <ConfirmDialog
        isOpen={target !== null}
        title={t('unrouted.assignTitle', { code: target?.code ?? '' })}
        description={t('unrouted.assignDescription')}
        isSubmitting={isSubmitting}
        isConfirmDisabled={departmentId === ''}
        onConfirm={() => void handleAssignDepartment()}
        onClose={() => {
          setTarget(null);
          setDepartmentId('');
        }}
      >
        <TextField
          select
          label={t('admin.routing.department')}
          value={departmentId}
          onChange={(event) => setDepartmentId(event.target.value)}
          fullWidth
          sx={{ mt: 2 }}
        >
          {departments.map((department) => (
            <MenuItem key={department.id} value={String(department.id)}>
              {department.name}
            </MenuItem>
          ))}
        </TextField>
      </ConfirmDialog>
    </PageContainer>
  );
}
