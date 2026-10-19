import type { ReactNode } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  isDestructive?: boolean;
  isSubmitting?: boolean;
  /** Blocks confirmation without locking the user out of cancelling. */
  isConfirmDisabled?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  isDestructive = false,
  isSubmitting = false,
  isConfirmDisabled = false,
  onConfirm,
  onClose,
  children,
}: ConfirmDialogProps): ReactNode {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {description ? <DialogContentText>{description}</DialogContentText> : null}
        {children}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
          {t('common.actions.cancel')}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={isDestructive ? 'error' : 'primary'}
          disabled={isSubmitting || isConfirmDisabled}
        >
          {confirmLabel ?? t('common.actions.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
