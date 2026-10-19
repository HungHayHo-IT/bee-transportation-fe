import type { ReactNode } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

export interface TempPasswordDialogProps {
  password: string | null;
  onClose: () => void;
}

/** The backend returns a temporary password once and never again. */
export function TempPasswordDialog({ password, onClose }: TempPasswordDialogProps): ReactNode {
  const { t } = useTranslation();

  return (
    <Dialog open={password !== null} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('admin.users.tempPasswordTitle')}</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('admin.users.tempPasswordWarning')}
        </Alert>
        <TextField
          value={password ?? ''}
          slotProps={{ input: { readOnly: true } }}
          fullWidth
          autoFocus
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="contained" onClick={onClose}>
          {t('common.actions.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
