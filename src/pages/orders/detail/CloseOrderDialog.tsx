import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Stack, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatCurrencyVnd } from '@/utils/formatters';
import type { OrderDepartment } from '@/types/order';

export interface CloseOrderDialogProps {
  isOpen: boolean;
  winningDepartment: OrderDepartment | undefined;
  isSubmitting: boolean;
  onConfirm: (note: string) => void;
  onClose: () => void;
}

/** Closing is the moment the amount becomes revenue; later quote edits cannot move it. */
export function CloseOrderDialog({
  isOpen,
  winningDepartment,
  isSubmitting,
  onConfirm,
  onClose,
}: CloseOrderDialogProps): ReactNode {
  const { t } = useTranslation();
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setNote('');
  }, [isOpen]);

  return (
    <ConfirmDialog
      isOpen={isOpen}
      title={t('orders.close.title')}
      description={t('orders.close.description', {
        department: winningDepartment?.departmentName ?? '—',
        amount: formatCurrencyVnd(winningDepartment?.amount ?? null),
      })}
      confirmLabel={t('orders.close.confirm')}
      isSubmitting={isSubmitting}
      onConfirm={() => onConfirm(note.trim())}
      onClose={onClose}
    >
      <Stack spacing={2} sx={{ mt: 1 }}>
        <Alert severity="warning">{t('orders.close.lockHint')}</Alert>
        <TextField
          label={t('orders.close.note')}
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
