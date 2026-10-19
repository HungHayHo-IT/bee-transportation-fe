import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  Alert, Box, Button, Link, Stack, Step, StepLabel, Stepper, TextField, Typography,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PasswordField } from '@/components/form/PasswordField';
import { RoutePath } from '@/routes/routePaths';
import { describeError } from '@/services/apiClient';
import { guiMaDoiTac, kiemMaDoiTac, taoTaiKhoanDoiTac } from '@/services/authService';

/** Ba bước, mỗi bước một màn. Bước 4 chỉ là lời báo xong. */
type Buoc = 0 | 1 | 2 | 3;

/**
 * Người của Bee Logistics tự mở tài khoản xem đơn.
 *
 * Tách ba bước chứ không gộp một form: gộp lại thì mã sai là bắt gõ lại cả họ
 * tên lẫn mật khẩu. Bước 2 đổi mã lấy một tấm VÉ sống 10 phút, bước 3 chỉ cần
 * vé — và vé mang sẵn email, nên bước cuối không có ô email để gõ nhầm hay
 * sửa thành địa chỉ khác.
 */
export function PartnerSignupPage(): ReactNode {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [buoc, setBuoc] = useState<Buoc>(0);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [ticket, setTicket] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [choGuiLai, setChoGuiLai] = useState(0);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangGui, setDangGui] = useState(false);

  // Đếm ngược cho nút gửi lại. Máy chủ chặn 60s giữa hai lần gửi cùng email;
  // không đếm ở đây thì người dùng bấm lại và nhận 429 mà không hiểu vì sao.
  useEffect(() => {
    if (choGuiLai <= 0) return undefined;
    const id = setTimeout(() => setChoGuiLai((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [choGuiLai]);

  const chay = async (viec: () => Promise<void>): Promise<void> => {
    setDangGui(true);
    setLoi(null);
    try {
      await viec();
    } catch (error) {
      setLoi(describeError(error));
    } finally {
      setDangGui(false);
    }
  };

  const guiMa = (e?: FormEvent): void => {
    e?.preventDefault();
    void chay(async () => {
      setChoGuiLai(await guiMaDoiTac(email));
      setBuoc(1);
    });
  };

  const kiemMa = (e: FormEvent): void => {
    e.preventDefault();
    void chay(async () => {
      setTicket(await kiemMaDoiTac(email, code));
      setBuoc(2);
    });
  };

  const taoTaiKhoan = (e: FormEvent): void => {
    e.preventDefault();
    void chay(async () => {
      await taoTaiKhoanDoiTac(ticket, fullName, password);
      setBuoc(3);
    });
  };

  return (
    <Stack spacing={3} sx={{ width: '100%' }}>
      <Box>
        <Typography variant="h5" fontWeight={700}>{t('partnerSignup.title')}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t('partnerSignup.subtitle')}
        </Typography>
      </Box>

      <Stepper activeStep={Math.min(buoc, 2)} alternativeLabel>
        <Step><StepLabel>{t('partnerSignup.stepEmail')}</StepLabel></Step>
        <Step><StepLabel>{t('partnerSignup.stepCode')}</StepLabel></Step>
        <Step><StepLabel>{t('partnerSignup.stepPassword')}</StepLabel></Step>
      </Stepper>

      {loi === null ? null : <Alert severity="error">{loi}</Alert>}

      {buoc === 0 ? (
        <form onSubmit={guiMa}>
          <Stack spacing={2}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              helperText={t('partnerSignup.emailHint')}
              required
              fullWidth
              autoFocus
            />
            <Button type="submit" variant="contained" disabled={dangGui || email.trim() === ''}>
              {t('partnerSignup.sendCode')}
            </Button>
          </Stack>
        </form>
      ) : null}

      {buoc === 1 ? (
        <form onSubmit={kiemMa}>
          <Stack spacing={2}>
            <Alert severity="info">{t('partnerSignup.codeSent', { email })}</Alert>
            <TextField
              label={t('partnerSignup.code')}
              value={code}
              // Chỉ nhận chữ số và cắt đúng 6: dán cả dòng "Mã của bạn: 418203"
              // từ email vào thì vẫn ra đúng mã.
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              fullWidth
              autoFocus
              inputProps={{ inputMode: 'numeric', maxLength: 6 }}
            />
            <Button type="submit" variant="contained" disabled={dangGui || code.length !== 6}>
              {t('partnerSignup.checkCode')}
            </Button>
            <Stack direction="row" spacing={2} justifyContent="space-between">
              <Button size="small" onClick={() => setBuoc(0)} disabled={dangGui}>
                {t('partnerSignup.back')}
              </Button>
              <Button size="small" onClick={() => guiMa()} disabled={dangGui || choGuiLai > 0}>
                {choGuiLai > 0
                  ? t('partnerSignup.resendIn', { seconds: choGuiLai })
                  : t('partnerSignup.resend')}
              </Button>
            </Stack>
          </Stack>
        </form>
      ) : null}

      {buoc === 2 ? (
        <form onSubmit={taoTaiKhoan}>
          <Stack spacing={2}>
            {/* Email hiện ra để đọc, KHÔNG cho sửa: máy chủ lấy email từ vé, ô
                sửa được ở đây chỉ tạo ảo giác là đổi được. */}
            <TextField label="Email" value={email} disabled fullWidth />
            <TextField
              label={t('partnerSignup.fullName')}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              fullWidth
              autoFocus
            />
            <PasswordField
              label={t('partnerSignup.password')}
              value={password}
              onChange={setPassword}
              helperText={t('partnerSignup.passwordHint')}
              autoComplete="new-password"
              isRequired
            />
            <Button
              type="submit"
              variant="contained"
              disabled={dangGui || fullName.trim() === '' || password.length < 8}
            >
              {t('partnerSignup.createAccount')}
            </Button>
            <Button size="small" onClick={() => setBuoc(1)} disabled={dangGui}>
              {t('partnerSignup.back')}
            </Button>
          </Stack>
        </form>
      ) : null}

      {buoc === 3 ? (
        <Stack spacing={2}>
          <Alert severity="success">{t('partnerSignup.done', { email })}</Alert>
          <Button variant="contained" onClick={() => navigate(RoutePath.Login)}>
            {t('partnerSignup.toLogin')}
          </Button>
        </Stack>
      ) : null}

      {buoc === 3 ? null : (
        <Typography variant="body2" color="text.secondary">
          {t('partnerSignup.haveAccount')}{' '}
          <Link component={RouterLink} to={RoutePath.Login}>{t('partnerSignup.toLogin')}</Link>
        </Typography>
      )}
    </Stack>
  );
}
