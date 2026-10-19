import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from '@mui/material';
import { IconKey } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { PasswordField } from '@/components/form/PasswordField';
import { changePassword } from '@/services/authService';
import { describeError } from '@/services/apiClient';

/**
 * Self-service password change for the signed-in user — a header button that opens
 * a dialog. No client-side rules: the backend is the authority on what a password
 * must be, and reports it. The session stays valid, so success just closes and toasts.
 */
export function ChangePasswordButton(): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();

  const [isOpen, setIsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Only the confirmation must match — no length or complexity rules; the backend
  // is the authority on those and reports them.
  const isMismatched = confirmation.length > 0 && confirmation !== newPassword;
  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    confirmation === newPassword &&
    !isSubmitting;

  const close = (): void => {
    if (isSubmitting) return;
    setIsOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmation('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setIsSubmitting(false);
      setIsOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
      enqueueSnackbar(t('profile.passwordChanged'), { variant: 'success' });
    } catch (error) {
      setIsSubmitting(false);
      enqueueSnackbar(describeError(error), { variant: 'error' });
    }
  };

  return (
    <>
      <Button
        variant="contained"
        startIcon={<IconKey size={18} stroke={1.7} />}
        onClick={() => setIsOpen(true)}
      >
        {t('profile.changePassword')}
      </Button>

      <Dialog open={isOpen} onClose={close} fullWidth maxWidth="xs">
        <DialogTitle>{t('profile.changePassword')}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <DialogContent sx={{ pt: 1 }}>
            <Stack spacing={2}>
              <PasswordField
                label={t('auth.fields.currentPassword')}
                value={currentPassword}
                onChange={setCurrentPassword}
                autoComplete="current-password"
                isRequired
                isAutoFocused
              />
              <PasswordField
                label={t('auth.fields.newPassword')}
                value={newPassword}
                onChange={setNewPassword}
                autoComplete="new-password"
                isRequired
              />
              <PasswordField
                label={t('auth.fields.confirmPassword')}
                value={confirmation}
                onChange={setConfirmation}
                autoComplete="new-password"
                errorMessage={isMismatched ? t('validation.passwordMismatch') : null}
                isRequired
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button color="inherit" onClick={close} disabled={isSubmitting}>
              {t('common.actions.cancel')}
            </Button>
            <Button type="submit" variant="contained" disabled={!canSubmit}>
              {t('auth.changePassword.submit')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}
