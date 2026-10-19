import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton,
  MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PublishIcon from '@mui/icons-material/Publish';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PhienStatusChip } from './PhienStatusChip';
import { describeError } from '@/services/apiClient';
import {
  activatePriceSession, createPriceSession, deletePriceSession,
} from '@/services/pricingService';
import type { PriceSession } from '@/types/pricing';

export interface PriceSessionsDialogProps {
  open: boolean;
  sessions: PriceSession[];
  canEdit: boolean;
  onClose: () => void;
  /** Gọi sau mỗi thay đổi để màn ngoài nạp lại danh sách và bảng giá. */
  onChanged: (chonPhienId?: number) => void;
}

/**
 * Quản lý phiên giá: tạo, công bố, xoá bản nháp.
 *
 * Một phiên mới thường không bắt đầu từ bảng trống mà CHÉP từ phiên đang áp
 * dụng rồi sửa vài dòng — nên ô "chép giá từ phiên" đứng ngay trong form tạo,
 * không phải một thao tác riêng sau đó.
 */
export function PriceSessionsDialog({
  open, sessions, canEdit, onClose, onChanged,
}: PriceSessionsDialogProps): ReactNode {
  const { t } = useTranslation();
  const [dangLam, setDangLam] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [moTao, setMoTao] = useState(false);
  /* Hỏi lại bằng hộp thoại của chính ứng dụng, không phải `window.confirm`:
     hộp của trình duyệt mang tên miền vercel.app, nút tiếng Anh lẫn tiếng
     Việt, và khoá cả tab cho tới khi bấm xong. Một hàng chờ xác nhận chứ
     không phải hai cờ riêng — thêm chỗ hỏi thứ ba cũng không đẻ thêm state. */
  const [hoi, setHoi] = useState<
    { title: string; description: string; isDestructive: boolean; lam: () => void } | null
  >(null);
  const [form, setForm] = useState({
    name: '',
    effectiveFrom: new Date().toISOString().slice(0, 10),
    copyFromSessionId: '' as string,
  });

  const lam = async (viec: () => Promise<unknown>, chonPhienId?: number): Promise<void> => {
    setDangLam(true);
    setLoi(null);
    try {
      await viec();
      onChanged(chonPhienId);
    } catch (e) {
      setLoi(describeError(e));
    } finally {
      setDangLam(false);
    }
  };

  /**
   * Mở form tạo phiên, chép sẵn từ một phiên cũ.
   *
   * Phiên đã lưu trữ KHÔNG bật lại được — đó là luật của vòng đời phiên, vì
   * bật lại làm bảng giá quay ngược về một bản cũ mà không để lại dấu vết nào
   * nói vì sao. Lối đi đúng là chép nó ra một phiên mới: việc đó có ngày
   * tháng, có người làm, và thành một dòng trong danh sách.
   *
   * Lối đi ấy vẫn luôn có, chỉ là nằm trong form "Tạo phiên mới" nên không ai
   * tìm ra khi đang nhìn vào dòng phiên cũ.
   */
  const chepRaPhienMoi = (nguon: PriceSession): void => {
    setForm({
      name: '',
      effectiveFrom: new Date().toISOString().slice(0, 10),
      copyFromSessionId: String(nguon.id),
    });
    setMoTao(true);
  };

  const tao = async (): Promise<void> => {
    await lam(async () => {
      const p = await createPriceSession({
        name: form.name.trim(),
        effectiveFrom: form.effectiveFrom,
        ...(form.copyFromSessionId ? { copyFromSessionId: Number(form.copyFromSessionId) } : {}),
      });
      setMoTao(false);
      setForm({ name: '', effectiveFrom: new Date().toISOString().slice(0, 10), copyFromSessionId: '' });
      return p;
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('pricing.sessionManage')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {loi ? <Alert severity="error" onClose={() => setLoi(null)}>{loi}</Alert> : null}

          {sessions.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t('pricing.sessionEmpty')}
            </Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('pricing.sessionLabel')}</TableCell>
                  <TableCell>{t('pricing.sessionEffectiveFrom')}</TableCell>
                  <TableCell align="right">{t('pricing.sessionCount', { count: 0 }).replace('0 ', '')}</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {sessions.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <span>{p.name}</span>
                        <PhienStatusChip status={p.status} />
                      </Stack>
                    </TableCell>
                    <TableCell>{p.effectiveFrom}</TableCell>
                    <TableCell align="right">{p.priceCount}</TableCell>
                    <TableCell align="right">
                      {canEdit ? (
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title={t('pricing.sessionCopyToNew')}>
                            <span>
                              <IconButton
                                size="small"
                                aria-label={t('pricing.sessionCopyToNew')}
                                disabled={dangLam}
                                onClick={() => chepRaPhienMoi(p)}
                              >
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          {p.status === 'draft' ? (
                            <>
                              <Button
                                size="small"
                                startIcon={<PublishIcon />}
                                disabled={dangLam || p.priceCount === 0}
                                onClick={() => setHoi({
                                  title: t('pricing.sessionActivateAsk', { name: p.name }),
                                  description: t('pricing.sessionActivateBody'),
                                  isDestructive: false,
                                  lam: () => void lam(() => activatePriceSession(p.id), p.id),
                                })}
                              >
                                {t('pricing.sessionActivate')}
                              </Button>
                              {/* Phiên CUỐI CÙNG không xoá được: hết phiên là
                                  hết bảng giá. Backend cũng chặn — ẩn ở đây
                                  chỉ để khỏi bấm rồi mới nhận câu từ chối. */}
                              <IconButton
                                size="small"
                                color="error"
                                disabled={dangLam || sessions.length <= 1}
                                onClick={() => setHoi({
                                  title: t('pricing.sessionDelete'),
                                  description: t('pricing.sessionDeleteAsk', { name: p.name }),
                                  isDestructive: true,
                                  lam: () => void lam(() => deletePriceSession(p.id)),
                                })}
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </>
                          ) : null}
                        </Stack>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {canEdit && !moTao ? (
            <Button startIcon={<AddIcon />} onClick={() => setMoTao(true)} sx={{ alignSelf: 'flex-start' }}>
              {t('pricing.sessionNew')}
            </Button>
          ) : null}

          {canEdit && moTao ? (
            <Stack spacing={2} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <TextField
                label={t('pricing.sessionLabel')}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                size="small"
                autoFocus
                fullWidth
              />
              <TextField
                label={t('pricing.sessionEffectiveFrom')}
                type="date"
                value={form.effectiveFrom}
                onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <TextField
                select
                label={t('pricing.sessionCopyFrom')}
                value={form.copyFromSessionId}
                onChange={(e) => setForm((f) => ({ ...f, copyFromSessionId: e.target.value }))}
                size="small"
                fullWidth
              >
                <MenuItem value="">{t('pricing.sessionCopyNone')}</MenuItem>
                {sessions.map((p) => (
                  <MenuItem key={p.id} value={String(p.id)}>
                    {p.name} ({p.priceCount})
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          ) : null}
        </Stack>
        <ConfirmDialog
          isOpen={hoi !== null}
          title={hoi?.title ?? ''}
          description={hoi?.description}
          isDestructive={hoi?.isDestructive ?? false}
          isSubmitting={dangLam}
          onConfirm={() => { hoi?.lam(); setHoi(null); }}
          onClose={() => setHoi(null)}
        />
      </DialogContent>
      {/* Lưu đứng cạnh Đóng ở chân hộp thoại, không nằm lọt trong khung form:
          chân hộp thoại là chỗ mắt đi tới khi đã điền xong, và là chỗ nút
          Đóng vốn đã ở đó. Bỏ nút Huỷ — Đóng làm đúng việc ấy, hai nút cùng
          nghĩa cạnh nhau chỉ bắt người ta dừng lại chọn. */}
      <DialogActions>
        <Button onClick={onClose}>{t('common.actions.close')}</Button>
        {canEdit && moTao ? (
          <Button
            variant="contained"
            onClick={() => void tao()}
            disabled={dangLam || form.name.trim().length < 2}
          >
            {t('common.actions.save')}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
