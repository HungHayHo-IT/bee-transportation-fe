import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Stack } from '@mui/material';
import { IconBan, IconEdit, IconFileText, IconHandGrab, IconLock, IconThumbDown } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import {
  CANCELLABLE_STATUSES,
  CLOSABLE_STATUSES,
  DepartmentState,
  OrderStatus,
  REJECTABLE_STATUSES,
} from '@/constants/orderStatus';
import { PermissionAction } from '@/constants/permissions';
import { Role } from '@/constants/roles';
import { usePermissions } from '@/hooks/usePermissions';
import {
  cancelOrder,
  closeOrder,
  downloadConfirmationPdf,
  nhanDon,
  rejectOrder,
  updateOrder,
} from '@/services/orderService';
import { openBlobInNewTab } from '@/utils/fileDownload';
import type { RejectReason } from '@/constants/rejectReasons';
import type { OrderDetail, UpdateOrderPayload } from '@/types/order';
import { describeError } from '@/services/apiClient';
import { CancelOrderDialog } from './CancelOrderDialog';
import { CloseOrderDialog } from './CloseOrderDialog';
import { OrderEditDialog } from './OrderEditDialog';
import { RejectOrderDialog } from './RejectOrderDialog';

export interface OrderActionsBarProps {
  order: OrderDetail;
  onChanged: () => void;
}

type OpenDialog = 'close' | 'reject' | 'cancel' | 'edit' | null;

/**
 * Chốt xong là đơn mang doanh thu, chỉ sửa được kèm ghi chú lý do.
 * Một trạng thái duy nhất từ migration 023 — tick mốc tiến độ không còn đẩy đơn
 * sang 'in_progress' hay 'completed' nữa.
 */
const CLOSED_STATUSES: readonly OrderStatus[] = [OrderStatus.Closed];

export function OrderActionsBar({ order, onChanged }: OrderActionsBarProps): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const { can, hasRole } = usePermissions();

  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  if (!can(PermissionAction.CloseOrder)) return null;

  const isClosed = CLOSED_STATUSES.includes(order.status);
  const winningDepartment = order.departments.find(
    (department) => department.state === DepartmentState.Won,
  );

  const runAction = async (action: () => Promise<void>, successMessage: string): Promise<void> => {
    setIsSubmitting(true);
    try {
      await action();
      setOpenDialog(null);
      onChanged();
      enqueueSnackbar(successMessage, { variant: 'success' });
    } catch (error) {
      // A 409 names both states in Vietnamese; refetching resyncs the stale copy.
      enqueueSnackbar(describeError(error), { variant: 'error' });
      onChanged();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenConfirmation = async (): Promise<void> => {
    setIsPdfLoading(true);
    try {
      openBlobInNewTab(await downloadConfirmationPdf(order.id));
    } catch (error) {
      enqueueSnackbar(describeError(error), { variant: 'error' });
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleUpdate = (payload: UpdateOrderPayload): void => {
    void runAction(() => updateOrder(order.id, payload), t('common.states.saved'));
  };

  return (
    <>
      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
        {/* Nhận đơn: CHỈ Sale, và chỉ khi chưa ai đứng tên. Quản trị viên không
            hiện nút — nhận là ĐỨNG TÊN, mà admin đứng tên thì đơn vẫn nằm trong
            diện "chưa có sale", bấm xong không đổi gì. Backend chặn lần nữa
            bằng @Roles(SALE) và bằng chính điều kiện này. */}
        {order.chuaCoSale && hasRole(Role.Sale) ? (
          <Button
            variant="contained"
            startIcon={<IconHandGrab size={17} />}
            disabled={isSubmitting}
            onClick={() => void runAction(() => nhanDon(order.id), t('orders.nhan.done'))}
          >
            {t('orders.nhan.action')}
          </Button>
        ) : null}

        {CLOSABLE_STATUSES.includes(order.status) ? (
          <Button
            variant="contained"
            startIcon={<IconLock size={17} />}
            onClick={() => setOpenDialog('close')}
          >
            {t('orders.close.action')}
          </Button>
        ) : null}

        {REJECTABLE_STATUSES.includes(order.status) ? (
          <Button
            color="warning"
            variant="outlined"
            startIcon={<IconThumbDown size={17} />}
            onClick={() => setOpenDialog('reject')}
          >
            {t('orders.reject.action')}
          </Button>
        ) : null}

        {/* Đã nghiệm thu xong thì hàng đã giao và doanh thu đã thành; huỷ lúc này
            là xoá một đơn có thật. Backend vẫn cho huỷ "Đã chốt" (QA-35). */}
        {CANCELLABLE_STATUSES.includes(order.status) && order.completedAt === null ? (
          <Button
            color="error"
            variant="outlined"
            startIcon={<IconBan size={17} />}
            onClick={() => setOpenDialog('cancel')}
          >
            {t('orders.cancel.action')}
          </Button>
        ) : null}

        <Button
          color="inherit"
          variant="outlined"
          startIcon={<IconEdit size={17} />}
          onClick={() => setOpenDialog('edit')}
        >
          {t('orders.edit.action')}
        </Button>

        {isClosed ? (
          <Button
            color="inherit"
            variant="outlined"
            startIcon={<IconFileText size={17} />}
            disabled={isPdfLoading}
            onClick={() => void handleOpenConfirmation()}
          >
            {t('orders.confirmation.action')}
          </Button>
        ) : null}
      </Stack>

      <CloseOrderDialog
        isOpen={openDialog === 'close'}
        winningDepartment={winningDepartment}
        isSubmitting={isSubmitting}
        onConfirm={(note) =>
          void runAction(() => closeOrder(order.id, note), t('orders.close.done'))
        }
        onClose={() => setOpenDialog(null)}
      />

      <RejectOrderDialog
        isOpen={openDialog === 'reject'}
        isSubmitting={isSubmitting}
        onConfirm={(reason: RejectReason, note) =>
          void runAction(() => rejectOrder(order.id, reason, note), t('orders.reject.done'))
        }
        onClose={() => setOpenDialog(null)}
      />

      <CancelOrderDialog
        isOpen={openDialog === 'cancel'}
        isSubmitting={isSubmitting}
        onConfirm={(reason) =>
          void runAction(() => cancelOrder(order.id, reason), t('orders.cancel.done'))
        }
        onClose={() => setOpenDialog(null)}
      />

      <OrderEditDialog
        order={openDialog === 'edit' ? order : null}
        isClosed={isClosed}
        isSubmitting={isSubmitting}
        onSubmit={handleUpdate}
        onClose={() => setOpenDialog(null)}
      />
    </>
  );
}
