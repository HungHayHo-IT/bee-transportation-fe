import { useRef, useState, type ReactNode } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography,
} from '@mui/material';
import { IconArrowBackUp, IconUpload } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { describeError } from '@/services/apiClient';
import { uploadCmsImage, type CmsImageSlot } from '@/services/cmsService';

export interface CmsImageDialogProps {
  /** Ô ảnh vừa được bấm trên trang. `null` thì hộp đóng. */
  slot: CmsImageSlot | null;
  /** URL đang dùng, nếu đã từng thay. */
  url: string | undefined;
  landingUrl: string;
  onChange: (slot: string, url: string) => void;
  onReset: (slot: string) => void;
  onClose: () => void;
}

/**
 * Hộp thay một tấm ảnh, mở ra khi bấm vào chính tấm ảnh đó trên trang.
 *
 * Vì sao có hộp này khi đã có lưới ảnh: lưới nằm trong ngăn "Danh sách ô", mà
 * ngăn đó tắt mặc định — nên người sửa nhìn thấy tấm ảnh cần thay ngay trước
 * mắt lại không có đường nào chạm tới. Bấm vào ảnh là đường ngắn nhất, và nó
 * bỏ luôn bước khó nhất của lưới: đoán xem "Ảnh nền hero" là tấm nào.
 *
 * Dùng chung đúng một luồng tải lên với lưới ảnh, nên ảnh thay ở đây hay ở kia
 * cũng ra cùng một chỗ trong bản nháp.
 */
export function CmsImageDialog({
  slot, url, landingUrl, onChange, onReset, onClose,
}: CmsImageDialogProps): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const [dangTai, setDangTai] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const chon = async (file: File | undefined): Promise<void> => {
    if (!file || !slot) return;
    setDangTai(true);
    try {
      onChange(slot.slot, await uploadCmsImage(file));
      enqueueSnackbar(t('cms.uploaded'), { variant: 'success' });
      onClose();
    } catch (error) {
      enqueueSnackbar(describeError(error), { variant: 'error' });
    } finally {
      setDangTai(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <Dialog open={slot !== null} onClose={onClose} maxWidth="sm" fullWidth>
      {slot ? (
        <>
          <DialogTitle>{slot.label}</DialogTitle>
          <DialogContent dividers>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {slot.usage}
            </Typography>
            <Box
              sx={{
                mt: 1.5, height: 260, bgcolor: 'action.hover', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Box
                component="img"
                src={url || `${landingUrl}${slot.defaultUrl}`}
                alt={slot.label}
                sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </Box>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                startIcon={<IconUpload size={16} />}
                disabled={dangTai}
                onClick={() => inputRef.current?.click()}
              >
                {dangTai ? t('cms.uploading') : t('cms.upload')}
              </Button>
              <Button
                color="inherit"
                startIcon={<IconArrowBackUp size={16} />}
                disabled={!url}
                onClick={() => { onReset(slot.slot); onClose(); }}
              >
                {t('cms.reset')}
              </Button>
            </Stack>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              onChange={(e) => void chon(e.target.files?.[0])}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>{t('common.actions.close')}</Button>
          </DialogActions>
        </>
      ) : null}
    </Dialog>
  );
}
