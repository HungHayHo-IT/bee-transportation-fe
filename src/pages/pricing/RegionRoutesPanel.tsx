import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import {
  Alert, Box, Button, CircularProgress, IconButton, InputAdornment, List, ListItemButton,
  ListItemText, MenuItem, Stack, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import {
  IconEdit, IconFileExport, IconFileImport, IconFileSpreadsheet, IconPlus, IconSearch,
  IconSettings, IconTrash,
} from '@tabler/icons-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataTableShell } from '@/components/DataTableShell';
import { SectionCard } from '@/components/SectionCard';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { foldDiacritics } from '@/utils/foldDiacritics';
import { usePageLevels } from '@/hooks/usePageLevels';
import { PhienStatusChip } from './PhienStatusChip';
import { describeError } from '@/services/apiClient';
import {
  createRegion, deleteRegion, deleteRegionRoute, downloadRegionRouteExport,
  downloadRegionRouteTemplate, fetchRegionRoutes, fetchRegions,
  importRegionRoutes, updateRegion,
} from '@/services/regionRouteService';
import { fetchUsers } from '@/services/organisationService';
import { downloadBlobAsFile } from '@/utils/fileDownload';
import type { OrganisationUser } from '@/types/organisation';
import type { PriceRegion, PriceSession, RegionRoute } from '@/types/pricing';
import { KetQuaNhapDialog, type KetQuaNhap } from './KetQuaNhapDialog';
import { LocationsPanel } from './LocationsPanel';
import { PriceSessionsDialog } from './PriceSessionsDialog';
import { RegionPriceHead, RegionPriceRows } from './RegionPriceTable';
import { cotDonVi } from './regionPriceColumns';
import { RegionRouteDialog } from './RegionRouteDialog';

/** Số tuyến mỗi trang của bảng tuyến. */
const MOI_TRANG = 10;

export interface RegionRoutesPanelProps {
  canEdit: boolean;
  canDelete: boolean;
  /* Phiên giá do MÀN CHA giữ, không phải mỗi tab một bản.
     Hai tab đứng trên cùng một trang và nói về cùng một bảng giá. Mỗi bên tự
     tải danh sách phiên thì công bố phiên mới ở tab này xong, tab kia vẫn
     đang cầm danh sách cũ — người dùng phải F5 mới thấy, và trong lúc đó hai
     tab nói hai điều khác nhau về cùng một thứ. */
  sessions: PriceSession[];
  phienId: number | null;
  onChonPhien: (id: number) => void;
  /** Gọi sau mỗi thay đổi phiên để màn cha nạp lại danh sách dùng chung. */
  onPhienDoi: () => void;
}

/**
 * Bảng giá theo khu vực: khu vực → tuyến (điểm nhận → điểm giao) → giá từng dịch vụ.
 *
 * Danh mục địa điểm nằm NGAY TRONG màn này, ở tab thứ hai. Khu vực của một
 * tuyến là khu vực của địa điểm nhận, nên chuyển tuyến sang khu vực khác chính
 * là sửa khu vực của một địa điểm — hai việc đó phải ở cùng một chỗ, nếu không
 * người dùng đổi khu vực ở một màn rồi đi tìm tuyến của mình ở màn kia.
 */
export function RegionRoutesPanel({
  canEdit, canDelete, sessions, phienId, onChonPhien, onPhienDoi,
}: RegionRoutesPanelProps): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  /* Sửa danh mục địa điểm đòi ô `priceLocations`, KHÔNG phải ô của màn bảng
     giá: backend chặn đúng như vậy (POST/PATCH /locations), nên lấy quyền ở
     chỗ khác là hiện một cái nút để rồi ăn 403. */
  const levels = usePageLevels();
  const canEditLocations = levels?.priceLocations === 'edit' || levels?.priceLocations === 'full';

  /* PHIÊN GIÁ đứng ở đây chứ không ở tab kia: một phiên là một bản chụp đầy
     đủ của bảng giá, nên chọn phiên là chọn xem/sửa bảng nào. Mọi lời gọi bên
     dưới đều đi kèm phiên đang chọn. */
  const phienDangXem = sessions.find((p) => p.id === phienId) ?? null;
  /* Phiên đã lưu trữ chỉ để tra cứu — backend từ chối mọi lệnh ghi vào nó, nên
     giao diện phải nói trước thay vì để người ta gõ xong rồi ăn lỗi. */
  const khoaSua = phienDangXem?.status === 'archived';
  const suaDuoc = canEdit && !khoaSua;
  const xoaDuoc = canDelete && !khoaSua;
  /** Phiên đang áp dụng không nhập Excel được — phải tạo phiên mới (backend cũng chặn). */
  const dangApDung = phienDangXem?.status === 'active';
  const [moPhien, setMoPhien] = useState(false);

  const taiKhuVuc = useCallback(() => fetchRegions(phienId ?? undefined), [phienId]);
  const regions = useAsyncResource(taiKhuVuc, [phienId]);
  const regionList = useMemo(() => regions.data ?? [], [regions.data]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = regionList.find((r) => r.id === selectedId) ?? null;

  // Chọn sẵn khu vực đầu tiên; khu vực đang chọn bị xoá thì quay về đầu danh sách.
  useEffect(() => {
    if (selected === null && regionList.length > 0) setSelectedId(regionList[0].id);
  }, [regionList, selected]);

  const loadRoutes = useCallback(
    () => (selectedId === null
      ? Promise.resolve([])
      : fetchRegionRoutes(selectedId, phienId ?? undefined)),
    [selectedId, phienId],
  );
  const routes = useAsyncResource(loadRoutes, [selectedId, phienId]);
  const [timTuyen, setTimTuyen] = useState('');
  /* Lọc theo đơn vị tính: giá CBM/tấn chỉ có ở vài tuyến chành, lẫn trong vài
     trăm tuyến xe tải — không lọc thì cột có mà trang nào cũng "—". */
  const [locDonVi, setLocDonVi] = useState('');
  const [trang, setTrang] = useState(1);
  /* Lọc ngay trong trình duyệt: lời gọi này đã trả về TOÀN BỘ tuyến của một
     khu vực trong một mảng, không phân trang. Thêm một tham số tìm ở backend
     chỉ để lọc lại đúng mảng vừa tải là một vòng mạng thừa cho mỗi ký tự gõ. */
  const routeList = useMemo(() => {
    const ds = (routes.data ?? []).filter((r) => locDonVi === ''
      || r.services.some((s) => s.prices.some((p) => p.unitCode === locDonVi)));
    const k = foldDiacritics(timTuyen);
    if (k === '') return ds;
    /* Khớp TÊN địa điểm đứng trước khớp TỈNH: gõ "hà nội" thì tuyến của điểm
       "HÀ NỘI" phải ở trang 1, không chìm sau vài chục kho thuộc tỉnh Hà Nội. */
    const hang = (r: (typeof ds)[number]): number => {
      const ten = [r.origin.locationName, r.destination.locationName].map(foldDiacritics);
      if (ten.includes(k)) return 0;
      return ten.some((t) => t.includes(k)) ? 1 : 2;
    };
    return ds.filter((r) => foldDiacritics([
      r.origin.locationName, r.origin.province ?? '',
      r.destination.locationName, r.destination.province ?? '',
    ].join(' ')).includes(k)).sort((a, b) => hang(a) - hang(b));
  }, [routes.data, timTuyen, locDonVi]);
  const donViCuaKhuVuc = useMemo(() => cotDonVi(routes.data ?? []), [routes.data]);
  /* Cột đơn vị tính dựng từ CẢ danh sách của khu vực, không phải từ trang đang
     xem: tính theo trang thì sang trang là cột đổi, và cùng một bảng giá trông
     như hai bảng khác nhau. Xem thêm RegionPriceTable. */
  const units = useMemo(() => cotDonVi(routeList), [routeList]);

  /* Một khu vực có tới 501 tuyến, mỗi tuyến một hàng cao ba bốn dòng — đổ hết
     ra là một trang cuộn mãi không hết và trình duyệt vẽ chậm thấy rõ. Cắt ở
     trình duyệt chứ không gọi lại máy chủ: lời gọi này vốn đã trả về cả khu
     vực trong một mảng, nên phân trang ở đây không tốn thêm vòng mạng nào. */
  const soTrang = Math.max(1, Math.ceil(routeList.length / MOI_TRANG));
  const trangHienTai = Math.min(trang, soTrang);
  const tuyenTrangNay = useMemo(
    () => routeList.slice((trangHienTai - 1) * MOI_TRANG, trangHienTai * MOI_TRANG),
    [routeList, trangHienTai],
  );
  // Đổi khu vực, đổi phiên hay gõ tìm thì về trang 1 — đứng ở trang 7 của một
  // danh sách vừa còn 3 dòng là một bảng trống không giải thích gì.
  useEffect(() => { setTrang(1); }, [selectedId, phienId, timTuyen, locDonVi]);


  /** Bên phải: tuyến của khu vực, hay danh mục địa điểm của nó. */
  const [tab, setTab] = useState<'tuyen' | 'diaDiem'>('tuyen');

  /* Danh sách Trưởng phòng để giao khu vực. Tải một lần: hộp thoại nào cũng
     cần đúng danh sách này, và nó gần như không đổi trong một phiên làm việc. */
  const [truongPhong, setTruongPhong] = useState<OrganisationUser[]>([]);
  useEffect(() => {
    if (!canEdit) return;
    void fetchUsers({ role: 'manager', isActive: true })
      .then((p) => setTruongPhong(p.items))
      .catch(() => setTruongPhong([]));
  }, [canEdit]);

  /* Hộp thoại tên khu vực: 'new' = thêm, một khu vực = đổi tên. */
  const [regionEditing, setRegionEditing] = useState<PriceRegion | 'new' | null>(null);
  const [regionName, setRegionName] = useState('');
  const [regionManager, setRegionManager] = useState('');
  const [regionError, setRegionError] = useState<string | null>(null);
  const [regionDeleting, setRegionDeleting] = useState<PriceRegion | null>(null);
  const [routeEditing, setRouteEditing] = useState<RegionRoute | 'new' | null>(null);
  const [routeDeleting, setRouteDeleting] = useState<RegionRoute | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openRegionDialog = (region: PriceRegion | 'new'): void => {
    setRegionEditing(region);
    setRegionName(region === 'new' ? '' : region.name);
    setRegionManager(region === 'new' || region.managerId === null ? '' : String(region.managerId));
    setRegionError(null);
  };

  const handleRegionSave = async (): Promise<void> => {
    if (regionEditing === null) return;
    setIsSubmitting(true);
    setRegionError(null);
    try {
      const phuTrach = regionManager === '' ? null : Number(regionManager);
      if (regionEditing === 'new') await createRegion(regionName, phuTrach);
      else await updateRegion(regionEditing.id, regionName, phuTrach);
      setRegionEditing(null);
      regions.reload();
    } catch (error) {
      setRegionError(describeError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  /* Ba nút Excel: tải mẫu → điền → nhập, hoặc xuất → sửa → nhập lại. Cùng một
     cấu trúc file cho cả ba, nên file xuất ra nhập lại được nguyên trạng. */
  const [dangExcel, setDangExcel] = useState<'mau' | 'xuat' | 'nhap' | null>(null);
  const [ketQua, setKetQua] = useState<KetQuaNhap | null>(null);
  const chayExcel = async (
    viec: 'mau' | 'xuat' | 'nhap', chay: () => Promise<void>,
  ): Promise<void> => {
    setDangExcel(viec);
    try {
      await chay();
    } catch (error) {
      enqueueSnackbar(describeError(error), { variant: 'error' });
    } finally {
      setDangExcel(null);
    }
  };

  const nhapFile = (file: File): Promise<void> => chayExcel('nhap', async () => {
    const kq = await importRegionRoutes(file, phienId ?? undefined);
    /* Kết quả vào HỘP THOẠI, không phải một chuỗi toast. Một lần nhập sinh ra
       cả chục dòng thông báo; toast tự tắt sau vài giây và chồng lên nhau nên
       người nhập chỉ kịp đọc cái cuối — mà thứ họ cần lại là danh sách dòng
       bị bỏ, cái duy nhất nói họ phải sửa gì trong file.

       "Thành công" CHỈ KHI có thứ gì đó vào thật: tuyến chưa khai giá vẫn tính
       là vào, nên nhìn `routes` chứ không chỉ `imported`. */
    const vaoDuoc = kq.imported > 0 || (kq.routes ?? 0) > 0;
    setKetQua({
      thanhCong: vaoDuoc,
      tomTat: [
        vaoDuoc ? t('pricing.importDone', { imported: kq.imported }) : '',
        kq.merged > 0 ? t('pricing.importMerged', { count: kq.merged }) : '',
      ].filter((x) => x !== '').join(' ') || t('pricing.importDone', { imported: 0 }),
      /* Việc hệ thống tự làm (thêm đơn vị tính mới từ tiêu đề cột) để riêng,
         KHÔNG trộn vào danh sách dòng bị bỏ: hai thứ đòi hai phản ứng khác
         nhau — một cái là "xem lại file", cái kia là "danh mục vừa mọc thêm
         dòng". */
      notes: kq.notes ?? [],
      skipped: kq.skipped,
    });
    regions.reload();
    routes.reload();
    // Lần nhập đầu tiên có thể vừa TẠO phiên — danh sách phiên phải thấy nó.
    onPhienDoi();
  });

  const runDelete = async (action: () => Promise<void>, onDone: () => void): Promise<void> => {
    setIsSubmitting(true);
    try {
      await action();
      onDone();
      regions.reload();
      routes.reload();
    } catch (error) {
      enqueueSnackbar(describeError(error), { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {khoaSua ? (
        <Alert severity="info" sx={{ mb: 2 }}>{t('pricing.region.archivedReadOnly')}</Alert>
      ) : null}
      {dangApDung && suaDuoc ? (
        <Alert severity="info" sx={{ mb: 2 }}>{t('pricing.region.activeNoImport')}</Alert>
      ) : null}

      {/* Thanh công cụ đứng trên cả hai cột: phiên giá và các nút Excel tác
          động lên TOÀN BỘ bảng giá, không riêng khu vực đang chọn. */}
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        {canEdit ? (
          <Button color="inherit" startIcon={<IconSettings size={17} />} onClick={() => setMoPhien(true)}>
            {t('pricing.sessionManage')}
          </Button>
        ) : null}
        {/* Mở sẵn ở phiên ĐANG ÁP DỤNG: ai chỉ muốn xem giá hiện hành thì vào
            là thấy, không phải chọn gì. */}
        <TextField
          select size="small" label={t('pricing.sessionLabel')}
          value={phienId === null ? '' : String(phienId)}
          onChange={(e) => onChonPhien(Number(e.target.value))}
          sx={{ minWidth: 220 }}
          /* Ô chọn chỉ mang TÊN phiên; trạng thái đứng riêng bên cạnh. Nhồi cả
             hai vào một dòng chữ thì tên dài bị cắt mất đuôi, và trạng thái —
             thứ quyết định giá này có đang báo cho khách hay không — lọt thỏm
             giữa câu. Danh sách thả xuống vẫn giữ trạng thái: ở đó nó là thứ
             phân biệt các phiên với nhau. */
          SelectProps={{ renderValue: () => phienDangXem?.name ?? '' }}
        >
          {sessions.map((p) => (
            <MenuItem key={p.id} value={String(p.id)}>
              <Stack direction="row" spacing={1} alignItems="center">
                <span>{p.name}</span>
                <PhienStatusChip status={p.status} />
              </Stack>
            </MenuItem>
          ))}
        </TextField>
        {phienDangXem === null ? null : <PhienStatusChip status={phienDangXem.status} />}
        <Box sx={{ flex: 1, minWidth: 0 }} />
        <Button
          variant="outlined"
          startIcon={<IconFileExport size={17} />}
          disabled={dangExcel === 'xuat'}
          onClick={() => void chayExcel('xuat', async () => downloadBlobAsFile(
            await downloadRegionRouteExport(phienId ?? undefined), 'bang-gia-khu-vuc.xlsx'))}
        >
          {t('common.actions.export')}
        </Button>
        {suaDuoc ? (
          <>
            {/* Tải mẫu KHÔNG phụ thuộc dữ liệu: file mẫu là một file trắng có
                sẵn cột đúng, và lúc cần nó nhất chính là lúc chưa có gì cả. */}
            <Button
              variant="outlined"
              startIcon={<IconFileSpreadsheet size={17} />}
              disabled={dangExcel === 'mau'}
              onClick={() => void chayExcel('mau', async () =>
                downloadBlobAsFile(await downloadRegionRouteTemplate(), 'mau-bang-gia-khu-vuc.xlsx'))}
            >
              {t('pricing.template')}
            </Button>
            <Button
              variant="outlined"
              component="label"
              startIcon={<IconFileImport size={17} />}
              disabled={dangExcel === 'nhap' || dangApDung}
            >
              {t('pricing.import')}
              <input
                hidden
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  // Xoá giá trị để chọn LẠI cùng một file vẫn kích hoạt onChange.
                  e.target.value = '';
                  if (f) void nhapFile(f);
                }}
              />
            </Button>
          </>
        ) : null}
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
        <Box sx={{ width: { xs: '100%', md: 280 }, flexShrink: 0 }}>
          <SectionCard
            title={t('pricing.region.regions')}
            disableContentPadding
            action={canEdit ? (
              <Button size="small" startIcon={<IconPlus size={16} />} onClick={() => openRegionDialog('new')}>
                {t('common.actions.add')}
              </Button>
            ) : undefined}
          >
            {regions.isFirstLoad ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
            ) : regionList.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2.5 }}>
                {t('pricing.region.regionEmpty')}
              </Typography>
            ) : (
              <List disablePadding>
                {regionList.map((region) => (
                  <ListItemButton
                    key={region.id}
                    selected={region.id === selectedId}
                    onClick={() => setSelectedId(region.id)}
                    sx={{ pr: 1 }}
                  >
                    <ListItemText
                      primary={region.name}
                      secondary={`${t('pricing.region.routeCount', { count: region.routeCount })} · ${
                        t('pricing.region.locationCount', { count: region.locationCount })}${
                        region.managerName === null ? '' : ` · ${region.managerName}`}`}
                    />
                    {canEdit ? (
                      <IconButton
                        size="small"
                        aria-label={t('common.actions.edit')}
                        onClick={(e) => { e.stopPropagation(); openRegionDialog(region); }}
                      >
                        <IconEdit size={17} />
                      </IconButton>
                    ) : null}
                    {canDelete ? (
                      <IconButton
                        size="small"
                        color="error"
                        aria-label={t('common.actions.delete')}
                        onClick={(e) => { e.stopPropagation(); setRegionDeleting(region); }}
                      >
                        <IconTrash size={17} />
                      </IconButton>
                    ) : null}
                  </ListItemButton>
                ))}
              </List>
            )}
          </SectionCard>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          {/* Tuyến và địa điểm của CÙNG một khu vực, hai tab cạnh nhau: sửa
              khu vực của một địa điểm là chuyển mọi tuyến đi từ đó, nên hai
              việc này phải nhìn thấy nhau. */}
          <Tabs
            value={tab}
            onChange={(_event, value: 'tuyen' | 'diaDiem') => setTab(value)}
            sx={{ mb: 2 }}
          >
            <Tab value="tuyen" label={t('pricing.region.routes')} />
            <Tab value="diaDiem" label={t('nav.priceLocations')} />
          </Tabs>

          {tab === 'diaDiem' ? (
            <LocationsPanel
              regionId={selectedId}
              regions={regionList}
              canEdit={canEditLocations}
              /* Đổi khu vực của một địa điểm là đổi luôn danh sách tuyến bên
                 tab kia và hai con số đếm ở thanh bên — tải lại cả ba. */
              onChanged={() => { regions.reload(); routes.reload(); }}
            />
          ) : (
          <SectionCard
            title={selected?.name ?? t('pricing.region.routes')}
            hint={`${t('pricing.region.routesHint')} ${t('pricing.region.roundTripRule')}`}
            disableContentPadding
            action={(
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  select
                  size="small"
                  label={t('pricing.region.unitFilter')}
                  value={locDonVi}
                  onChange={(e) => setLocDonVi(e.target.value)}
                  sx={{ minWidth: 180 }}
                >
                  <MenuItem value=""><em>{t('common.actions.all')}</em></MenuItem>
                  {donViCuaKhuVuc.map((u) => <MenuItem key={u.code} value={u.code}>{u.label}</MenuItem>)}
                </TextField>
                <TextField
                  size="small"
                  placeholder={t('common.actions.search')}
                  value={timTuyen}
                  onChange={(e) => setTimTuyen(e.target.value)}
                  sx={{ width: { xs: '100%', sm: 360 } }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start"><IconSearch size={16} /></InputAdornment>
                    ),
                  }}
                />
                {suaDuoc && selected !== null ? (
                  <Button
                    variant="contained"
                    startIcon={<IconPlus size={17} />}
                    onClick={() => setRouteEditing('new')}
                  >
                    {t('pricing.region.addRoute')}
                  </Button>
                ) : null}
              </Stack>
            )}
          >
            <DataTableShell
              isFirstLoad={routes.isFirstLoad}
              isRefetching={routes.isRefetching}
              errorMessage={routes.errorMessage}
              onDismissError={routes.clearError}
              isEmpty={routeList.length === 0}
              emptyTitle={t('pricing.region.routeEmpty')}
              head={<RegionPriceHead units={units} />}
              page={trangHienTai}
              pageCount={soTrang}
              totalRows={routeList.length}
              onPageChange={setTrang}
            >
              {tuyenTrangNay.map((route) => (
                <RegionPriceRows
                  key={route.id}
                  route={route}
                  units={units}
                  onEdit={suaDuoc ? setRouteEditing : undefined}
                  onDelete={xoaDuoc ? setRouteDeleting : undefined}
                />
              ))}
            </DataTableShell>
          </SectionCard>
          )}
        </Box>
      </Stack>

      <KetQuaNhapDialog
        dangChay={dangExcel === 'nhap'}
        ketQua={ketQua}
        onClose={() => setKetQua(null)}
      />

      <ConfirmDialog
        isOpen={regionEditing !== null}
        title={regionEditing === 'new' ? t('pricing.region.addRegion') : t('pricing.region.editRegion')}
        confirmLabel={t('common.actions.save')}
        isSubmitting={isSubmitting}
        isConfirmDisabled={regionName.trim().length < 2}
        onConfirm={() => void handleRegionSave()}
        onClose={() => setRegionEditing(null)}
      >
        <Stack spacing={2} sx={{ mt: 1 }}>
          {regionError ? <Alert severity="error">{regionError}</Alert> : null}
          <TextField
            label={t('pricing.region.regionName')}
            value={regionName}
            onChange={(e) => setRegionName(e.target.value)}
            autoFocus
            fullWidth
            required
          />
          {/* Người phụ trách quyết định AI XEM ĐƯỢC bảng giá của khu vực này,
              nên nói thẳng điều đó ngay dưới ô chọn — một ô tên là "người phụ
              trách" dễ bị hiểu thành ghi chú hành chính. */}
          <TextField
            select
            label={t('pricing.region.manager')}
            value={regionManager}
            onChange={(e) => setRegionManager(e.target.value)}
            helperText={t('pricing.region.managerHint')}
            fullWidth
          >
            <MenuItem value=""><em>{t('pricing.region.noManager')}</em></MenuItem>
            {truongPhong.map((u) => (
              <MenuItem key={u.id} value={String(u.id)}>{u.fullName}</MenuItem>
            ))}
          </TextField>
        </Stack>
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={regionDeleting !== null}
        title={t('pricing.region.deleteRegion')}
        /* Nói đúng điều kiện của backend: khu vực còn địa điểm thì KHÔNG xoá
           được (409), chứ không phải xoá kèm. Địa điểm còn nằm trong đơn cũ và
           bảng giá cũ, còn tuyến thì mang giá thật. */
        description={t(
          (regionDeleting?.locationCount ?? 0) > 0
            ? 'pricing.region.deleteRegionBlocked'
            : 'pricing.region.deleteRegionAsk',
          { name: regionDeleting?.name ?? '', count: regionDeleting?.locationCount ?? 0 },
        )}
        isConfirmDisabled={(regionDeleting?.locationCount ?? 0) > 0}
        confirmLabel={t('common.actions.delete')}
        isDestructive
        isSubmitting={isSubmitting}
        onConfirm={() => {
          const region = regionDeleting;
          if (region) void runDelete(() => deleteRegion(region.id), () => setRegionDeleting(null));
        }}
        onClose={() => setRegionDeleting(null)}
      />

      <ConfirmDialog
        isOpen={routeDeleting !== null}
        title={t('pricing.region.deleteRoute')}
        description={routeDeleting === null ? undefined : t('pricing.region.deleteRouteAsk', {
          route: `${routeDeleting.origin.locationName} → ${routeDeleting.destination.locationName}`,
        })}
        confirmLabel={t('common.actions.delete')}
        isDestructive
        isSubmitting={isSubmitting}
        onConfirm={() => {
          const route = routeDeleting;
          if (route) void runDelete(() => deleteRegionRoute(route.id), () => setRouteDeleting(null));
        }}
        onClose={() => setRouteDeleting(null)}
      />

      <PriceSessionsDialog
        open={moPhien}
        sessions={sessions}
        canEdit={canEdit}
        onClose={() => setMoPhien(false)}
        onChanged={(chonPhienId) => {
          if (chonPhienId !== undefined) onChonPhien(chonPhienId);
          onPhienDoi();
          regions.reload();
          routes.reload();
        }}
      />

      {selected === null ? null : (
        <RegionRouteDialog
          route={routeEditing}
          sessionId={phienId}
          onClose={() => setRouteEditing(null)}
          onSaved={() => {
            setRouteEditing(null);
            routes.reload();
            regions.reload();
          }}
        />
      )}
    </>
  );
}
