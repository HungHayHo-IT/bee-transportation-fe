import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { QueueItem } from '@/types/queue';

export interface PassOrderDialogProps {
  item: QueueItem | null;
  isSubmitting: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

/** Passing is visible to the sale, so the reason is mandatory on both sides. */
export function PassOrderDialog({
  item,
  isSubmitting,
  onConfirm,
  onClose,
}: PassOrderDialogProps): ReactNode {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (item === null) return;
    setReason('');
  }, [item]);

  return (
    <ConfirmDialog
      isOpen={item !== null}
      title={t('queue.pass.title', { code: item?.code ?? '' })}
      description={t('queue.pass.description')}
      confirmLabel={t('queue.pass.confirm')}
      isDestructive
      isSubmitting={isSubmitting}
      isConfirmDisabled={reason.trim() === ''}
      onConfirm={() => onConfirm(reason.trim())}
      onClose={onClose}
    >
      <TextField
        label={t('queue.pass.reason')}
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
