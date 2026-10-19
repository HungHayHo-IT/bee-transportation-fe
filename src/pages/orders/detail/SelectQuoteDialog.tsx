import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Stack, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatCurrencyVnd } from '@/utils/formatters';
import type { OrderDepartment } from '@/types/order';

export interface SelectQuoteDialogProps {
  department: OrderDepartment | null;
  isSubmitting: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

/** Selecting a winner is not closing: revenue is only locked by the close action. */
export function SelectQuoteDialog({
  department,
  isSubmitting,
  onConfirm,
  onClose,
}: SelectQuoteDialogProps): ReactNode {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (department === null) return;
    setReason('');
  }, [department]);

  return (
    <ConfirmDialog
      isOpen={department !== null}
      title={t('quotes.select.title')}
      description={t('quotes.select.description', {
        department: department?.departmentName ?? '',
        amount: formatCurrencyVnd(department?.amount ?? null),
      })}
      confirmLabel={t('quotes.select.confirm')}
      isSubmitting={isSubmitting}
      onConfirm={() => onConfirm(reason.trim())}
      onClose={onClose}
    >
      <Stack spacing={2} sx={{ mt: 1 }}>
        <Alert severity="info">{t('quotes.select.notClosingHint')}</Alert>
        <TextField
          label={t('quotes.select.reason')}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          multiline
          minRows={2}
          fullWidth
        />
      </Stack>
    </ConfirmDialog>
  );
}
