import type { ReactNode } from 'react';
import { Box, Stack, Switch, TextField, Tooltip, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

export interface KenhMangXaHoi {
  key: string;
  label: string;
  /** Đường `path` trong khung 24x24, do landing gửi sang. */
  icon: string;
}

export interface CmsSocialEditorProps {
  kenh: KenhMangXaHoi[];
  /** Địa chỉ đang dùng của một kênh (đã tính cả phần gõ dở). */
  giaTri: (keyPath: string) => string;
  /** Chuỗi khoá các kênh đang tắt — ô `social.off`. */
  tat: string;
  onDoiDiaChi: (keyPath: string, value: string) => void;
  onDoiTat: (value: string) => void;
  lng?: string;
}

/**
 * Bật/tắt và điền địa chỉ cho từng kênh mạng xã hội.
 *
 * Trước đây năm kênh là năm ô chữ rời, và cách duy nhất để ẩn một kênh là xoá
 * trống địa chỉ — tức là mất luôn địa chỉ đó. Tắt tạm một kênh (trang đang
 * sửa, fanpage đang khoá) là việc thường, nên nó phải là một cú gạt chứ không
 * phải một lần xoá.
 *
 * Biểu tượng vẽ ngay cạnh công tắc: tên kênh thì ai cũng đọc được, nhưng thứ
 * người sửa sẽ thấy trên trang là cái hình, nên cho họ nhìn đúng cái hình đó.
 */
export function CmsSocialEditor({
  kenh, giaTri, tat, onDoiDiaChi, onDoiTat, lng,
}: CmsSocialEditorProps): ReactNode {
  const { t: tGoc } = useTranslation();
  const t = (key: string, opts?: Record<string, unknown>): string =>
    tGoc(key, { ...opts, ...(lng ? { lng } : {}) });

  const dangTat = new Set(
    tat
      .split(/[\s,]+/)
      .map((x) => x.trim())
      .filter(Boolean),
  );

  const gat = (key: string, bat: boolean): void => {
    const moi = new Set(dangTat);
    if (bat) moi.delete(key);
    else moi.add(key);
    // Giữ đúng thứ tự khai trong code, để giá trị lưu xuống luôn ổn định thay
    // vì đổi theo thứ tự người dùng bấm.
    onDoiTat(kenh.filter((k) => moi.has(k.key)).map((k) => k.key).join(' '));
  };

  return (
    <Box sx={{ py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Typography variant="caption" fontWeight={600} sx={{ display: 'block', mb: 0.75 }}>
        {t('cms.socialChannels')}
      </Typography>

      <Stack spacing={1}>
        {kenh.map(({ key, label, icon }) => {
          const o = `social.${key}`;
          const bat = !dangTat.has(key);
          return (
            <Stack key={key} direction="row" spacing={0.75} alignItems="center">
              <Tooltip title={label}>
                <Box
                  component="svg"
                  viewBox="0 0 24 24"
                  sx={{
                    width: 20,
                    height: 20,
                    flexShrink: 0,
                    // Kênh đang tắt thì hình mờ đi — nhìn một lượt là biết
                    // kênh nào đang hiện trên trang.
                    color: bat ? 'text.primary' : 'text.disabled',
                    fill: 'currentColor',
                  }}
                >
                  <path d={icon} />
                </Box>
              </Tooltip>
              <TextField
                label={label}
                value={giaTri(o)}
                onChange={(e) => onDoiDiaChi(o, e.target.value)}
                fullWidth
                size="small"
                placeholder="https://"
                disabled={!bat}
              />
              <Tooltip title={bat ? t('cms.socialOn') : t('cms.socialOff')}>
                <Switch size="small" checked={bat} onChange={(e) => gat(key, e.target.checked)} />
              </Tooltip>
            </Stack>
          );
        })}
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
        {t('cms.socialHint')}
      </Typography>
    </Box>
  );
}
