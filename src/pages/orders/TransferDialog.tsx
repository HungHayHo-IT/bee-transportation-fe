import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { MenuItem, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { DepartmentTreeNode } from '@/types/organisation';
import type { QueueItem } from '@/types/queue';

export interface TransferDialogProps {
  item: QueueItem | null;
  targets: readonly DepartmentTreeNode[];
  isSubmitting: boolean;
  onConfirm: (toDepartmentId: number, reason: string) => void;
  onClose: () => void;
}

/** Handing the order to another department, in one step, instead of pass + re-add by an Admin. */
export function TransferDialog({
  item,
  targets,
  isSubmitting,
  onConfirm,
  onClose,
}: TransferDialogProps): ReactNode {
  const { t } = useTranslation();
  const [toDepartmentId, setToDepartmentId] = useState('');
  const [reason, setReason] = useState('');

  // Reopening for a different row must not inherit the previous row's answers.
  useEffect(() => {
    if (item === null) return;
    setToDepartmentId('');
    setReason('');
  }, [item]);

  const canSubmit = toDepartmentId !== '' && reason.trim() !== '';

  return (
    <ConfirmDialog
      isOpen={item !== null}
      title={t('queue.transferTitle', { code: item?.code ?? '' })}
      description={t('queue.transferHint')}
      confirmLabel={t('queue.transferConfirm')}
      isSubmitting={isSubmitting}
      isConfirmDisabled={!canSubmit}
      onConfirm={() => onConfirm(Number(toDepartmentId), reason.trim())}
      onClose={onClose}
    >
      <TextField
        select
        label={t('queue.transferTarget')}
        value={toDepartmentId}
        onChange={(event) => setToDepartmentId(event.target.value)}
        helperText={targets.length === 0 ? t('queue.transferNoTarget') : undefined}
        disabled={targets.length === 0}
        required
        fullWidth
        sx={{ mt: 2 }}
      >
        {targets.map((node) => (
          <MenuItem key={node.id} value={String(node.id)}>
            {node.name}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label={t('queue.transferReason')}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        multiline
        minRows={2}
        required
        fullWidth
        sx={{ mt: 2 }}
      />
    </ConfirmDialog>
  );
}
