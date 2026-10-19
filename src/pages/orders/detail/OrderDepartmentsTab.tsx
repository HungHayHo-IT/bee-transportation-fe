import type { ReactNode } from 'react';
import { Alert, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/EmptyState';
import { DepartmentState, OrderStatus } from '@/constants/orderStatus';
import { PermissionAction } from '@/constants/permissions';
import { usePermissions } from '@/hooks/usePermissions';
import { useCurrentUser } from '@/store/sessionContext';
import type { OrderDepartment, OrderDetail } from '@/types/order';
import { DepartmentQuotePanel } from './DepartmentQuotePanel';
import { QuoteComparisonPanel } from './QuoteComparisonPanel';

export interface OrderDepartmentsTabProps {
  order: OrderDetail;
  onChanged: () => void;
}

/** Past the selection round the backend rejects any further quote with a 400. */
const QUOTABLE_STATUSES: readonly OrderStatus[] = [
  OrderStatus.Distributed,
  OrderStatus.Quoting,
  OrderStatus.AwaitingSelection,
];

/** Null means the department may quote; otherwise the key explains why it may not. */
function resolveQuoteBlockKey(
  order: OrderDetail,
  departmentRow: OrderDepartment,
): string | null {
  if (departmentRow.state === DepartmentState.Passed) return 'quotes.form.blockedByPass';
  if (departmentRow.state === DepartmentState.Lost) return 'quotes.form.blockedByLoss';
  if (!QUOTABLE_STATUSES.includes(order.status)) return 'quotes.form.blockedByRound';
  return null;
}

/**
 * The rows arrive already filtered by the sealed-quote rule: a department sees
 * only its own quote, while the owning sale and company roles see them all.
 */
export function OrderDepartmentsTab({ order, onChanged }: OrderDepartmentsTabProps): ReactNode {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const user = useCurrentUser();

  if (order.departments.length === 0) {
    // Two different reasons produce an empty list, and they call for opposite
    // actions. An order awaiting information is held back on purpose until
    // someone fills the missing fields in; it is NOT sitting in the unrouted
    // queue. Showing the unrouted wording sends staff to the wrong screen to
    // fix a routing setup that is not broken.
    const awaitingInfo = order.status === OrderStatus.AwaitingInfo;
    /* Lý do thứ ba: đơn ĐÃ phân cho phòng khác, nhưng báo giá kín giấu hết các
       dòng đó khỏi người xem — người có cờ "Xem toàn bộ đơn" (Pricing) mở đơn
       của phòng khác thì gặp đúng cảnh này. Báo "chưa phân phối" ở đây là nói
       sai, và đẩy người ta đi sửa định tuyến không hề hỏng. */
    const daPhanChoPhongKhac = !awaitingInfo
      && order.status !== OrderStatus.New
      && order.status !== OrderStatus.Cancelled;
    const khoa = awaitingInfo
      ? 'awaitingInfoNoDepartments'
      : daPhanChoPhongKhac ? 'sealedOtherDepartments' : 'noDepartments';
    return (
      <EmptyState
        title={t(`orders.detail.${khoa}`)}
        description={t(`orders.detail.${khoa}Hint`)}
      />
    );
  }

  const ownDepartmentRow = order.departments.find(
    (department) => department.departmentId === user?.departmentId,
  );
  /* Form báo giá chỉ cho ĐÚNG người phụ trách dòng của phòng mình — người đã
     bấm Nhận đơn hoặc được trưởng phòng giao (12/10/2026). Backend chặn người
     khác; hiện form cho họ là mời gõ một con số rồi bị từ chối. */
  const laPricingPhongMinh = can(PermissionAction.QuoteOrder) && ownDepartmentRow !== undefined;
  const laNguoiPhuTrach = laPricingPhongMinh
    && typeof ownDepartmentRow?.assigneeId === 'number' && ownDepartmentRow.assigneeId === user?.id;
  const isQuotingRole = laNguoiPhuTrach;
  const nhacPhuTrach = laPricingPhongMinh && !laNguoiPhuTrach
    && ownDepartmentRow !== undefined
    && ['pending', 'claimed', 'quoted'].includes(ownDepartmentRow.state)
    ? (typeof ownDepartmentRow.assigneeId !== 'number'
        ? t('quotes.form.claimFirst')
        : t('quotes.form.ownedBy', { name: ownDepartmentRow.assigneeName ?? '' }))
    : null;
  const blockKey =
    ownDepartmentRow === undefined ? null : resolveQuoteBlockKey(order, ownDepartmentRow);

  return (
    <Stack spacing={2}>
      <QuoteComparisonPanel
        order={order}
        canSelectWinner={can(PermissionAction.SelectQuote)}
        onChanged={onChanged}
      />

      {nhacPhuTrach ? <Alert severity="info">{nhacPhuTrach}</Alert> : null}

      {isQuotingRole && blockKey !== null ? <Alert severity="info">{t(blockKey)}</Alert> : null}

      {isQuotingRole && blockKey === null && ownDepartmentRow !== undefined ? (
        <DepartmentQuotePanel
          key={ownDepartmentRow.quoteVersion}
          order={order}
          departmentRow={ownDepartmentRow}
          onSubmitted={onChanged}
        />
      ) : null}
    </Stack>
  );
}
