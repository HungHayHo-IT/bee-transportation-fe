import { useEffect, useState, type ReactNode } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Stack, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { createLandingService } from '@/services/organisationService';
import { saveCmsContent, type CmsLocale } from '@/services/cmsService';
import { CmsServiceForm } from './CmsServiceForm';
import { CmsServicePreview } from './CmsServicePreview';
import { noiDungRong, oNoiDung, type NoiDungDichVu } from './noiDungDichVu';
import { SLUG_HOP_LE, slugTuTen } from './slugTuTen';

export interface CmsAddServiceDialogProps {
  open: boolean;
  onClose: () => void;
  /** Ngôn ngữ đang sửa — nội dung điền ở đây lưu vào đúng bản đó. */
  locale: CmsLocale;
  /** Đường dẫn của những trang đang có — để chặn trùng trước khi gọi backend. */
  duongDanDaCo: readonly string[];
  onAdded: (landingKey: string) => void | Promise<void>;
}

/**
 * Thêm dịch vụ mới: điền hết nội dung trong MỘT lần.
 *
 * Trái là trang sẽ hiện ra như thế nào, phải là chỗ điền. Đặt xem trước bên
 * trái vì mắt đọc từ trái sang: nhìn kết quả trước, rồi tới ô đang sửa.
 *
 * Tạo dịch vụ và lưu nội dung là HAI bước gọi, nhưng thất bại ở bước hai
 * không làm hỏng bước một: dịch vụ đã có, trang đã chạy bằng chữ mồi, và
 * người dùng sửa tiếp ở màn Nội dung. Vì thế bước hai chỉ cảnh báo chứ không
 * lôi ngược mọi thứ về.
 */
export function CmsAddServiceDialog({
  open, onClose, locale, duongDanDaCo, onAdded,
}: CmsAddServiceDialogProps): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  const hep = useMediaQuery(theme.breakpoints.down('md'));

  const [nd, setNd] = useState<NoiDungDichVu>(noiDungRong);
  const [tuSua, setTuSua] = useState({ vi: false, en: false });
  const [loi, setLoi] = useState<string | null>(null);
  const [dangLuu, setDangLuu] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNd(noiDungRong());
    setTuSua({ vi: false, en: false });
    setLoi(null);
  }, [open]);

  const doi = (sua: Partial<NoiDungDichVu>): void => {
    // Sửa tay ô đường dẫn thì từ đó tên không còn ghi đè lên nữa — đó là chữ
    // người dùng vừa cân nhắc.
    if (sua.slugVi !== undefined) setTuSua((s) => ({ ...s, vi: true }));
    if (sua.slugEn !== undefined) setTuSua((s) => ({ ...s, en: true }));
    setNd((cu) => ({ ...cu, ...sua }));
  };

  const doiTen = (v: string): void => {
    setNd((cu) => ({
      ...cu,
      ten: v,
      slugVi: tuSua.vi ? cu.slugVi : slugTuTen(v),
      slugEn: tuSua.en ? cu.slugEn : slugTuTen(v),
    }));
  };

  const loiSlug = (s: string): string => {
    if (s && !SLUG_HOP_LE.test(s)) return t('cms.addService.slugShape');
    if (duongDanDaCo.includes(s)) return t('cms.addService.slugTaken');
    return '';
  };
  const loiVi = loiSlug(nd.slugVi);
  const loiEn = loiSlug(nd.slugEn);
  const duocLuu = nd.ten.trim().length > 0 && !!nd.slugVi && !!nd.slugEn && !loiVi && !loiEn;

  const luu = async (): Promise<void> => {
    setDangLuu(true);
    setLoi(null);
    try {
      const sv = await createLandingService({
        name: nd.ten.trim(), slugVi: nd.slugVi, slugEn: nd.slugEn,
      });
      if (!sv.landingKey) throw new Error('no-key');

      const o = oNoiDung(sv.landingKey, nd);
      if (o.length > 0) {
        try {
          await saveCmsContent(locale, o);
        } catch {
          // Dịch vụ đã tạo xong rồi — báo cho biết phần chữ chưa lưu được,
          // đừng để người dùng tưởng cả việc thất bại và bấm Thêm lần nữa.
          setLoi(t('cms.addService.contentFailed'));
        }
      }
      await onAdded(sv.landingKey);
      onClose();
    } catch (e) {
      const http = (e as { response?: { data?: { error?: { message?: string } } } })
        .response?.data?.error?.message;
      setLoi(http ?? t('cms.addService.failed'));
    } finally {
      setDangLuu(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={dangLuu ? undefined : onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={hep}
    >
      <DialogTitle>{t('cms.addService.title')}</DialogTitle>
      <DialogContent dividers>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
          {/* Trái: trang sẽ hiện ra như thế nào. Dính theo khi cuộn form bên
              phải — cuộn tới ô thứ hai mươi mà bản xem trước đã trôi mất thì
              nó không còn xem được cái gì. */}
          <Box
            sx={{
              flex: { md: '0 0 42%' }, width: '100%', minWidth: 0,
              position: { md: 'sticky' }, top: { md: 0 },
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              {t('cms.addService.previewTitle')}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              {t('cms.addService.previewHint')}
            </Typography>
            <CmsServicePreview nd={nd} />
          </Box>

          {/* Phải: chỗ điền. */}
          <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
            <CmsServiceForm
              nd={nd}
              doi={doi}
              doiTen={doiTen}
              loiSlugVi={loiVi}
              loiSlugEn={loiEn}
            />
            {loi ? <Alert severity="error" sx={{ mt: 2 }}>{loi}</Alert> : null}
            <Alert severity="info" sx={{ mt: 2, py: 0.5 }}>
              {t('cms.addService.beeopsNote')}
            </Alert>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto', pl: 1 }}>
          {t('cms.addService.optionalNote')}
        </Typography>
        <Button onClick={onClose} disabled={dangLuu} color="inherit">
          {t('common.actions.cancel')}
        </Button>
        <Button
          onClick={() => void luu()}
          disabled={!duocLuu || dangLuu}
          variant="contained"
          startIcon={dangLuu ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {t('cms.addService.submit')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
