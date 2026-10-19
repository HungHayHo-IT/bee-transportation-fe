import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, InputAdornment, MenuItem, Stack, Switch, TableCell, TableRow, TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadIcon from '@mui/icons-material/UploadFile';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import { ProvinceField } from '@/components/form/ProvinceField';
import { SectionCard } from '@/components/SectionCard';
import { DataTableShell } from '@/components/DataTableShell';
import { KetQuaNhapDialog, type KetQuaNhap } from './KetQuaNhapDialog';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { foldDiacritics } from '@/utils/foldDiacritics';
import { describeError } from '@/services/apiClient';
import {
  createLocation, fetchLocations, importLocations, updateLocation,
} from '@/services/pricingService';
import type { Location, PriceRegion } from '@/types/pricing';

/**
 * Giá trị của mục "Tất cả" trong các ô lọc.
 *
 * KHÔNG dùng chuỗi rỗng: MUI coi chuỗi rỗng là "chưa chọn gì" nên ô hiện
 * trống trơn trong khi người dùng vừa chọn "Tất cả" — nhìn như bị mất chữ.
 */
const TAT_CA = 'tat-ca';

/** Số địa điểm mỗi trang. */
const MOI_TRANG = 10;

export interface LocationsPanelProps {
  /** Chỉ hiện địa điểm của khu vực này. null = cả danh mục. */
  regionId: number | null;
  regions: PriceRegion[];
  canEdit: boolean;
  /** Gọi sau mỗi lần thêm/sửa: số địa điểm của khu vực ở thanh bên phải đổi theo. */
  onChanged?: () => void;
}

/**
 * Danh mục địa điểm đầu tuyến — nằm TRONG màn "Khu vực và tuyến".
 *
 * Trước đây là một trang riêng ở menu. Gộp vào đây vì hai màn nói về cùng một
 * thứ: khu vực của một tuyến là khu vực của địa điểm nhận, nên chuyển một tuyến
 * sang khu vực khác chính là sửa khu vực của một địa điểm. Để hai màn tách nhau
 * thì người dùng phải tự đoán ra mối liên hệ đó, và đoán sai thì tuyến biến mất
 * khỏi khu vực họ đang xem mà không hiểu vì sao.
 *
 * Tách khỏi màn bảng giá thay vì cho gõ tên tự do ngay trong ô tuyến: gõ tự do
 * thì "Kho ĐN", "Kho Đ.N" và "kho da nang" thành ba đầu tuyến khác nhau, và
 * bảng giá có ba dòng trông như một.
 */
export function LocationsPanel({
  regionId, regions, canEdit, onChanged,
}: LocationsPanelProps): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();

  const [tim, setTim] = useState('');
  const [trang, setTrang] = useState(1);
  const [locTinh, setLocTinh] = useState(TAT_CA);
  const [locTrangThai, setLocTrangThai] = useState<string>(TAT_CA);
  /* LUÔN lấy cả địa điểm đã tắt. Trạng thái giờ là một cột trong bảng, nên
     lọc chúng ra khỏi danh sách thì vừa làm cột đó vô nghĩa, vừa khiến địa
     điểm vừa tắt biến mất ngay trước mắt người vừa bấm. */
  /* Chỉ địa điểm của khu vực đang chọn bên trái — chính danh sách bên trái đã
     là bộ lọc khu vực, thêm một ô lọc nữa trong này là hai chỗ cùng làm một
     việc và sớm muộn nói lệch nhau. */
  const tai = useCallback(
    () => fetchLocations({
      includeInactive: true,
      ...(regionId === null ? {} : { regionId }),
    }),
    [regionId],
  );
  const resource = useAsyncResource(tai, [regionId]);

  const xong = (): void => {
    resource.reload();
    onChanged?.();
  };

  const [dangNhap, setDangNhap] = useState(false);
  const [ketQua, setKetQua] = useState<KetQuaNhap | null>(null);
  const nhap = async (file: File): Promise<void> => {
    setDangNhap(true);
    try {
      const kq = await importLocations(file);
      xong();
      /* Kết quả vào hộp thoại: dòng bị bỏ in NGUYÊN VĂN và in ĐỦ. Gộp lại
         thành "có N dòng lỗi", hay để toast tự tắt, đều là bắt người ta mở
         file ra tự dò xem dòng nào. */
      setKetQua({
        thanhCong: kq.imported > 0,
        tomTat: t('pricing.locationImport.imported', {
          imported: kq.imported, merged: kq.merged,
        }),
        skipped: kq.skipped,
      });
    } catch (e) {
      enqueueSnackbar(describeError(e), { variant: 'error' });
    } finally {
      setDangNhap(false);
    }
  };

  const [dangSua, setDangSua] = useState<Location | 'moi' | null>(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [loiHop, setLoiHop] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', province: '', address: '', of1Id: '', regionId: '' });

  const mo = (l: Location | 'moi'): void => {
    setLoiHop(null);
    setDangSua(l);
    setForm(
      l === 'moi'
        // Thêm trong một khu vực thì khu vực điền sẵn khu vực đó — đó là thứ
        // người ta đang đứng xem, không phải một ô trống để chọn lại.
        ? { name: '', province: '', address: '', of1Id: '', regionId: regionId === null ? '' : String(regionId) }
        : {
          name: l.name,
          province: l.province ?? '',
          address: l.address ?? '',
          of1Id: l.of1Id === null ? '' : String(l.of1Id),
          regionId: l.regionId === null ? '' : String(l.regionId),
        },
    );
  };

  const luu = async (): Promise<void> => {
    if (dangSua === null) return;
    setDangLuu(true);
    setLoiHop(null);
    try {
      /* Ô trống = GỠ, nên gửi null chứ không bỏ trường: bỏ trường thì backend
         hiểu là "không đụng tới" và giá trị cũ ở nguyên đó. */
      const than = {
        ...form,
        of1Id: form.of1Id.trim() === '' ? null : Number(form.of1Id),
        regionId: form.regionId === '' ? null : Number(form.regionId),
      };
      if (dangSua === 'moi') await createLocation(than);
      else await updateLocation(dangSua.id, than);
      setDangSua(null);
      xong();
    } catch (e) {
      setLoiHop(describeError(e));
    } finally {
      setDangLuu(false);
    }
  };

  const batTat = async (l: Location): Promise<void> => {
    try {
      await updateLocation(l.id, { isActive: !l.isActive });
      xong();
    } catch (e) {
      enqueueSnackbar(describeError(e), { variant: 'error' });
    }
  };

  /* Lọc trong trình duyệt: danh sách địa điểm của một khu vực tải về một lần
     và không phân trang, nên gõ tới đâu lọc tới đó mà không gọi lại máy chủ. */
  const tatCa = useMemo(() => resource.data?.items ?? [], [resource.data]);
  /* Danh sách tỉnh dựng từ CHÍNH dữ liệu đang có, không phải từ danh mục 34
     tỉnh: bày ra một tỉnh chọn vào thì bảng rỗng là bắt người ta thử từng cái. */
  const danhSachTinh = useMemo(
    () => [...new Set(tatCa.map((l) => l.province).filter((x): x is string => x !== null))].sort(
      (a, b) => a.localeCompare(b, 'vi')),
    [tatCa],
  );

  const items = useMemo(() => {
    const k = foldDiacritics(tim);
    return tatCa.filter((l) => {
      if (locTinh !== TAT_CA && l.province !== locTinh) return false;
      if (locTrangThai === 'on' && !l.isActive) return false;
      if (locTrangThai === 'off' && l.isActive) return false;
      if (k === '') return true;
      return foldDiacritics([
        l.name, l.province ?? '', l.regionName ?? '', l.address ?? '', l.of1Id ?? '',
      ].join(' ')).includes(k);
    });
  }, [tatCa, tim, locTinh, locTrangThai]);

  /* Danh mục gần năm trăm địa điểm. Đổ hết ra là một trang cuộn mãi không
     hết, và cái người ta cần — một dòng cụ thể — lại càng khó thấy.

     Cắt ở trình duyệt chứ không gọi lại máy chủ: cả danh mục đã nằm sẵn trong
     một mảng, nên phân trang ở đây không tốn thêm vòng mạng nào, và ô tìm vẫn
     tìm trên TOÀN BỘ phần đã lọc chứ không chỉ trang đang xem. */
  const soTrang = Math.max(1, Math.ceil(items.length / MOI_TRANG));
  const trangHienTai = Math.min(trang, soTrang);
  const trangNay = useMemo(
    () => items.slice((trangHienTai - 1) * MOI_TRANG, trangHienTai * MOI_TRANG),
    [items, trangHienTai],
  );
  // Đổi khu vực hay gõ tìm thì về trang 1: đứng ở trang 9 của một danh sách
  // vừa còn 4 dòng là một bảng trống không giải thích gì.
  useEffect(() => { setTrang(1); }, [regionId, tim, locTinh, locTrangThai]);

  return (
    <>
      {/* Thanh công cụ đứng riêng trên thẻ, để tiêu đề thẻ không phải giành
          chỗ với mấy cái nút. */}
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        {/* Nói rõ ô này tìm theo cái gì: "Tìm kiếm" trống không khiến người ta
            thử tên rồi thôi, không ai đoán là gõ mã OF1 cũng ra. */}
        <TextField
          size="small"
          placeholder={t('pricing.locationSearchHint')}
          value={tim}
          onChange={(e) => setTim(e.target.value)}
          sx={{ width: { xs: '100%', sm: 360 } }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
          }}
        />
        <TextField
          select size="small" label={t('pricing.locationProvince')}
          value={locTinh}
          onChange={(e) => setLocTinh(e.target.value)}
          sx={{ minWidth: 170 }}
        >
          <MenuItem value={TAT_CA}>{t('common.actions.all')}</MenuItem>
          {danhSachTinh.map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
        </TextField>
        <TextField
          select size="small" label={t('common.table.status')}
          value={locTrangThai}
          onChange={(e) => setLocTrangThai(e.target.value)}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value={TAT_CA}>{t('common.actions.all')}</MenuItem>
          <MenuItem value="on">{t('pricing.locationStatusOn')}</MenuItem>
          <MenuItem value="off">{t('pricing.locationOff')}</MenuItem>
        </TextField>
        <Box sx={{ flex: 1, minWidth: 0 }} />
        {canEdit ? (
          <>
            {/* Nạp danh mục ban đầu: bảng giá miền Trung có 72 địa điểm, thêm
                tay là 72 lần mở hộp thoại và 72 cơ hội gõ sai một dấu — mà sai
                tên thì dòng giá tương ứng bị bỏ lúc nhập bảng giá. */}
            <Button size="small" component="label" startIcon={<UploadIcon />} disabled={dangNhap}>
              {t('pricing.locationImport.import')}
              <input
                hidden
                type="file"
                accept=".xlsx"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  // Xoá giá trị để chọn LẠI cùng một file vẫn kích hoạt onChange.
                  e.target.value = '';
                  if (f) void nhap(f);
                }}
              />
            </Button>
            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => mo('moi')}>
              {t('pricing.locationAdd')}
            </Button>
          </>
        ) : null}
      </Stack>

      <SectionCard
        title={t('nav.priceLocations')}
        subtitle={t('pricing.region.locationsHint')}
        disableContentPadding
      >
        <DataTableShell
          isFirstLoad={resource.isFirstLoad}
          isRefetching={resource.isRefetching}
          errorMessage={resource.errorMessage}
          onDismissError={resource.clearError}
          isEmpty={items.length === 0}
          emptyTitle={t('pricing.locationEmpty')}
          page={trangHienTai}
          pageCount={soTrang}
          totalRows={items.length}
          onPageChange={setTrang}
          head={
            <TableRow>
              <TableCell>{t('pricing.locationName')}</TableCell>
              <TableCell>{t('pricing.locationProvince')}</TableCell>
              <TableCell>{t('pricing.region.region')}</TableCell>
              <TableCell>{t('pricing.locationAddress')}</TableCell>
              <TableCell>{t('pricing.locationOf1Id')}</TableCell>
              <TableCell align="right" />
              <TableCell align="center">{t('common.table.status')}</TableCell>
            </TableRow>
          }
        >
          {trangNay.map((l) => (
            <TableRow key={l.id} hover>
              <TableCell>{l.name}</TableCell>
              <TableCell>{l.province ?? '—'}</TableCell>
              {/* Chưa có khu vực là một thiếu sót có hậu quả thấy được: mọi
                  tuyến đi từ địa điểm này không nằm trong khu vực nào, nên
                  không hiện ở bảng tuyến của bất kỳ khu vực nào. */}
              <TableCell>
                {l.regionName === null
                  ? <Chip size="small" variant="outlined" color="warning" label={t('pricing.region.noRegion')} />
                  : l.regionName}
              </TableCell>
              <TableCell>{l.address ?? '—'}</TableCell>
              {/* Trống thì để GẠCH NGANG, không phải cảnh báo vàng.
                  Mã OF1 chỉ cần ở đầu KHO/CẢNG của đơn nhập/xuất (contract
                  mục 5.2). Danh mục này phần lớn là huyện, thị xã lấy từ bảng
                  giá — chúng luôn là đầu KHÁCH và không bao giờ cần mã. Tô
                  vàng 773 dòng không hỏng gì làm cái cảnh báo thật mất giá,
                  và người đọc học cách lờ nó đi.

                  Chỗ báo thật nằm ở màn ĐƠN: khi một đơn cụ thể bị chặn vì
                  thiếu mã, nó nói đúng đơn nào và chỉ sang đây. */}
              <TableCell>{l.of1Id ?? '—'}</TableCell>
              <TableCell align="right">
                {!canEdit ? null : (
                  <IconButton size="small" aria-label={t('common.actions.edit')} onClick={() => mo(l)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
              </TableCell>
              {/* Trạng thái đứng thành CỘT riêng có tiêu đề: cái công tắc
                  không nhãn ở cuối hàng không nói nó bật/tắt cái gì, và ai
                  không sửa được thì trước đây chẳng thấy trạng thái đâu cả. */}
              <TableCell align="center">
                {canEdit ? (
                  <Switch size="small" checked={l.isActive} onChange={() => void batTat(l)} />
                ) : (
                  <Chip
                    size="small"
                    variant="outlined"
                    color={l.isActive ? 'success' : 'default'}
                    label={t(l.isActive ? 'common.messages.active' : 'pricing.locationOff')}
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
        </DataTableShell>
      </SectionCard>

      <KetQuaNhapDialog
        dangChay={dangNhap}
        ketQua={ketQua}
        onClose={() => setKetQua(null)}
      />

      <Dialog open={dangSua !== null} onClose={() => setDangSua(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {dangSua === 'moi' ? t('pricing.locationAdd') : t('pricing.locationEdit')}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {loiHop ? <Alert severity="error">{loiHop}</Alert> : null}
            <TextField
              label={t('pricing.locationName')}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              autoFocus
              fullWidth
              required
            />
            {/* CHỈ danh mục 34 tỉnh/thành, không gõ tự do nữa.

                Trước đây mở tự do vì "một cái kho có thể nằm ở nơi người ta
                gọi bằng tên khác tên hành chính". Nhưng từ khi màn chọn tuyến
                đi hai bước — chọn tỉnh rồi chọn địa chỉ TRONG tỉnh đó — một
                tỉnh gõ tay là một nhóm riêng không ai tìm thấy, và backend
                cũng từ chối. Tên địa phương thuộc về ô TÊN và ô ĐỊA CHỈ ngay
                dưới đây; ô này là đơn vị hành chính. */}
            <ProvinceField
              label={t('pricing.locationProvince')}
              value={form.province}
              onChange={(province) => setForm((f) => ({ ...f, province }))}
            />
            {/* Ô này quyết định tuyến đi từ đây nằm ở khu vực nào của bảng giá.
                Bỏ trống khi THÊM thì backend kế thừa khu vực của một địa điểm
                khác cùng tỉnh — thường là đúng, và vẫn sửa lại được ở đây. */}
            <TextField
              select
              label={t('pricing.region.region')}
              value={form.regionId}
              onChange={(e) => setForm((f) => ({ ...f, regionId: e.target.value }))}
              helperText={t('pricing.region.locationRegionHint')}
              fullWidth
            >
              <MenuItem value=""><em>{t('pricing.region.noRegion')}</em></MenuItem>
              {regions.map((r) => <MenuItem key={r.id} value={String(r.id)}>{r.name}</MenuItem>)}
            </TextField>
            <TextField
              label={t('pricing.locationAddress')}
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              fullWidth
            />
            {/* Mã bên OF1, không phải mã của BeeOps. Thiếu nó thì mọi đơn đi
                qua địa điểm này không chuyển sang TMS được. */}
            <TextField
              label={t('pricing.locationOf1Id')}
              value={form.of1Id}
              onChange={(e) => setForm((f) => ({ ...f, of1Id: e.target.value.replace(/\D/g, '') }))}
              helperText={t('pricing.locationOf1IdHint')}
              fullWidth
              inputMode="numeric"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDangSua(null)} disabled={dangLuu}>
            {t('common.actions.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={() => void luu()}
            disabled={dangLuu || form.name.trim().length < 2}
          >
            {t('common.actions.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
