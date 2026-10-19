import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { BeeLoader } from '@/components/BeeLoader';
import { Alert, Box, Button, LinearProgress, Stack } from '@mui/material';
import { IconList } from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { PageContainer } from '@/components/PageContainer';
import { EmptyState } from '@/components/EmptyState';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useOrderFilters } from '@/hooks/useOrderFilters';
import { usePermissions } from '@/hooks/usePermissions';
import { ORDER_STATUS_SEQUENCE, OrderStatus } from '@/constants/orderStatus';
import { PermissionAction } from '@/constants/permissions';
import { KANBAN_COLUMN_LIMIT } from '@/constants/pagination';
import { fetchOrderKanban } from '@/services/orderService';
import { fetchServices } from '@/services/organisationService';
import { buildOrderDetailPath, RoutePath } from '@/routes/routePaths';
import type { OrderKanban, OrderSummary } from '@/types/order';
import type { Service } from '@/types/organisation';
import { OrderFiltersBar } from './OrderFiltersBar';
import { KanbanColumn } from './KanbanColumn';
import { resolveKanbanAction } from './kanbanActions';
import { useKanbanActions } from './useKanbanActions';
import { KanbanActionDialogs } from './KanbanActionDialogs';

export function OrdersKanbanPage(): ReactNode {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { can } = usePermissions();
  const { values, setValues, requestFilters } = useOrderFilters();

  const load = useCallback(
    (): Promise<OrderKanban> =>
      fetchOrderKanban({ ...requestFilters, page: undefined, limit: undefined }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(requestFilters)],
  );
  const resource = useAsyncResource<OrderKanban>(load, [load]);
  const services = useAsyncResource<Service[]>(fetchServices);
  const actions = useKanbanActions(resource.reload);

  // Dragging a card onto a column starts the guarded action that reaches it —
  // closing, rejecting or cancelling. Only sale and admin may do so.
  const canAct = can(PermissionAction.CloseOrder);
  const [dragged, setDragged] = useState<OrderSummary | null>(null);

  const handleDrop = (targetStatus: OrderStatus): void => {
    if (dragged === null) return;
    const action = resolveKanbanAction(dragged.status, targetStatus);
    setDragged(null);
    if (action === null) {
      enqueueSnackbar(t('orders.kanban.dragNoAction'), { variant: 'info' });
      return;
    }
    void actions.begin(dragged.id, action);
  };

  const board = resource.data ?? {};
  // Cột hiện khi có thẻ. Người có quyền thao tác thì hai cột đích (chốt / huỷ)
  // hiện cả khi rỗng, để lúc nào cũng có chỗ thả thẻ vào.
  const ACTION_TARGETS: readonly OrderStatus[] = [OrderStatus.Closed, OrderStatus.Cancelled];
  const columns = ORDER_STATUS_SEQUENCE.filter(
    (status) =>
      (board[status] ?? []).length > 0 || (canAct && ACTION_TARGETS.includes(status)),
  );

  return (
    <PageContainer
      title={t('nav.ordersKanban')}
      description={
        canAct
          ? t('orders.kanban.dragHint')
          : t('orders.kanban.description', { limit: KANBAN_COLUMN_LIMIT })
      }
      action={
        <Button
          component={Link}
          to={RoutePath.Orders}
          color="inherit"
          startIcon={<IconList size={18} />}
        >
          {t('nav.orders')}
        </Button>
      }
    >
      <Stack spacing={2}>
        <OrderFiltersBar values={values} services={services.data ?? []} onChange={setValues} />

        {resource.errorMessage === null ? null : (
          <Alert severity="error" onClose={resource.clearError}>
            {resource.errorMessage}
          </Alert>
        )}
        {resource.isRefetching && !resource.isFirstLoad ? <LinearProgress /> : null}

        {resource.isFirstLoad ? (
          <BeeLoader />
        ) : columns.length === 0 ? (
          <EmptyState title={t('common.states.empty')} description={t('common.states.emptyHint')} />
        ) : (
          <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 2, alignItems: 'flex-start' }}>
            {columns.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                cards={board[status] ?? []}
                canAct={canAct}
                draggedFrom={dragged?.status ?? null}
                onOpen={(orderId) => navigate(buildOrderDetailPath(orderId))}
                onCardDragStart={setDragged}
                onCardDragEnd={() => setDragged(null)}
                onDropCard={handleDrop}
              />
            ))}
          </Box>
        )}
      </Stack>

      <KanbanActionDialogs actions={actions} />
    </PageContainer>
  );
}
