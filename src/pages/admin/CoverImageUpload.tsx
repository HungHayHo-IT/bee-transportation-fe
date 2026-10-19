import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Box, Button, IconButton, Stack, Typography } from '@mui/material';
import { IconTrash, IconUpload } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { uploadNewsImage } from '@/services/newsService';

export interface CoverImageUploadProps {
  value: string;
  onChange: (url: string) => void;
}

/**
 * Ô upload cho ảnh bìa: click → chọn file → upload → nhận URL từ BE → gán vào
 * form. Nếu đã có URL thì hiển thị preview + nút xoá. Không tự xoá file trên
 * server khi bỏ (giữ đơn giản; sau này có cron dọn orphan ảnh sẽ dọn hộ).
 */
export function CoverImageUpload(props: CoverImageUploadProps): ReactNode {
  const { value, onChange } = props;
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = (): void => fileRef.current?.click();

  const handle = async (file: File): Promise<void> => {
    setUploading(true); setError(null);
    try {
      const { url } = await uploadNewsImage(file);
      onChange(url);
    } catch {
      setError(t('news.form.coverUploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
        {t('news.form.coverImage')}
      </Typography>
      <input
        ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) await handle(f);
        }}
      />
      {value ? (
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Box
            component="img" src={value} alt=""
            sx={{
              width: 200, height: 120, objectFit: 'cover',
              borderRadius: 1.5, border: '1px solid', borderColor: 'divider',
            }}
          />
          <Stack spacing={0.5}>
            <Button size="small" variant="outlined" startIcon={<IconUpload size={16} />}
              onClick={pick} disabled={uploading}>
              {t('news.form.coverReplace')}
            </Button>
            <IconButton size="small" color="error" onClick={() => onChange('')}
              aria-label={t('news.form.coverRemove')}>
              <IconTrash size={16} />
            </IconButton>
          </Stack>
        </Stack>
      ) : (
        <Button
          variant="outlined" startIcon={<IconUpload size={16} />}
          onClick={pick} disabled={uploading}
        >
          {uploading ? t('news.form.coverUploading') : t('news.form.coverUpload')}
        </Button>
      )}
      {error ? <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert> : null}
    </Box>
  );
}
