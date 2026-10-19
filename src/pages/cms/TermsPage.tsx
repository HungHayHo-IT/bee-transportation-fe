import { useCallback, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { ReactNode } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton,
  Stack, Switch, TextField, Tooltip, Typography,
} from '@mui/material';
import {
  IconArrowDown, IconArrowUp, IconEye, IconPencil, IconPlus, IconTrash,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { describeError } from '@/services/apiClient';
import {
  createTerm, deleteTerm, fetchTerms, fetchTermsFullText, updateTerm,
} from '@/services/termsService';
import type { DieuKhoan } from '@/services/termsService';

type DangSoan = { id: number | null; title: string; body: string } | null;

/**
 * Soạn điều khoản ký theo TỪNG ĐIỀU.
 *
 * Màn riêng chứ không nhét vào CmsPage: màn kia đã 1400 dòng và quản một thứ
 * khác hẳn — lớp phủ nội dung trang giới thiệu. Chung đường phân quyền ('cms')
 * là đủ gần.
 *
 * Số thứ tự KHÔNG cho sửa tay: nó do vị trí trong danh sách quyết định, và
 * backend đánh số lại lúc ghép. Cho sửa tay thì xoá một điều ở giữa là cả danh
 * sách lệch số mà không ai nhớ.
 */
export function TermsPage(): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();

  const load = useCallback(() => fetchTerms(), []);
  const resource = useAsyncResource<DieuKhoan[]>(load, [load]);
  const dieu = resource.data ?? [];

  const [soan, setSoan] = useState<DangSoan>(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [xemTruoc, setXemTruoc] = useState<string | null>(null);

  const chay = async (viec: () => Promise<unknown>, thongBao?: string): Promise<void> => {
    setDangLuu(true);
    try {
      await viec();
      resource.reload();
      if (thongBao !== undefined) enqueueSnackbar(thongBao, { variant: 'success' });
    } catch (error) {
      enqueueSnackbar(describeError(error), { variant: 'error' });
    } finally {
      setDangLuu(false);
    }
  };

  const luu = (): void => {
    if (soan === null) return;
    const { id, title, body } = soan;
    void chay(
      () => (id === null
        ? createTerm({ title: title.trim(), body: body.trim() })
        : updateTerm(id, { title: title.trim(), body: body.trim() })),
      t('terms.saved'),
    ).then(() => setSoan(null));
  };

  /* Đổi chỗ bằng cách HOÁN ĐỔI sortOrder của hai điều cạnh nhau. Gán lại cả
     dãy thì mỗi lần bấm là một loạt request, và hỏng giữa chừng để lại thứ tự
     dở dang. */
  const doiCho = (i: number, huong: -1 | 1): void => {
    const a = dieu[i];
    const b = dieu[i + huong];
    if (a === undefined || b === undefined) return;
    void chay(() => Promise.all([
      updateTerm(a.id, { sortOrder: b.sortOrder }),
      updateTerm(b.id, { sortOrder: a.sortOrder }),
    ]));
  };

  /* Hỏi lại bằng hộp thoại của chính ứng dụng, không phải `window.confirm`:
     hộp của trình duyệt mang tên miền vercel.app, nút tiếng Anh lẫn tiếng Việt,
     và khoá cả tab cho tới khi bấm xong. */
  const [hoiXoa, setHoiXoa] = useState<DieuKhoan | null>(null);

  const dangBat = dieu.filter((d) => d.isActive).length;

  return (
    <PageContainer
      title={t('nav.terms')}
      description={t('terms.description')}
      action={
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<IconEye size={18} />}
            onClick={() => {
              void fetchTermsFullText()
                .then(setXemTruoc)
                .catch((e: unknown) => enqueueSnackbar(describeError(e), { variant: 'error' }));
            }}
          >
            {t('terms.preview')}
          </Button>
          <Button
            variant="contained"
            startIcon={<IconPlus size={18} />}
            onClick={() => setSoan({ id: null, title: '', body: '' })}
          >
            {t('terms.add')}
          </Button>
        </Stack>
      }
    >
      {/* Không điều nào đang bật thì luồng ký NÉM LỖI chứ không gửi giấy
          trắng — nói trước ở đây thay vì để người dùng gặp lỗi lúc gửi khách. */}
      {dangBat > 0 ? null : <Alert severity="error">{t('terms.noneActive')}</Alert>}

      <SectionCard>
        {resource.errorMessage === null ? null : (
          <Alert severity="error" onClose={resource.clearError}>{resource.errorMessage}</Alert>
        )}
        <Stack spacing={1.5}>
          {dieu.length === 0 && !resource.isFirstLoad ? (
            <Typography color="text.secondary">{t('terms.empty')}</Typography>
          ) : null}

          {dieu.map((d, i) => (
            <Box
              key={d.id}
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                p: 1.5,
                opacity: d.isActive ? 1 : 0.55,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <Stack sx={{ minWidth: 0, flexGrow: 1 }}>
                  <Typography variant="subtitle2">{`${i + 1}. ${d.title}`}</Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ whiteSpace: 'pre-wrap' }}
                  >
                    {d.body}
                  </Typography>
                  {d.updatedByName === null ? null : (
                    <Typography variant="caption" color="text.disabled">
                      {t('terms.updatedBy', {
                        name: d.updatedByName,
                        at: new Date(d.updatedAt).toLocaleString(),
                      })}
                    </Typography>
                  )}
                </Stack>

                <Stack direction="row" spacing={0.25} alignItems="center">
                  <Tooltip title={t('terms.moveUp')}>
                    <span>
                      <IconButton
                        size="small"
                        disabled={i === 0 || dangLuu}
                        onClick={() => doiCho(i, -1)}
                      >
                        <IconArrowUp size={17} stroke={1.7} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={t('terms.moveDown')}>
                    <span>
                      <IconButton
                        size="small"
                        disabled={i === dieu.length - 1 || dangLuu}
                        onClick={() => doiCho(i, 1)}
                      >
                        <IconArrowDown size={17} stroke={1.7} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  {/* Tắt chứ không xoá khi chỉ muốn ngừng dùng: xoá là mất bản
                      đã soạn kỹ, còn chữ ký cũ vẫn giữ toàn văn riêng. */}
                  <Tooltip title={t('terms.toggleActive')}>
                    <Switch
                      size="small"
                      checked={d.isActive}
                      disabled={dangLuu}
                      onChange={() => void chay(() => updateTerm(d.id, { isActive: !d.isActive }))}
                    />
                  </Tooltip>
                  <Tooltip title={t('common.actions.edit')}>
                    <IconButton
                      size="small"
                      onClick={() => setSoan({ id: d.id, title: d.title, body: d.body })}
                    >
                      <IconPencil size={17} stroke={1.7} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('common.actions.delete')}>
                    <IconButton size="small" color="error" onClick={() => setHoiXoa(d)}>
                      <IconTrash size={17} stroke={1.7} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            </Box>
          ))}
        </Stack>
      </SectionCard>

      <Dialog open={soan !== null} onClose={() => setSoan(null)} fullWidth maxWidth="md">
        <DialogTitle>
          {soan?.id === null ? t('terms.addTitle') : t('terms.editTitle')}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              label={t('terms.fieldTitle')}
              value={soan?.title ?? ''}
              onChange={(e) => setSoan((s) => (s === null ? s : { ...s, title: e.target.value }))}
              autoFocus
              fullWidth
              required
            />
            <TextField
              label={t('terms.fieldBody')}
              value={soan?.body ?? ''}
              onChange={(e) => setSoan((s) => (s === null ? s : { ...s, body: e.target.value }))}
              helperText={t('terms.fieldBodyHint')}
              fullWidth
              required
              multiline
              minRows={8}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSoan(null)} disabled={dangLuu}>
            {t('common.actions.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={luu}
            disabled={
              dangLuu
              || (soan?.title.trim() ?? '') === ''
              || (soan?.body.trim() ?? '') === ''
            }
          >
            {t('common.actions.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Xem ĐÚNG văn bản khách sẽ đọc, lấy từ backend chứ không tự ghép lại ở
          đây: tự ghép là hai cách đánh số, và bản xem trước nói dối. */}
      <Dialog open={xemTruoc !== null} onClose={() => setXemTruoc(null)} fullWidth maxWidth="md">
        <DialogTitle>{t('terms.previewTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{xemTruoc}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setXemTruoc(null)}>{t('common.actions.close')}</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        isOpen={hoiXoa !== null}
        title={t('common.actions.delete')}
        description={hoiXoa === null ? undefined : t('terms.deleteConfirm', { name: hoiXoa.title })}
        isDestructive
        isSubmitting={dangLuu}
        onConfirm={() => {
          const d = hoiXoa;
          setHoiXoa(null);
          if (d !== null) void chay(() => deleteTerm(d.id), t('terms.deleted'));
        }}
        onClose={() => setHoiXoa(null)}
      />
    </PageContainer>
  );
}
