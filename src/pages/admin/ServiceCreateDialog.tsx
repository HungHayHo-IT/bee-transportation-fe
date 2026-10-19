import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { describeError } from '@/services/apiClient';
import { createService } from '@/services/organisationService';

export interface ServiceCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

/** Mỗi dòng một mốc; dòng trắng bị bỏ qua để dán từ Word không sinh mốc rỗng. */
function tachMoc(raw: string): string[] {
  return raw.split('\n').map((d) => d.trim()).filter((d) => d !== '');
}

export function ServiceCreateDialog({
  isOpen,
  onClose,
  onCreated,
}: ServiceCreateDialogProps): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [slaHours, setSlaHours] = useState('24');
  const [milestonesRaw, setMilestonesRaw] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const milestones = tachMoc(milestonesRaw);
  // Backend đòi mã ba chữ in hoa và ít nhất một mốc. Chặn ngay tại nút thay vì
  // để người dùng bấm rồi đọc lỗi 400 — cùng một luật, nói sớm hơn một bước.
  const hopLe = /^[A-Z]{3}$/.test(code) && name.trim() !== '' && milestones.length > 0;

  const dong = (): void => {
    setCode('');
    setName('');
    setSlaHours('24');
    setMilestonesRaw('');
    setErrorMessage(null);
    onClose();
  };

  const luu = async (): Promise<void> => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await createService({
        code,
        name: name.trim(),
        slaHours: Number(slaHours) || 24,
        milestones,
      });
      enqueueSnackbar(t('common.states.saved'), { variant: 'success' });
      onCreated();
      dong();
    } catch (error) {
      setErrorMessage(describeError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} fullWidth maxWidth="sm" onClose={dong}>
      <DialogTitle>{t('admin.services.createTitle')}</DialogTitle>
      <DialogContent dividers>
        {errorMessage !== null ? (
          <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>
        ) : null}
        <Stack spacing={2.5} sx={{ mt: 0.5 }}>
          <TextField
            label={t('admin.services.code')}
            value={code}
            // Gõ thường vẫn ra hoa: luật ba chữ in hoa là của hệ thống, không
            // phải bài kiểm tra bàn phím.
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 3))}
            helperText={t('admin.services.codeHint')}
            inputProps={{ maxLength: 3 }}
          />
          <TextField
            label={t('admin.services.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label={t('admin.services.sla')}
            type="number"
            value={slaHours}
            onChange={(e) => setSlaHours(e.target.value)}
            inputProps={{ min: 1, max: 720 }}
          />
          <TextField
            label={t('admin.services.milestones')}
            value={milestonesRaw}
            onChange={(e) => setMilestonesRaw(e.target.value)}
            helperText={t('admin.services.milestonesHint')}
            multiline
            minRows={4}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={dong}>{t('common.actions.cancel')}</Button>
        <Button
          variant="contained"
          disabled={!hopLe || isSubmitting}
          onClick={() => void luu()}
        >
          {t('common.actions.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
