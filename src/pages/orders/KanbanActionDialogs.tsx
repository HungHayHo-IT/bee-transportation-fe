import type { ReactNode } from 'react';
import { CloseOrderDialog } from './detail/CloseOrderDialog';
import { RejectOrderDialog } from './detail/RejectOrderDialog';
import { CancelOrderDialog } from './detail/CancelOrderDialog';
import { winningDepartmentOf } from './useKanbanActions';
import type { KanbanActionsState } from './useKanbanActions';

/** The three guarded dialogs a Kanban drop can open, wired to the actions hook. */
export function KanbanActionDialogs({ actions }: { actions: KanbanActionsState }): ReactNode {
  const { pending, isSubmitting } = actions;

  return (
    <>
      <CloseOrderDialog
        isOpen={pending?.action === 'close'}
        winningDepartment={pending === null ? undefined : winningDepartmentOf(pending.order)}
        isSubmitting={isSubmitting}
        onConfirm={(note) => void actions.submitClose(note)}
        onClose={actions.cancelDialog}
      />
      <RejectOrderDialog
        isOpen={pending?.action === 'reject'}
        isSubmitting={isSubmitting}
        onConfirm={(reason, note) => void actions.submitReject(reason, note)}
        onClose={actions.cancelDialog}
      />
      <CancelOrderDialog
        isOpen={pending?.action === 'cancel'}
        isSubmitting={isSubmitting}
        onConfirm={(reason) => void actions.submitCancel(reason)}
        onClose={actions.cancelDialog}
      />
    </>
  );
}
