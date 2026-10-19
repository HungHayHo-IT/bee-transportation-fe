import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  Link,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PasswordField } from '@/components/form/PasswordField';
import { useSession } from '@/store/sessionContext';
import { isMockMode } from '@/mocks/mockClient';
import { MOCK_PASSWORD, MOCK_USERS } from '@/mocks/mockUsers';
import { ROLE_LABEL_KEY } from '@/constants/roles';
import { RoutePath } from '@/routes/routePaths';
import { describeError } from '@/services/apiClient';

export function LoginPage(): ReactNode {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, signIn } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (state.status === 'authenticated') {
      /* Về '/' chứ không về Bảng điều khiển: TrangMacDinh chọn trang theo ma
         trận. Trỏ cứng thì vai trò không mở được màn đó — đối tác là ca đầu
         tiên — rơi thẳng vào trang 404. */
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const user = await signIn(email, password);
      // Về '/' chứ không vào thẳng Bảng điều khiển: TrangMacDinh chọn trang
      // mở đầu theo ma trận, nên vai trò nào cũng rơi vào một trang mở được.
      navigate(user.mustChangePassword ? RoutePath.ChangePassword : '/', {
        replace: true,
      });
    } catch (error) {
      setErrorMessage(describeError(error));
      setIsSubmitting(false);
    }
  };

  const handleSelectDemoAccount = (demoEmail: string): void => {
    setEmail(demoEmail);
    setPassword(MOCK_PASSWORD);
    setErrorMessage(null);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Typography variant="h5" sx={{ mb: 0.5 }}>
        {t('auth.login.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('auth.login.subtitle')}
      </Typography>

      {errorMessage ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      ) : null}

      <Stack spacing={2}>
        <TextField
          label={t('auth.fields.email')}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="username"
          required
          fullWidth
        />
        <PasswordField
          label={t('auth.fields.password')}
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          isRequired
        />
        <Button type="submit" variant="contained" size="large" disabled={isSubmitting} fullWidth>
          {t('auth.login.submit')}
        </Button>
      </Stack>

      {/* Lối vào DUY NHẤT của trang đăng ký đối tác. Không có dòng này thì màn
          kia chỉ tới được bằng cách gõ tay đường dẫn — tức là không ai tới. */}
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2.5 }}>
        <Link component={RouterLink} to={RoutePath.PartnerSignup}>
          {t('partnerSignup.partnerLink')}
        </Link>
      </Typography>

      {isMockMode ? (
        <Box sx={{ mt: 3 }}>
          <Divider sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {t('auth.login.demoDivider')}
            </Typography>
          </Divider>
          <TextField
            select
            fullWidth
            label={t('auth.login.demoAccount')}
            value=""
            helperText={t('auth.login.demoHint')}
            onChange={(event) => handleSelectDemoAccount(event.target.value)}
          >
            {MOCK_USERS.map((user) => (
              <MenuItem key={user.id} value={user.email}>
                {user.fullName} · {user.roles.map((role) => t(ROLE_LABEL_KEY[role])).join(', ')}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      ) : null}
    </Box>
  );
}
