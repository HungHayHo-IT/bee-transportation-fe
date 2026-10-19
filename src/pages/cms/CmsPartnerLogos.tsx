import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert, Box, Button, CircularProgress, IconButton, Stack, Switch, Tooltip, Typography,
} from '@mui/material';
import { IconArrowDown, IconArrowUp, IconGripVertical, IconPlus, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { describeError } from '@/services/apiClient';
import { uploadCmsImage } from '@/services/cmsService';
import {
  createPartnerLogo, deletePartnerLogo, doTiLe, fetchPartnerLogos, reorderPartnerLogos,
  updatePartnerLogo, type PartnerLogo,
} from '@/services/partnerLogoService';

export interface CmsPartnerLogosProps {
  /** Gốc landing — logo có sẵn lưu đường dẫn tương đối '/img/logos/...'. */
  landingUrl: string;
  /** false = người chỉ được XEM màn CMS: thấy danh sách, không có nút nào. */
  coTheSua: boolean;
  /**
   * Gọi sau MỖI lần ghi thành công (thêm, xoá, bật/tắt, đổi tên, đổi thứ tự)
   * để khung xem trước tải lại. Logo không đi qua bản nháp, nên khung không có
   * cách nào tự biết; backend đã bảo landing bỏ cache trước khi trả lời, nên
   * tải lại là thấy ngay.
   */
  onDaDoi?: () => void;
}

const NHOM: PartnerLogo['group'][] = ['customer', 'membership'];
/** Loại file nhận — đúng những gì landing vẽ được bằng <img>. */
const NHAN_FILE = 'image/svg+xml,image/png,image/webp,image/jpeg';

/**
 * Quản lý logo hai dải đối tác trên trang chủ: thêm, xoá, bật/tắt.
 *
 * KHÔNG đi theo luồng "sửa nháp rồi bấm Lưu" của phần còn lại màn CMS: mỗi
 * thao tác ghi thẳng xuống BeeOps và landing được làm mới ngay. Logo không có
 * bản nháp — tải lên một tấm ảnh rồi còn phải nhớ bấm Lưu lần nữa là chỗ để
 * người ta tưởng đã xong.
 *
 * Ô xem trước nền TỐI, giống hệt dải trên trang chủ: logo mực đen sẽ chìm
 * ngay tại đây, trước khi nó chìm trước mặt khách.
 */
export function CmsPartnerLogos({ landingUrl, coTheSua, onDaDoi }: CmsPartnerLogosProps): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const [logo, setLogo] = useState<PartnerLogo[] | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangTai, setDangTai] = useState<PartnerLogo['group'] | null>(null);
  const [dangXoa, setDangXoa] = useState<PartnerLogo | null>(null);
  const [banXoa, setBanXoa] = useState(false);
  /* Kéo thả bằng HTML5 sẵn có của trình duyệt, như màn Kanban — không thêm
     thư viện cho một danh sách vài chục dòng. `keo` là dòng đang được kéo,
     `qua` là dòng con trỏ đang đè lên (để vẽ vạch chỉ chỗ thả). */
  const [keo, setKeo] = useState<PartnerLogo | null>(null);
  const [qua, setQua] = useState<number | null>(null);
  const chonFile = useRef<HTMLInputElement>(null);
  const nhomDangThem = useRef<PartnerLogo['group']>('customer');

  const tai = useCallback(async () => {
    try {
      setLogo(await fetchPartnerLogos());
      setLoi(null);
    } catch (e) {
      setLoi(describeError(e));
    }
  }, []);
  useEffect(() => { void tai(); }, [tai]);

  const anh = (url: string): string => (url.startsWith('/') ? `${landingUrl.replace(/\/+$/, '')}${url}` : url);

  const moChonFile = (nhom: PartnerLogo['group']): void => {
    nhomDangThem.current = nhom;
    chonFile.current?.click();
  };

  const themTuFile = async (file: File): Promise<void> => {
    const nhom = nhomDangThem.current;
    setDangTai(nhom);
    try {
      const ratio = await doTiLe(file);
      const imageUrl = await uploadCmsImage(file);
      // Tên mặc định lấy từ tên file — sửa được ngay trên dòng.
      const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Logo';
      const moi = await createPartnerLogo({ group: nhom, name, imageUrl, ratio });
      setLogo((ds) => [...(ds ?? []), moi]);
      onDaDoi?.();
      enqueueSnackbar(t('cms.logos.added'), { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(describeError(e), { variant: 'error' });
    } finally {
      setDangTai(null);
    }
  };

  const doiBat = async (l: PartnerLogo, isActive: boolean): Promise<void> => {
    setLogo((ds) => ds?.map((x) => (x.id === l.id ? { ...x, isActive } : x)) ?? ds);
    try {
      await updatePartnerLogo(l.id, { isActive });
      onDaDoi?.();
    } catch (e) {
      // Trả công tắc về chỗ cũ: để nó đứng sai vị trí là nói dối người dùng.
      setLogo((ds) => ds?.map((x) => (x.id === l.id ? { ...x, isActive: !isActive } : x)) ?? ds);
      enqueueSnackbar(describeError(e), { variant: 'error' });
    }
  };

  const doiTen = async (l: PartnerLogo, name: string): Promise<void> => {
    const sach = name.trim();
    if (!sach || sach === l.name) return;
    try {
      const moi = await updatePartnerLogo(l.id, { name: sach });
      setLogo((ds) => ds?.map((x) => (x.id === l.id ? moi : x)) ?? ds);
      onDaDoi?.();
    } catch (e) {
      enqueueSnackbar(describeError(e), { variant: 'error' });
    }
  };

  /**
   * Đổi thứ tự một nhóm: vẽ thứ tự mới NGAY (để kéo không có độ trễ), rồi ghi.
   * Ghi hỏng thì trả về đúng danh sách cũ — để dải đứng sai thứ tự là nói dối
   * người dùng về cái trang chủ đang hiện.
   */
  const sapXep = async (nhom: PartnerLogo['group'], ids: number[]): Promise<void> => {
    const cu = logo;
    const theoId = new Map((logo ?? []).map((l) => [l.id, l]));
    setLogo([
      ...(logo ?? []).filter((l) => l.group !== nhom),
      ...ids.map((id) => theoId.get(id)).filter((l): l is PartnerLogo => l !== undefined),
    ]);
    try {
      setLogo(await reorderPartnerLogos(nhom, ids));
      onDaDoi?.();
    } catch (e) {
      setLogo(cu);
      enqueueSnackbar(describeError(e), { variant: 'error' });
    }
  };

  /** Chuyển `l` tới vị trí `toi` trong nhóm của nó. */
  const dichChuyen = (l: PartnerLogo, toi: number): void => {
    const ds = (logo ?? []).filter((x) => x.group === l.group).map((x) => x.id);
    const tu = ds.indexOf(l.id);
    if (tu < 0 || toi < 0 || toi >= ds.length || toi === tu) return;
    ds.splice(tu, 1);
    ds.splice(toi, 0, l.id);
    void sapXep(l.group, ds);
  };

  const xoa = async (): Promise<void> => {
    if (!dangXoa) return;
    setBanXoa(true);
    try {
      await deletePartnerLogo(dangXoa.id);
      setLogo((ds) => ds?.filter((x) => x.id !== dangXoa.id) ?? ds);
      setDangXoa(null);
      onDaDoi?.();
      enqueueSnackbar(t('cms.logos.deleted'), { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(describeError(e), { variant: 'error' });
    } finally {
      setBanXoa(false);
    }
  };

  if (loi) return <Alert severity="error">{loi}</Alert>;
  if (!logo) return <CircularProgress size={20} />;

  return (
    <Stack spacing={2}>
      <input
        ref={chonFile}
        type="file"
        accept={NHAN_FILE}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void themTuFile(f);
        }}
      />
      {NHOM.map((nhom) => {
        const ds = logo.filter((l) => l.group === nhom);
        const bat = ds.filter((l) => l.isActive).length;
        return (
          <Box key={nhom}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 600 }}>
                {t(`cms.logos.group.${nhom}`)}
                <Typography component="span" sx={{ ml: 1, fontSize: 12, color: 'text.secondary' }}>
                  {t('cms.logos.count', { on: bat, total: ds.length })}
                </Typography>
              </Typography>
              {coTheSua ? (
                <Button
                  size="small"
                  startIcon={dangTai === nhom ? <CircularProgress size={14} /> : <IconPlus size={16} />}
                  disabled={dangTai !== null}
                  onClick={() => moChonFile(nhom)}
                >
                  {t('cms.logos.add')}
                </Button>
              ) : null}
            </Stack>
            <Stack spacing={0.75}>
              {ds.map((l, viTri) => (
                <Box
                  key={l.id}
                  draggable={coTheSua}
                  onDragStart={(e) => {
                    setKeo(l);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    // Chỉ thả trong CÙNG nhóm: kéo logo khách hàng sang dải
                    // hiệp hội là đổi nhóm, việc đó không phải sắp xếp.
                    if (keo?.group !== l.group) return;
                    e.preventDefault();
                    if (qua !== l.id) setQua(l.id);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (keo && keo.group === l.group) dichChuyen(keo, viTri);
                    setKeo(null);
                    setQua(null);
                  }}
                  onDragEnd={() => { setKeo(null); setQua(null); }}
                  sx={{
                    opacity: keo?.id === l.id ? 0.35 : l.isActive ? 1 : 0.5,
                    borderTop: '2px solid',
                    borderColor: qua === l.id && keo && keo.id !== l.id ? 'primary.main' : 'transparent',
                    cursor: coTheSua ? 'grab' : 'default',
                  }}
                >
                {/* Hai dòng: ảnh + nút ở trên, tên ở dưới. Cột CMS hẹp — để
                    cả năm thứ trên một hàng thì ô tên bị ép về 0 và biến mất. */}
                <Stack direction="row" alignItems="center" spacing={1}>
                  {coTheSua ? (
                    <Box sx={{ display: 'inline-flex', color: 'text.disabled' }} aria-hidden>
                      <IconGripVertical size={16} />
                    </Box>
                  ) : null}
                  <Box
                    sx={{
                      width: 96, height: 44, flex: 'none', borderRadius: 1, bgcolor: '#0c0c0e',
                      // KHỐI THƯỜNG, không phải grid: trong grid, height:100% của
                      // ảnh không tính theo ô (hàng grid co theo nội dung) và ảnh
                      // to ra theo kích thước tự đoán.
                      display: 'block', p: 0.75, overflow: 'hidden',
                    }}
                  >
                    {/* Lấp ĐÚNG khung rồi để object-fit giữ tỉ lệ. Chỉ đặt
                        max-width/max-height thì SVG chỉ khai viewBox (không
                        width/height) không có kích thước gốc — trình duyệt tự
                        đoán, ảnh tràn khỏi ô và đè lên dòng bên cạnh. */}
                    <Box component="img" src={anh(l.imageUrl)} alt={l.name}
                      sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                  </Box>
                  <Box sx={{ flex: 1 }} />
                  <Tooltip title={t(l.isActive ? 'cms.logos.hide' : 'cms.logos.show')}>
                    <span>
                      <Switch
                        size="small"
                        checked={l.isActive}
                        disabled={!coTheSua}
                        onChange={(e) => void doiBat(l, e.target.checked)}
                      />
                    </span>
                  </Tooltip>
                  {coTheSua ? (
                    <>
                      {/* Nút lên/xuống song song với kéo thả: kéo thả không dùng
                          được bằng bàn phím, và trên màn cảm ứng trình duyệt
                          không phát sự kiện kéo HTML5. */}
                      <Tooltip title={t('cms.logos.moveUp')}>
                        <span>
                          <IconButton size="small" aria-label={t('cms.logos.moveUp')}
                            disabled={viTri === 0} onClick={() => dichChuyen(l, viTri - 1)}>
                            <IconArrowUp size={16} />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title={t('cms.logos.moveDown')}>
                        <span>
                          <IconButton size="small" aria-label={t('cms.logos.moveDown')}
                            disabled={viTri === ds.length - 1} onClick={() => dichChuyen(l, viTri + 1)}>
                            <IconArrowDown size={16} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </>
                  ) : null}
                  {coTheSua ? (
                    <Tooltip title={t('cms.logos.delete')}>
                      <IconButton size="small" onClick={() => setDangXoa(l)} aria-label={t('cms.logos.delete')}>
                        <IconTrash size={16} />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </Stack>
                <Box sx={{ pl: coTheSua ? 3 : 0, mt: 0.25 }}>
                <Box
                  component="input"
                  defaultValue={l.name}
                  disabled={!coTheSua}
                  aria-label={t('cms.logos.name')}
                  onBlur={(e: React.FocusEvent<HTMLInputElement>) => void doiTen(l, e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                  }}
                  sx={{
                    width: '100%', boxSizing: 'border-box', font: 'inherit', fontSize: 13, px: 1, py: 0.5,
                    border: '1px solid transparent', borderRadius: 1, bgcolor: 'transparent', color: 'text.primary',
                    '&:hover:not(:disabled), &:focus': { borderColor: 'divider', outline: 'none' },
                  }}
                />
                </Box>
                </Box>
              ))}
            </Stack>
          </Box>
        );
      })}
      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{t('cms.logos.hint')}</Typography>

      <ConfirmDialog
        isOpen={dangXoa !== null}
        title={t('cms.logos.deleteTitle')}
        description={t('cms.logos.deleteBody', { name: dangXoa?.name ?? '' })}
        confirmLabel={t('cms.logos.delete')}
        isDestructive
        isSubmitting={banXoa}
        onConfirm={() => void xoa()}
        onClose={() => setDangXoa(null)}
      />
    </Stack>
  );
}
