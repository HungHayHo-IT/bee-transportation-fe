import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { MenuItem, Stack, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  REJECT_REASONS,
  REJECT_REASON_LABEL_KEY,
  findRejectReason,
} from '@/constants/rejectReasons';
import type { RejectReason } from '@/constants/rejectReasons';

export interface RejectOrderDialogProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onConfirm: (reason: RejectReason, note: string) => void;
  onClose: () => void;
}

/** The reason list is fixed because the dashboard groups win-rate loss on it. */
export function RejectOrderDialog({
  isOpen,
  isSubmitting,
  onConfirm,
  onClose,
}: RejectOrderDialogProps): ReactNode {
  const { t } = useTranslation();
  const [reason, setReason] = useState<RejectReason | ''>('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setReason('');
    setNote('');
  }, [isOpen]);

  return (
    <ConfirmDialog
      isOpen={isOpen}
      title={t('orders.reject.title')}
      description={t('orders.reject.description')}
      confirmLabel={t('orders.reject.confirm')}
      isSubmitting={isSubmitting}
      isConfirmDisabled={reason === ''}
      onConfirm={() => {
        if (reason === '') return;
        onConfirm(reason, note.trim());
      }}
      onClose={onClose}
    >
      <Stack spacing={2} sx={{ mt: 1 }}>
        <TextField
          select
          label={t('orders.reject.reason')}
          value={reason}
          onChange={(event) => setReason(findRejectReason(event.target.value) ?? '')}
          required
          fullWidth
        >
          {REJECT_REASONS.map((value) => (
            <MenuItem key={value} value={value}>
              {t(REJECT_REASON_LABEL_KEY[value])}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label={t('orders.reject.note')}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          multiline
          minRows={2}
          fullWidth
        />
      </Stack>
    </ConfirmDialog>
  );
}
