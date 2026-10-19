import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatCurrencyVnd } from '@/utils/formatters';
import type { OrderDepartment } from '@/types/order';

export interface RequestRevisionDialogProps {
  isOpen: boolean;
  candidates: OrderDepartment[];
  isSubmitting: boolean;
  onConfirm: (departmentIds: number[], reason: string) => void;
  onClose: () => void;
}

/** Reopening the round for one department reopens it for every department picked here. */
export function RequestRevisionDialog({
  isOpen,
  candidates,
  isSubmitting,
  onConfirm,
  onClose,
}: RequestRevisionDialogProps): ReactNode {
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setSelectedIds([]);
    setReason('');
  }, [isOpen]);

  const toggleDepartment = (departmentId: number): void => {
    setSelectedIds((current) =>
      current.includes(departmentId)
        ? current.filter((id) => id !== departmentId)
        : [...current, departmentId],
    );
  };

  const isIncomplete = selectedIds.length === 0 || reason.trim() === '';

  return (
    <ConfirmDialog
      isOpen={isOpen}
      title={t('quotes.revision.title')}
      description={t('quotes.revision.description')}
      confirmLabel={t('quotes.revision.confirm')}
      isSubmitting={isSubmitting}
      isConfirmDisabled={isIncomplete}
      onConfirm={() => onConfirm(selectedIds, reason.trim())}
      onClose={onClose}
    >
      <Stack spacing={2} sx={{ mt: 1 }}>
        <Alert severity="warning">{t('quotes.revision.warning')}</Alert>

        <FormGroup>
          {candidates.map((department) => (
            <FormControlLabel
              key={department.departmentId}
              control={
                <Checkbox
                  checked={selectedIds.includes(department.departmentId)}
                  onChange={() => toggleDepartment(department.departmentId)}
                />
              }
              label={
                <Typography variant="body2">
                  {department.departmentName}
                  {department.amount === null ? '' : ` · ${formatCurrencyVnd(department.amount)}`}
                </Typography>
              }
            />
          ))}
        </FormGroup>

        <TextField
          label={t('quotes.revision.reason')}
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
