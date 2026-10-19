import type { ReactNode } from 'react';
import {
  Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  List, ListItem, ListItemText, Stack, Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

export interface KetQuaNhap {
  /** Câu tóm tắt ngắn, do màn gọi tự dựng vì mỗi loại file đếm một kiểu. */
  tomTat: string;
  /** Dòng bị bỏ, in NGUYÊN VĂN. */
  skipped: string[];
  /** Việc hệ thống tự làm — ví dụ thêm đơn vị tính mới từ tiêu đề cột. */
  notes?: string[];
  /** Có gì vào thật hay không: quyết định màu của câu tóm tắt. */
  thanhCong: boolean;
}

export interface KetQuaNhapDialogProps {
  /** true khi đang nhập: hộp thoại hiện vòng quay và không đóng được. */
  dangChay: boolean;
  ketQua: KetQuaNhap | null;
  onClose: () => void;
}

/**
 * Kết quả nhập Excel — một hộp thoại, không phải một chuỗi toast.
 *
 * Một lần nhập có thể sinh ra cả chục thông báo: câu tóm tắt, mấy dòng hệ
 * thống tự làm, rồi từng dòng bị bỏ kèm lý do. Toast tự tắt sau vài giây và
 * chồng lên nhau, nên người nhập chỉ kịp đọc cái cuối — mà cái họ cần lại là
 * danh sách dòng hỏng, thứ duy nhất nói họ phải sửa gì trong file.
 *
 * Cũng chính hộp thoại này che màn hình lúc đang nhập: một file sáu trăm dòng
 * mất vài giây, không có gì báo thì người ta bấm lại lần nữa.
 */
export function KetQuaNhapDialog({
  dangChay, ketQua, onClose,
}: KetQuaNhapDialogProps): ReactNode {
  const { t } = useTranslation();
  if (!dangChay && ketQua === null) return null;

  return (
    <Dialog
      open
      // Đang chạy thì không cho đóng: đóng đi rồi cũng không dừng được việc ở
      // máy chủ, chỉ làm người dùng tưởng mình vừa huỷ.
      onClose={dangChay ? undefined : onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>{t(dangChay ? 'pricing.importRunning' : 'pricing.importResult')}</DialogTitle>
      <DialogContent dividers>
        {dangChay ? (
          <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 2 }}>
            <CircularProgress size={24} />
            <Typography variant="body2" color="text.secondary">
              {t('pricing.importRunningHint')}
            </Typography>
          </Stack>
        ) : ketQua === null ? null : (
          <Stack spacing={2}>
            <Alert severity={ketQua.thanhCong ? 'success' : 'warning'}>{ketQua.tomTat}</Alert>

            {(ketQua.notes ?? []).length === 0 ? null : (
              <Alert severity="info">
                {(ketQua.notes ?? []).map((n) => <div key={n}>{n}</div>)}
              </Alert>
            )}

            {ketQua.skipped.length === 0 ? null : (
              <>
                <Typography variant="subtitle2">
                  {t('pricing.importSkipped', { count: ketQua.skipped.length })}
                </Typography>
                {/* In ĐỦ, không cắt bớt: cắt là bắt người ta mở file ra tự dò
                    xem còn dòng nào nữa. Dài thì cuộn. */}
                <List dense disablePadding sx={{ maxHeight: 320, overflow: 'auto' }}>
                  {ketQua.skipped.map((l, i) => (
                    <ListItem key={`${i}-${l}`} disableGutters sx={{ py: 0.25 }}>
                      <ListItemText
                        primary={l}
                        primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={dangChay}>{t('common.actions.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}
