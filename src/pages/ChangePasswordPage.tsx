import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PasswordField } from '@/components/form/PasswordField';
import { changePassword } from '@/services/authService';
import { useSession } from '@/store/sessionContext';
import { RoutePath } from '@/routes/routePaths';
import { describeError } from '@/services/apiClient';

export function ChangePasswordPage(): ReactNode {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, refresh } = useSession();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (state.status === 'anonymous') {
    return <Navigate to={RoutePath.Login} replace />;
  }

  // Only the confirmation must match — no length or complexity rules; the backend
  // is the authority on those and reports them.
  const isMismatched = confirmation.length > 0 && confirmation !== newPassword;
  const canSubmit =
    currentPassword.length > 0 && newPassword.length > 0 && confirmation === newPassword;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      await refresh();
      /* Về '/' chứ không về Bảng điều khiển: TrangMacDinh chọn trang theo ma
         trận. Trỏ cứng thì vai trò không mở được màn đó — đối tác là ca đầu
         tiên — rơi thẳng vào trang 404. */
      navigate('/', { replace: true });
    } catch (error) {
      setErrorMessage(describeError(error));
      setIsSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Typography variant="h5" sx={{ mb: 0.5 }}>
        {t('auth.changePassword.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('auth.changePassword.subtitle')}
      </Typography>

      {errorMessage ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      ) : null}

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
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={!canSubmit || isSubmitting}
          fullWidth
        >
          {t('auth.changePassword.submit')}
        </Button>
      </Stack>
    </Box>
  );
}
