import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { cancelOrder, closeOrder, fetchOrderDetail, rejectOrder } from '@/services/orderService';
import { describeError } from '@/services/apiClient';
import { DepartmentState } from '@/constants/orderStatus';
import type { RejectReason } from '@/constants/rejectReasons';
import type { OrderDetail } from '@/types/order';
import type { KanbanAction } from './kanbanActions';

interface PendingAction {
  action: KanbanAction;
  /** The full detail, needed so the close dialog can name the winning amount. */
  order: OrderDetail;
}

export interface KanbanActionsState {
  pending: PendingAction | null;
  isSubmitting: boolean;
  /** Fetches the order and opens the matching dialog; a load failure is a toast. */
  begin: (orderId: number, action: KanbanAction) => Promise<void>;
  cancelDialog: () => void;
  submitClose: (note: string) => Promise<void>;
  submitReject: (reason: RejectReason, note: string) => Promise<void>;
  submitCancel: (reason: string) => Promise<void>;
}

/**
 * The board acts on a card by opening the same guarded dialog the order detail
 * uses. A drop never changes a status on its own — it only starts an action the
 * backend still validates.
 */
export function useKanbanActions(onChanged: () => void): KanbanActionsState {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const begin = async (orderId: number, action: KanbanAction): Promise<void> => {
    try {
      const order = await fetchOrderDetail(orderId);
      setPending({ action, order });
    } catch (error) {
      enqueueSnackbar(describeError(error), { variant: 'error' });
    }
  };

  const run = async (task: () => Promise<void>): Promise<void> => {
    setIsSubmitting(true);
    try {
      await task();
      setPending(null);
      onChanged();
    } catch (error) {
      // A stale board can offer an action the backend now refuses (409); surface
      // it and let the reload correct the card.
      enqueueSnackbar(describeError(error), { variant: 'error' });
      onChanged();
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitClose = (note: string): Promise<void> =>
    run(async () => {
      if (pending !== null) await closeOrder(pending.order.id, note);
      enqueueSnackbar(t('orders.close.done'), { variant: 'success' });
    });

  const submitReject = (reason: RejectReason, note: string): Promise<void> =>
    run(async () => {
      if (pending !== null) await rejectOrder(pending.order.id, reason, note);
      enqueueSnackbar(t('orders.reject.done'), { variant: 'success' });
    });

  const submitCancel = (reason: string): Promise<void> =>
    run(async () => {
      if (pending !== null) await cancelOrder(pending.order.id, reason);
      enqueueSnackbar(t('orders.cancel.done'), { variant: 'success' });
    });

  return {
    pending,
    isSubmitting,
    begin,
    cancelDialog: () => setPending(null),
    submitClose,
    submitReject,
    submitCancel,
  };
}

/** The winning department carries the amount the close dialog locks as revenue. */
export function winningDepartmentOf(order: OrderDetail) {
  return order.departments.find((department) => department.state === DepartmentState.Won);
}
