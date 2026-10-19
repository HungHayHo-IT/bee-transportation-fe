import { useEffect, useState, type ReactNode } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

export interface CmsFieldDialogProps {
  /** Khoá ô vừa bấm trên trang. `null` thì hộp đóng. */
  keyPath: string | null;
  label: string;
  /** Giá trị đang dùng (đã tính cả phần đang gõ dở). */
  value: string;
  /** Bản mặc định trong code, hiện bên dưới khi khác giá trị đang dùng. */
  fallback: string;
  onSave: (value: string) => void;
  onClose: () => void;
}

/** Dài hơn ngần này thì ô nhập nhiều dòng — cùng ngưỡng với danh sách ô. */
const NGUONG_NHIEU_DONG = 90;

/**
 * Hộp sửa MỘT ô, mở ra khi bấm vào một chỗ không gõ thẳng lên trang được.
 *
 * Chỗ đầu tiên cần đến nó là chữ gợi ý trong ô nhập của biểu mẫu báo giá: nó
 * nằm trong thuộc tính `placeholder`, không phải chữ trong trang, nên không có
 * gì để đặt con trỏ vào. Trước đây những ô như vậy chỉ sửa được ở danh sách ô,
 * mà danh sách ô thì tắt mặc định — nhìn thấy chữ ngay trước mắt lại không có
 * đường nào chạm tới.
 *
 * Giữ bản nháp trong chính hộp: bấm Huỷ là bỏ, không dây vào `nhap` của trang.
 */
export function CmsFieldDialog({
  keyPath, label, value, fallback, onSave, onClose,
}: CmsFieldDialogProps): ReactNode {
  const { t } = useTranslation();
  const [nhap, setNhap] = useState('');

  // Nạp lại mỗi lần mở một ô khác, nếu không hộp giữ chữ của ô mở lần trước.
  useEffect(() => {
    if (keyPath !== null) setNhap(value);
  }, [keyPath, value]);

  const nhieuDong = fallback.length > NGUONG_NHIEU_DONG || nhap.length > NGUONG_NHIEU_DONG;

  return (
    <Dialog open={keyPath !== null} onClose={onClose} maxWidth="sm" fullWidth>
      {keyPath !== null ? (
        <>
          <DialogTitle>{label}</DialogTitle>
          <DialogContent dividers>
            <TextField
              value={nhap}
              onChange={(e) => setNhap(e.target.value)}
              fullWidth
              autoFocus
              size="small"
              multiline={nhieuDong}
              minRows={nhieuDong ? 2 : undefined}
              maxRows={nhieuDong ? 10 : undefined}
            />
            {nhap !== fallback ? (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 1, whiteSpace: 'pre-wrap' }}
              >
                {t('cms.defaultIs')}: {fallback}
              </Typography>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>{t('common.actions.cancel')}</Button>
            <Button
              variant="contained"
              onClick={() => {
                onSave(nhap);
                onClose();
              }}
            >
              {t('common.actions.confirm')}
            </Button>
          </DialogActions>
        </>
      ) : null}
    </Dialog>
  );
}
