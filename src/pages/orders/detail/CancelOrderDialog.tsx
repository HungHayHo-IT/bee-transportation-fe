import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Stack, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export interface CancelOrderDialogProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

/** Cancelling is an internal decision and is deliberately not a rejection. */
export function CancelOrderDialog({
  isOpen,
  isSubmitting,
  onConfirm,
  onClose,
}: CancelOrderDialogProps): ReactNode {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setReason('');
  }, [isOpen]);

  return (
    <ConfirmDialog
      isOpen={isOpen}
      title={t('orders.cancel.title')}
      description={t('orders.cancel.description')}
      confirmLabel={t('orders.cancel.confirm')}
      isDestructive
      isSubmitting={isSubmitting}
      isConfirmDisabled={reason.trim() === ''}
      onConfirm={() => onConfirm(reason.trim())}
      onClose={onClose}
    >
      <Stack spacing={2} sx={{ mt: 1 }}>
        <Alert severity="error">{t('orders.cancel.differsFromReject')}</Alert>
        <TextField
          label={t('orders.cancel.reason')}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          multiline
          minRows={2}
          required
          fullWidth
        />
      </Stack>
    </ConfirmDialog>
  );
}
