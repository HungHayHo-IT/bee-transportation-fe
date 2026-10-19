import { useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { BeeLoader } from '@/components/BeeLoader';
import { Alert, Box, Chip, Stack, Tab, Tabs } from '@mui/material';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { OrderStatus } from '@/constants/orderStatus';
import { ORDER_DETAIL_TABS, findOrderDetailTab } from '@/constants/orderDetailTabs';
import type { OrderDetailTab } from '@/constants/orderDetailTabs';
import { fetchOrderDetail } from '@/services/orderService';
import { RoutePath } from '@/routes/routePaths';
import type { OrderDetail } from '@/types/order';
import { useServiceSchema } from './useServiceSchema';
import { OrderActionsBar } from './detail/OrderActionsBar';
import { TmsPushPanel } from './detail/TmsPushPanel';
import { OrderSignaturePanel } from './detail/OrderSignaturePanel';
import { OrderSummaryHeader } from './detail/OrderSummaryHeader';
import { OrderOverviewTab } from './detail/OrderOverviewTab';
import { OrderDepartmentsTab } from './detail/OrderDepartmentsTab';
import { OrderMilestonesTab } from './detail/OrderMilestonesTab';
import { OrderDiscussionTab } from './detail/OrderDiscussionTab';
import { OrderFilesTab } from './detail/OrderFilesTab';
import { OrderTimelineTab } from './detail/OrderTimelineTab';
import { NotFoundPage } from '@/pages/NotFoundPage';

const QUOTE_POLL_INTERVAL_MS = 60_000;

/** While the round is open a competing quote can arrive at any moment. */
const LIVE_QUOTE_STATUSES: readonly OrderStatus[] = [
  OrderStatus.Distributed,
  OrderStatus.Quoting,
  OrderStatus.AwaitingSelection,
];

export function OrderDetailPage(): ReactNode {
  const { t } = useTranslation();
  const { orderId } = useParams();
  const numericId = Number(orderId);
  // A path like /orders/abc or /orders/-1 is not an order that could be out of
  // scope — it is a not-found route. Decide that before any fetch, so the screen
  // never shows the backend's raw "numeric string is expected" validation error.
  const isValidId = Number.isInteger(numericId) && numericId > 0;

  // A notification links straight to the tab it is about, so the tab lives in the
  // URL and stays shareable like the list filters do.
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = findOrderDetailTab(searchParams.get('tab')) ?? 'overview';
  const selectTab = (tab: OrderDetailTab): void => {
    setSearchParams(tab === 'overview' ? {} : { tab }, { replace: true });
  };

  const load = useCallback(
    (): Promise<OrderDetail> =>
      isValidId ? fetchOrderDetail(numericId) : Promise.reject(new Error('invalid-order-id')),
    [numericId, isValidId],
  );
  const resource = useAsyncResource<OrderDetail>(load, [numericId]);
  const order = resource.data;

  // Đơn chi tiết KHÔNG mang cờ điểm đến, nên phải hỏi schema của dịch vụ —
  // cùng nguồn mà form tạo/sửa đơn đang dùng, để hai màn hình không nói khác nhau.
  const { schema } = useServiceSchema(
    order === null ? null : order.serviceId,
    order?.serviceChildId,
  );

  const { reload } = resource;
  const isQuoteRoundOpen = order !== null && LIVE_QUOTE_STATUSES.includes(order.status);
  useEffect(() => {
    if (!isQuoteRoundOpen) return undefined;
    const refreshIfVisible = (): void => {
      if (document.visibilityState === 'visible') reload();
    };
    const timer = window.setInterval(refreshIfVisible, QUOTE_POLL_INTERVAL_MS);
    window.addEventListener('focus', refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshIfVisible);
    };
  }, [isQuoteRoundOpen, reload]);

  // A malformed id, or a 404 from the backend (missing or out of scope), is the
  // same story to the user: not found. Never the raw validation message.
  if (!isValidId || (order === null && !resource.isFirstLoad)) {
    return <NotFoundPage />;
  }

  if (resource.isFirstLoad) {
    return (
      <BeeLoader />
    );
  }

  if (order === null) return <NotFoundPage />;

  return (
    <PageContainer
      title={order.code}
      description={`${order.serviceName} · ${order.customerName ?? '—'}`}
      backTo={RoutePath.Orders}
    >
      <Stack spacing={2}>
        <OrderSummaryHeader
          order={order}
          hasDomesticOrigin={schema?.hasDomesticOrigin ?? true}
          hasDomesticDestination={schema?.hasDomesticDestination ?? true}
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <OrderActionsBar order={order} onChanged={resource.reload} />
            <TmsPushPanel order={order} onChanged={resource.reload} />
          </Stack>
        </OrderSummaryHeader>

        {order.finalAmount === null && order.closedAt !== null ? (
          <Alert severity="info">{t('orders.detail.amountHidden')}</Alert>
        ) : null}

        {/* Khối ký đứng riêng, trên các tab: nó là một việc của cả đơn chứ
            không thuộc tab nào, và tự ẩn khi người xem không có quyền. */}
        <OrderSignaturePanel order={order} onChanged={resource.reload} />

        <SectionCard disableContentPadding>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
            <Tabs
              value={activeTab}
              onChange={(_event, value: OrderDetailTab) => selectTab(value)}
              variant="scrollable"
              scrollButtons="auto"
            >
              {ORDER_DETAIL_TABS.map((key) => (
                <Tab
                  key={key}
                  value={key}
                  label={
                    key === 'departments' ? (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <span>{t(`orders.detail.tab.${key}`)}</span>
                        <Chip size="small" label={order.departments.length} />
                      </Stack>
                    ) : (
                      t(`orders.detail.tab.${key}`)
                    )
                  }
                />
              ))}
            </Tabs>
          </Box>

          <Box sx={{ p: 3 }}>
            {activeTab === 'overview' ? <OrderOverviewTab order={order} /> : null}
            {activeTab === 'departments' ? (
              <OrderDepartmentsTab order={order} onChanged={resource.reload} />
            ) : null}
            {activeTab === 'milestones' ? (
              <OrderMilestonesTab order={order} onUpdated={resource.reload} />
            ) : null}
            {activeTab === 'discussion' ? <OrderDiscussionTab orderId={order.id} /> : null}
            {activeTab === 'files' ? <OrderFilesTab orderId={order.id} /> : null}
            {activeTab === 'timeline' ? <OrderTimelineTab orderId={order.id} /> : null}
          </Box>
        </SectionCard>
      </Stack>
    </PageContainer>
  );
}
