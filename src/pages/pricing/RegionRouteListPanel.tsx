import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { Box, Button, MenuItem, Stack, TextField } from '@mui/material';
import { IconPlus } from '@tabler/icons-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataTableShell } from '@/components/DataTableShell';
import { SectionCard } from '@/components/SectionCard';
import { LocationPicker } from '@/components/form/LocationPicker';
import { ProvinceField } from '@/components/form/ProvinceField';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { describeError } from '@/services/apiClient';
import {
  deleteRegionRoute, fetchRegionRouteList, fetchRegions,
} from '@/services/regionRouteService';
import { fetchPriceUnits } from '@/services/pricingService';
import type { PriceRegion, PriceUnit, RegionRoute } from '@/types/pricing';
import { RegionPriceHead, RegionPriceRows } from './RegionPriceTable';
import { cotDonVi } from './regionPriceColumns';
import { RegionRouteDialog } from './RegionRouteDialog';
import { RegionRouteViewDialog } from './RegionRouteViewDialog';

export interface RegionRouteListPanelProps {
  canEdit: boolean;
  canDelete: boolean;
  /** Phiên giá đang xem. undefined = phiên đang áp dụng. */
  sessionId?: number;
}

const PAGE_SIZE = 20;

interface Filters {
  regionId: string;
  originProvince: string;
  originLocationId: string;
  destinationProvince: string;
  destinationLocationId: string;
  kind: string;
  unitCode: string;
}

const NO_FILTERS: Filters = {
  regionId: '',
  originProvince: '',
  originLocationId: '',
  destinationProvince: '',
  destinationLocationId: '',
  kind: '',
  unitCode: '',
};

/*
 * Sau o loc tren CUNG mot hang khi man du rong. Vo hang thanh 3+3 thi cap
 * "tinh -> diem" cua mot dau tuyen bi tach ra hai dong, va mat phai tim lai
 * xem o nao di voi o nao.
 */
const FILTER_GRID = {
  display: 'grid', gap: 1.5, alignItems: 'center',
  gridTemplateColumns: {
    xs: '1fr',
    sm: 'repeat(2, minmax(0, 1fr))',
    lg: 'repeat(3, minmax(0, 1fr))',
    xl: 'repeat(7, minmax(0, 1fr)) auto',
  },
};

/**
 * Danh sách tuyến phẳng của mọi khu vực: lọc theo khu vực, tỉnh đi, tỉnh đến và
 * dịch vụ con; mỗi dòng xem / sửa / xoá.
 *
 * Lọc và phân trang chạy ở BACKEND — bảng giá đầy đủ là vài nghìn dòng giá, tải
 * hết về rồi lọc ở trình duyệt là tải cả bảng giá mỗi lần đổi một ô lọc.
 */
export function RegionRouteListPanel({
  canEdit, canDelete, sessionId,
}: RegionRouteListPanelProps): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();

  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [page, setPage] = useState(1);
  const setFilter = (patch: Partial<Filters>): void => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  const [regions, setRegions] = useState<PriceRegion[]>([]);
  useEffect(() => {
    void fetchRegions(sessionId).then(setRegions).catch(() => setRegions([]));
  }, [sessionId]);
  const [donVi, setDonVi] = useState<PriceUnit[]>([]);
  useEffect(() => {
    void fetchPriceUnits(sessionId).then(setDonVi).catch(() => setDonVi([]));
  }, [sessionId]);

  const loadRoutes = useCallback(() => fetchRegionRouteList({
    sessionId,
    regionId: filters.regionId === '' ? undefined : Number(filters.regionId),
    originProvince: filters.originProvince || undefined,
    destinationProvince: filters.destinationProvince || undefined,
    originLocationId: filters.originLocationId === '' ? undefined : Number(filters.originLocationId),
    destinationLocationId:
      filters.destinationLocationId === '' ? undefined : Number(filters.destinationLocationId),
    kind: filters.kind === '' ? undefined : (filters.kind as 'FCL' | 'LCL'),
    unitCode: filters.unitCode || undefined,
    page,
    limit: PAGE_SIZE,
  }), [filters, page, sessionId]);
  const routes = useAsyncResource(loadRoutes, [filters, page, sessionId]);
  const items = useMemo(() => routes.data?.items ?? [], [routes.data]);
  /* Cột = MỌI đơn vị có giá trong phiên, không chỉ trên trang đang xem: tính
     theo trang thì giá CBM/tấn của vài tuyến chành không bao giờ hiện cột. */
  const units = useMemo(() => {
    const trang = cotDonVi(items);
    const thieu = trang.filter((u) => !donVi.some((d) => d.code === u.code));
    return [...donVi.map(({ code, label }) => ({ code, label })), ...thieu];
  }, [items, donVi]);

  const [viewing, setViewing] = useState<RegionRoute | null>(null);
  const [editing, setEditing] = useState<RegionRoute | 'new' | null>(null);
  const [deleting, setDeleting] = useState<RegionRoute | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (): Promise<void> => {
    if (deleting === null) return;
    setIsDeleting(true);
    try {
      await deleteRegionRoute(deleting.id);
      setDeleting(null);
      routes.reload();
    } catch (error) {
      enqueueSnackbar(describeError(error), { variant: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const hasFilter = Object.values(filters).some((value) => value !== '');

  return (
    <>
      <Box sx={{ ...FILTER_GRID, mb: 2 }}>
        <TextField
          select
          label={t('pricing.region.region')}
          value={filters.regionId}
          onChange={(e) => setFilter({ regionId: e.target.value })}
        >
          <MenuItem value=""><em>{t('common.actions.all')}</em></MenuItem>
          {regions.map((r) => <MenuItem key={r.id} value={String(r.id)}>{r.name}</MenuItem>)}
        </TextField>
        {/* Tỉnh rồi tới ĐỊA ĐIỂM của chính tỉnh đó: một tỉnh có hàng chục
            kho, cảng và KCN, mà người tra giá thường biết rõ mình đi từ đâu.
            Đổi tỉnh thì BỎ CHỌN địa điểm — giữ lại là lọc theo một kho không
            thuộc tỉnh đang chọn, và bảng rỗng mà không ai hiểu vì sao. */}
        <ProvinceField
          label={t('pricing.region.originProvince')}
          value={filters.originProvince}
          onChange={(originProvince) => setFilter({ originProvince, originLocationId: '' })}
        />
        <LocationPicker
          label={t('pricing.region.origin')}
          value={filters.originLocationId}
          onChange={(originLocationId) => setFilter({ originLocationId })}
          province={filters.originProvince}
        />
        <ProvinceField
          label={t('pricing.region.destinationProvince')}
          value={filters.destinationProvince}
          onChange={(destinationProvince) => setFilter({
            destinationProvince, destinationLocationId: '',
          })}
        />
        <LocationPicker
          label={t('pricing.region.destination')}
          value={filters.destinationLocationId}
          onChange={(destinationLocationId) => setFilter({ destinationLocationId })}
          province={filters.destinationProvince}
        />
        <TextField
          select
          label={t('pricing.region.kind')}
          value={filters.kind}
          onChange={(e) => setFilter({ kind: e.target.value })}
        >
          <MenuItem value=""><em>{t('common.actions.all')}</em></MenuItem>
          <MenuItem value="FCL">FCL</MenuItem>
          <MenuItem value="LCL">LCL</MenuItem>
        </TextField>
        {/* Bảng chỉ dựng cột cho đơn vị có giá trên TRANG đang xem: giá CBM/tấn
            chỉ có ở vài tuyến chành, không lọc thì không ai thấy. */}
        <TextField
          select
          label={t('pricing.region.unitFilter')}
          value={filters.unitCode}
          onChange={(e) => setFilter({ unitCode: e.target.value })}
        >
          <MenuItem value=""><em>{t('common.actions.all')}</em></MenuItem>
          {donVi.map((u) => <MenuItem key={u.code} value={u.code}>{u.label}</MenuItem>)}
        </TextField>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          {hasFilter ? (
            <Button color="inherit" onClick={() => { setFilters(NO_FILTERS); setPage(1); }}>
              {t('common.actions.reset')}
            </Button>
          ) : null}
          {canEdit ? (
            <Button variant="contained" startIcon={<IconPlus size={17} />} onClick={() => setEditing('new')}
              sx={{ whiteSpace: 'nowrap' }}>
              {t('pricing.region.addRoute')}
            </Button>
          ) : null}
        </Stack>
      </Box>

      <SectionCard title={t('pricing.region.routes')} disableContentPadding>
        <DataTableShell
          isFirstLoad={routes.isFirstLoad}
          isRefetching={routes.isRefetching}
          errorMessage={routes.errorMessage}
          onDismissError={routes.clearError}
          isEmpty={items.length === 0}
          emptyTitle={t('pricing.region.routeListEmpty')}
          totalRows={routes.data?.total}
          page={page}
          pageCount={Math.max(1, Math.ceil((routes.data?.total ?? 0) / PAGE_SIZE))}
          onPageChange={setPage}
          head={<RegionPriceHead units={units} showRegion />}
        >
          {items.map((route) => (
            <RegionPriceRows
              key={route.id}
              route={route}
              units={units}
              showRegion
              onView={setViewing}
              onEdit={canEdit ? setEditing : undefined}
              onDelete={canDelete ? setDeleting : undefined}
            />
          ))}
        </DataTableShell>
      </SectionCard>

      <RegionRouteViewDialog route={viewing} onClose={() => setViewing(null)} />

      <RegionRouteDialog
        route={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          routes.reload();
        }}
      />

      <ConfirmDialog
        isOpen={deleting !== null}
        title={t('pricing.region.deleteRoute')}
        description={deleting === null ? undefined : t('pricing.region.deleteRouteAsk', {
          route: `${deleting.origin.locationName} → ${deleting.destination.locationName}`,
        })}
        confirmLabel={t('common.actions.delete')}
        isDestructive
        isSubmitting={isDeleting}
        onConfirm={() => void handleDelete()}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
