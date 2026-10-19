import { useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Button, Stack } from '@mui/material';
import { IconRefreshDot } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { SectionCard } from '@/components/SectionCard';
import { DepartmentState, OrderStatus } from '@/constants/orderStatus';
import { requestQuoteRevision, selectWinningQuote } from '@/services/quoteService';
import type { OrderDepartment, OrderDetail } from '@/types/order';
import { describeError } from '@/services/apiClient';
import { QuoteDepartmentCard } from './QuoteDepartmentCard';
import { RequestRevisionDialog } from './RequestRevisionDialog';
import { SelectQuoteDialog } from './SelectQuoteDialog';
import { SalePriceCard } from './SalePriceCard';

export interface QuoteComparisonPanelProps {
  order: OrderDetail;
  canSelectWinner: boolean;
  onChanged: () => void;
}

/**
 * Once a winner is picked the order sits in "awaiting customer" and the backend
 * answers 409 to a second selection: changing the winner means requesting a
 * revision first, which undoes the selection.
 */
const SELECTABLE_STATUSES: readonly OrderStatus[] = [
  OrderStatus.Distributed,
  OrderStatus.Quoting,
  OrderStatus.AwaitingSelection,
];

/**
 * Mở lại vòng giá là một luật KHÁC, không phải luật chọn báo giá thắng.
 *
 * Backend đưa đơn về "Đang báo giá" qua `assertTransition`, nên nó chỉ nhận
 * những trạng thái mà bảng `ALLOWED` bên order-state.helper.ts cho đi tới
 * `QUOTING` — tức là "Đã phân phối" và "Chờ chốt giá". Đơn ĐANG báo giá rồi
 * thì `QUOTING -> QUOTING` không có trong bảng: backend trả 409 "Đơn đang ở
 * trạng thái Đang báo giá rồi", mà cũng đúng — không có vòng nào để mở lại.
 *
 * Trước đây nút này dùng chung `SELECTABLE_STATUSES`, vốn CÓ `Quoting` vì chọn
 * báo giá thắng lúc đang báo giá là hợp lệ. Hai việc khác nhau, hai danh sách.
 */
const REVISABLE_STATUSES: readonly OrderStatus[] = [
  OrderStatus.Distributed,
  OrderStatus.AwaitingSelection,
];

function findLowestQuotedAmount(departments: OrderDepartment[]): number | null {
  const amounts = departments
    .map((department) => department.amount)
    .filter((amount): amount is number => amount !== null);
  return amounts.length < 2 ? null : Math.min(...amounts);
}

export function QuoteComparisonPanel({
  order,
  canSelectWinner,
  onChanged,
}: QuoteComparisonPanelProps): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();

  const [selectionTarget, setSelectionTarget] = useState<OrderDepartment | null>(null);
  const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSelectableStatus = SELECTABLE_STATUSES.includes(order.status);
  const isRevisableStatus = REVISABLE_STATUSES.includes(order.status);
  const quotedDepartments = order.departments.filter((department) => department.quoteVersion > 0);
  const lowestAmount = findLowestQuotedAmount(order.departments);
  // Mọi đơn đã chọn phòng thắng: Sale nhập giá chốt riêng với khách.
  const phongThang = order.departments.find((d) => d.state === DepartmentState.Won);
  const giaPhongThang = phongThang?.amount ?? null;

  const handleSelect = async (reason: string): Promise<void> => {
    if (selectionTarget === null) return;
    setIsSubmitting(true);
    try {
      await selectWinningQuote(order.id, selectionTarget.departmentId, reason);
      setSelectionTarget(null);
      onChanged();
      enqueueSnackbar(t('quotes.select.done', { department: selectionTarget.departmentName }), {
        variant: 'success',
      });
    } catch (error) {
      // A 409 names both states in Vietnamese; the refetch resyncs the stale copy.
      enqueueSnackbar(describeError(error), { variant: 'error' });
      onChanged();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestRevision = async (departmentIds: number[], reason: string): Promise<void> => {
    setIsSubmitting(true);
    try {
      await requestQuoteRevision(order.id, departmentIds, reason);
      setIsRevisionDialogOpen(false);
      onChanged();
      enqueueSnackbar(t('quotes.revision.done', { count: departmentIds.length }), {
        variant: 'success',
      });
    } catch (error) {
      enqueueSnackbar(describeError(error), { variant: 'error' });
      onChanged();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SectionCard
      title={t('quotes.compare.title')}
      subtitle={t('quotes.compare.subtitle')}
      action={
        canSelectWinner && isRevisableStatus && quotedDepartments.length > 0 ? (
          <Button
            color="inherit"
            startIcon={<IconRefreshDot size={18} />}
            onClick={() => setIsRevisionDialogOpen(true)}
          >
            {t('quotes.revision.open')}
          </Button>
        ) : null
      }
    >
      <Stack spacing={2}>
        {canSelectWinner && isSelectableStatus && quotedDepartments.length > 1 ? (
          <Alert severity="warning">{t('quotes.compare.decideHint')}</Alert>
        ) : null}

        {phongThang && giaPhongThang !== null ? (
          <SalePriceCard
            key={`${phongThang.departmentId}-${order.salePrice ?? ''}`}
            orderId={order.id}
            giaPhongBan={giaPhongThang}
            salePrice={order.salePrice}
            isLanding={order.source === 'website'}
            canEdit={canSelectWinner && order.status === OrderStatus.AwaitingSelection}
            onChanged={onChanged}
          />
        ) : null}

        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={2}>
          {order.departments.map((department) => (
            <QuoteDepartmentCard
              key={department.departmentId}
              orderId={order.id}
              department={department}
              isLowestAmount={lowestAmount !== null && department.amount === lowestAmount}
              canSelect={canSelectWinner && isSelectableStatus}
              onSelect={setSelectionTarget}
            />
          ))}
        </Stack>
      </Stack>

      <SelectQuoteDialog
        department={selectionTarget}
        isSubmitting={isSubmitting}
        onConfirm={(reason) => void handleSelect(reason)}
        onClose={() => setSelectionTarget(null)}
      />

      <RequestRevisionDialog
        isOpen={isRevisionDialogOpen}
        candidates={order.departments}
        isSubmitting={isSubmitting}
        onConfirm={(departmentIds, reason) => void handleRequestRevision(departmentIds, reason)}
        onClose={() => setIsRevisionDialogOpen(false)}
      />
    </SectionCard>
  );
}
