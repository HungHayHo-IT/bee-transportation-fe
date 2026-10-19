import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Stack, TableCell, TableRow, Typography } from '@mui/material';
import { IconLayoutKanban } from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { usePageLevels } from '@/hooks/usePageLevels';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { DataTableShell } from '@/components/DataTableShell';
import { EllipsisCell } from '@/components/EllipsisCell';
import { SortableHeadCell } from '@/components/SortableHeadCell';
import { StatusChip } from '@/components/StatusChip';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useOrderFilters } from '@/hooks/useOrderFilters';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';
import { ORDER_SOURCE_LABEL_KEY } from '@/constants/provinces';
import { downloadOrdersExport, fetchOrders } from '@/services/orderService';
import { fetchServices } from '@/services/organisationService';
import { formatCompactCurrencyVnd, formatDate } from '@/utils/formatters';
import { buildOrderDetailPath, RoutePath } from '@/routes/routePaths';
import { downloadBlobAsFile } from '@/utils/fileDownload';
import type { OrderPage } from '@/types/order';
import type { Service } from '@/types/organisation';
import { describeError } from '@/services/apiClient';
import { OrderFiltersBar } from './OrderFiltersBar';

export function OrdersListPage(): ReactNode {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { values, page, setValues, setPage, sort, setSort, requestFilters } = useOrderFilters();
  const [isExporting, setIsExporting] = useState(false);

  // Only the free-text search is debounced; a select change should apply at once.
  const debouncedQuery = useDebouncedValue(requestFilters.q ?? '');
  const load = useCallback(
    (): Promise<OrderPage> =>
      fetchOrders({ ...requestFilters, ...(debouncedQuery === '' ? {} : { q: debouncedQuery }) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify({ ...requestFilters, q: debouncedQuery })],
  );
  const resource = useAsyncResource<OrderPage>(load, [load]);
  const services = useAsyncResource<Service[]>(fetchServices);

  const orders = resource.data?.items ?? [];
  const total = resource.data?.total ?? 0;

  const handleExport = async (): Promise<void> => {
    setIsExporting(true);
    try {
      downloadBlobAsFile(await downloadOrdersExport(requestFilters), 'beeops-orders.xlsx');
    } catch (error) {
      enqueueSnackbar(describeError(error), { variant: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const levels = usePageLevels();
  // Chưa lấy xong ma trận thì cứ hiện: backend vẫn chặn thật, còn giấu nhầm
  // của người có quyền thì họ tưởng tính năng biến mất.
  const xemDuocKanban = levels === null || levels.ordersKanban !== 'none';

  return (
    <PageContainer
      title={t('nav.orders')}
      description={t('orders.list.description')}
      /* Ẩn lối sang Kanban với ai không mở được nó — đối tác là ca đầu tiên.
         Để nút đó hiện thì bấm vào ra trang "không tìm thấy", và người dùng đi
         tìm lỗi ở chỗ khác. */
      action={xemDuocKanban ? (
        <Button
          component={Link}
          to={RoutePath.OrdersKanban}
          color="inherit"
          startIcon={<IconLayoutKanban size={18} />}
        >
          {t('nav.ordersKanban')}
        </Button>
      ) : undefined}
    >
      <Stack spacing={2}>
        <OrderFiltersBar
          values={values}
          services={services.data ?? []}
          onChange={setValues}
          onExport={() => void handleExport()}
          isExporting={isExporting}
        />

        <SectionCard disableContentPadding>
          <DataTableShell
            isFirstLoad={resource.isFirstLoad}
            isRefetching={resource.isRefetching}
            errorMessage={resource.errorMessage}
            onDismissError={resource.clearError}
            isEmpty={orders.length === 0}
            totalRows={total}
            page={page}
            pageCount={Math.ceil(total / DEFAULT_PAGE_SIZE)}
            onPageChange={setPage}
            minWidth={1360}
            isFixedLayout
            // Short, predictable columns get a fixed width; the four free-text ones
            // (contact, route, department, sale) share the rest and ellipsize.
            head={
              <TableRow>
                <TableCell width={190}>{t('queue.code')}</TableCell>
                <TableCell width={95}>{t('orders.fields.service')}</TableCell>
                <TableCell>{t('customers.contactName')}</TableCell>
                <TableCell>{t('unrouted.route')}</TableCell>
                <SortableHeadCell column="status" sort={sort} onSortChange={setSort} width={185}>
                  {t('common.table.status')}
                </SortableHeadCell>
                <TableCell>{t('orders.list.department')}</TableCell>
                <TableCell>{t('orders.list.sale')}</TableCell>
                <TableCell width={120}>{t('orders.fields.source')}</TableCell>
                <TableCell align="right" width={110}>
                  {t('orders.list.value')}
                </TableCell>
                <SortableHeadCell
                  column="createdAt"
                  sort={sort}
                  onSortChange={setSort}
                  width={130}
                >
                  {t('orders.list.createdDate')}
                </SortableHeadCell>
              </TableRow>
            }
          >
            {orders.map((order) => (
              <TableRow
                key={order.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate(buildOrderDetailPath(order.id))}
              >
                <TableCell>
                  {/* An order code is an identifier: it never wraps and never truncates. */}
                  <Typography variant="body2" fontWeight={700} noWrap>
                    {order.code}
                  </Typography>
                </TableCell>
                <TableCell>{order.serviceCode}</TableCell>
                <TableCell>
                  <EllipsisCell text={order.customerName ?? '—'} />
                </TableCell>
                <TableCell>
                  <EllipsisCell
                    text={`${order.originProvince ?? '—'} → ${order.destinationProvince ?? '—'}`}
                  />
                </TableCell>
                <TableCell>
                  <StatusChip status={order.status} />
                </TableCell>
                <TableCell>
                  <EllipsisCell text={order.departmentName ?? '—'} />
                </TableCell>
                <TableCell>
                  <EllipsisCell text={order.saleName ?? t('orders.list.noSale')} />
                </TableCell>
                <TableCell>
                  <EllipsisCell
                    text={order.source ? t(ORDER_SOURCE_LABEL_KEY[order.source]) : '—'}
                  />
                </TableCell>
                <TableCell align="right">
                  {/* Null means the amount is hidden from this user, not zero. */}
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {formatCompactCurrencyVnd(order.finalAmount)}
                  </Typography>
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(order.createdAt)}</TableCell>
              </TableRow>
            ))}
          </DataTableShell>
        </SectionCard>
      </Stack>
    </PageContainer>
  );
}
