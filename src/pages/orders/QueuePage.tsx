import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, TableCell, TableRow } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { DataTableShell } from '@/components/DataTableShell';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { usePermissions } from '@/hooks/usePermissions';
import { useCurrentUser } from '@/store/sessionContext';
import { Role } from '@/constants/roles';
import {
  assignOrder,
  claimOrder,
  fetchQueue,
  type QueuePage as QueuePageData,
  passOrder,
  transferOrder,
} from '@/services/queueService';
import { fetchDepartmentTree } from '@/services/organisationService';
import type { DepartmentTreeNode, OrganisationUser } from '@/types/organisation';
import type { QueueItem } from '@/types/queue';
import { describeError } from '@/services/apiClient';
import { AssignOrderDialog } from './AssignOrderDialog';
import { PassOrderDialog } from './PassOrderDialog';
import { TransferDialog } from './TransferDialog';
import { transferTargets } from './transferTargets';
import { QueueRow, STICKY_ACTION_CELL } from './QueueRow';

/** The queue is the one screen where staleness costs money, so it refreshes itself. */
const POLL_INTERVAL_MS = 60_000;

export function QueuePage(): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const { hasRole } = usePermissions();
  const user = useCurrentUser();
  /**
   * Không hỏi khi câu hỏi không có nghĩa.
   *
   * Hàng đợi là hàng đợi CỦA MỘT PHÒNG. Tài khoản chưa thuộc phòng nào thì
   * backend trả 400 "chưa thuộc phòng ban nào" — đúng sự thật, nhưng hiện ra
   * thành một băng đỏ ngay dưới dòng chữ đã nói y hệt như vậy. Ở đây trả thẳng
   * một trang rỗng để màn hình chỉ còn một câu giải thích, không phải một lỗi.
   */
  const coPhong = (user?.departmentId ?? null) !== null;
  const taiHangDoi = useCallback(
    (): Promise<QueuePageData> =>
      coPhong ? fetchQueue() : Promise.resolve({ items: [], total: 0, page: 1, limit: 0 }),
    [coPhong],
  );
  const resource = useAsyncResource<QueuePageData>(taiHangDoi, [coPhong]);

  const [passTarget, setPassTarget] = useState<QueueItem | null>(null);
  const [assignTarget, setAssignTarget] = useState<QueueItem | null>(null);
  const [transferTarget, setTransferTarget] = useState<QueueItem | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const [tree, setTree] = useState<DepartmentTreeNode[]>([]);

  // The org chart is only used to fill the transfer dialog's target list; if this
  // fails, the queue screen must still work with an empty target list.
  useEffect(() => {
    fetchDepartmentTree().then(setTree).catch(() => setTree([]));
  }, []);

  const { reload } = resource;
  useEffect(() => {
    const refreshIfVisible = (): void => {
      if (document.visibilityState === 'visible') reload();
    };
    const timer = window.setInterval(refreshIfVisible, POLL_INTERVAL_MS);
    window.addEventListener('focus', refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshIfVisible);
    };
  }, [reload]);

  const departmentId = user?.departmentId ?? null;
  const items = resource.data?.items ?? [];
  // Server-side total, not the page length: if it is larger, rows are missing
  // from this screen and the banner below says so.
  const total = resource.data?.total ?? items.length;
  // Only a manager may hand an order to someone else, and only inside their own
  // department — the backend enforces both.
  const canAssign = hasRole(Role.Manager) && departmentId !== null;
  // Chỉ Pricing nhận đơn: người nhận là người chịu trách nhiệm nhập báo giá.
  // Trưởng phòng muốn ai làm thì GIAO, không tự nhận thay.
  const canClaim = hasRole(Role.Pricing) && departmentId !== null;

  const handleClaim = async (item: QueueItem): Promise<void> => {
    if (departmentId === null) return;
    setBusyOrderId(item.orderId);
    try {
      await claimOrder(item.orderId, departmentId);
      resource.reload();
      enqueueSnackbar(t('queue.claimed', { code: item.code }), { variant: 'success' });
    } catch (error) {
      // A 409 here means a colleague claimed it first; the refetch shows who.
      enqueueSnackbar(describeError(error), { variant: 'error' });
      resource.reload();
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleAssign = async (assignee: OrganisationUser): Promise<void> => {
    if (assignTarget === null || departmentId === null) return;
    const item = assignTarget;
    setBusyOrderId(item.orderId);
    try {
      await assignOrder(item.orderId, departmentId, assignee.id);
      setAssignTarget(null);
      resource.reload();
      enqueueSnackbar(t('queue.assigned', { code: item.code, name: assignee.fullName }), {
        variant: 'success',
      });
    } catch (error) {
      enqueueSnackbar(describeError(error), { variant: 'error' });
    } finally {
      setBusyOrderId(null);
    }
  };

  const handlePass = async (reason: string): Promise<void> => {
    if (passTarget === null || departmentId === null) return;
    setBusyOrderId(passTarget.orderId);
    try {
      await passOrder(passTarget.orderId, departmentId, reason);
      setPassTarget(null);
      resource.reload();
      enqueueSnackbar(t('queue.passed'), { variant: 'success' });
    } catch (error) {
      enqueueSnackbar(describeError(error), { variant: 'error' });
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleTransfer = async (toDepartmentId: number, reason: string): Promise<void> => {
    if (transferTarget === null || departmentId === null) return;
    setBusyOrderId(transferTarget.orderId);
    try {
      await transferOrder(transferTarget.orderId, departmentId, toDepartmentId, reason);
      setTransferTarget(null);
      resource.reload();
      enqueueSnackbar(t('queue.transferred', { code: transferTarget.code }), {
        variant: 'success',
      });
    } catch (error) {
      enqueueSnackbar(describeError(error), { variant: 'error' });
    } finally {
      setBusyOrderId(null);
    }
  };

  return (
    <PageContainer
      title={t('nav.queue')}
      description={
        user?.departmentName === null || user?.departmentName === undefined
          ? t('queue.noDepartment')
          : t('queue.description', { department: user.departmentName })
      }
    >
      {/* The endpoint caps a page at 200 rows and this screen asks for one page.
          Past that the oldest orders are simply not here, and a queue that
          quietly hides work is worse than one that admits it. */}
      {total > items.length && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('queue.truncated', { shown: items.length, total })}
        </Alert>
      )}
      <SectionCard disableContentPadding>
        <DataTableShell
          isFirstLoad={resource.isFirstLoad}
          isRefetching={resource.isRefetching}
          errorMessage={resource.errorMessage}
          onDismissError={resource.clearError}
          isEmpty={items.length === 0}
          emptyTitle={t('queue.emptyTitle')}
          emptyDescription={t('queue.emptyDescription')}
          totalRows={total}
          minWidth={1180}
          head={
            <TableRow>
              <TableCell>{t('queue.code')}</TableCell>
              <TableCell>{t('orders.fields.service')}</TableCell>
              <TableCell>{t('customers.contactName')}</TableCell>
              <TableCell>{t('unrouted.route')}</TableCell>
              <TableCell>{t('queue.state')}</TableCell>
              <TableCell>{t('queue.assignee')}</TableCell>
              <TableCell>{t('queue.distributedAt')}</TableCell>
              <TableCell align="right" sx={STICKY_ACTION_CELL}>
                {t('common.actions.actions')}
              </TableCell>
            </TableRow>
          }
        >
          {items.map((item) => (
            <QueueRow
              key={item.orderId}
              item={item}
              isBusy={busyOrderId === item.orderId}
              canAct={departmentId !== null}
              canClaim={canClaim}
              canAssign={canAssign}
              canTransfer={canAssign}
              onClaim={(target) => void handleClaim(target)}
              onAssign={setAssignTarget}
              onTransfer={setTransferTarget}
              onPass={setPassTarget}
            />
          ))}
        </DataTableShell>
      </SectionCard>

      {departmentId === null ? null : (
        <AssignOrderDialog
          item={assignTarget}
          departmentId={departmentId}
          isSubmitting={busyOrderId !== null}
          onConfirm={(assignee) => void handleAssign(assignee)}
          onClose={() => setAssignTarget(null)}
        />
      )}

      <PassOrderDialog
        item={passTarget}
        isSubmitting={busyOrderId !== null}
        onConfirm={(reason) => void handlePass(reason)}
        onClose={() => setPassTarget(null)}
      />

      <TransferDialog
        item={transferTarget}
        targets={
          transferTarget === null || departmentId === null
            ? []
            : transferTargets(tree, transferTarget, departmentId)
        }
        isSubmitting={busyOrderId !== null}
        onConfirm={(toDepartmentId, reason) => void handleTransfer(toDepartmentId, reason)}
        onClose={() => setTransferTarget(null)}
      />
    </PageContainer>
  );
}
