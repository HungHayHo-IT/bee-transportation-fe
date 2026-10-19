import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert, Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, InputAdornment, MenuItem, Stack, TextField, Tooltip, Typography,
  createFilterOptions,
} from '@mui/material';
import { IconInfoCircle, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';
import { CurrencyAmountField } from '@/components/CurrencyAmountField';
import { LocationPicker } from '@/components/form/LocationPicker';
import { NumberField } from '@/components/form/NumberField';
import { ProvinceField } from '@/components/form/ProvinceField';
import { usePageLevels } from '@/hooks/usePageLevels';
import { foldDiacritics } from '@/utils/foldDiacritics';
import { describeError } from '@/services/apiClient';
import { fetchLocations, fetchPriceUnits } from '@/services/pricingService';
import { createRegionRoute, updateRegionRoute } from '@/services/regionRouteService';
import type { PriceUnit, RegionRoute } from '@/types/pricing';
import { coChieuVe, giaHaiChieu } from './regionPriceColumns';

export interface RegionRouteDialogProps {
  /** 'new' = thêm tuyến; null = đóng. */
  route: RegionRoute | 'new' | null;
  /** Phiên giá để ghi vào. null = để backend chọn phiên đang áp dụng. */
  sessionId?: number | null;
  onClose: () => void;
  onSaved: () => void;
}

interface PriceRow {
  unitCode: string;
  oneWayPrice: number | null;
  roundTripPrice: number | null;
}

/** Một khối giá của tuyến: nguyên container (FCL) hoặc hàng lẻ (LCL). */
interface ServiceBlock {
  kind: '' | 'FCL' | 'LCL';
  prices: PriceRow[];
}

interface FormState {
  roundTripKm: number | null;
  originProvince: string;
  originLocationId: string;
  destinationProvince: string;
  destinationLocationId: string;
  services: ServiceBlock[];
}

/** Gõ không dấu vẫn ra: "theo khoi" tìm thấy "Theo khối (CBM)". */
const locDonVi = createFilterOptions<PriceUnit>({ stringify: (u) => foldDiacritics(u.label) });

const EMPTY_PRICE: PriceRow = { unitCode: '', oneWayPrice: null, roundTripPrice: null };
const EMPTY_SERVICE: ServiceBlock = { kind: '', prices: [EMPTY_PRICE] };

const ENDPOINT_GRID = { display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } };
const PRICE_GRID = {
  display: 'grid', gap: 1.5, alignItems: 'start',
  gridTemplateColumns: { xs: '1fr', md: '1.6fr 1.4fr 1.4fr auto' },
};

function initialForm(route: RegionRoute | 'new' | null): FormState {
  if (route === null || route === 'new') {
    return {
      roundTripKm: null,
      originProvince: '', originLocationId: '', destinationProvince: '', destinationLocationId: '',
      services: [EMPTY_SERVICE],
    };
  }
  return {
    roundTripKm: route.roundTripKm,
    originProvince: route.origin.province ?? '',
    originLocationId: String(route.origin.locationId),
    destinationProvince: route.destination.province ?? '',
    destinationLocationId: String(route.destination.locationId),
    services: route.services.map((s) => ({ kind: s.kind, prices: s.prices })),
  };
}

function isPriceRowValid(row: PriceRow): boolean {
  return row.unitCode !== ''
    && ((row.oneWayPrice ?? 0) > 0 || (row.roundTripPrice ?? 0) > 0);
}

/** Ô trùng trong danh sách: cùng một giá trị đã xuất hiện ở dòng khác. */
function isRepeated<T>(values: T[], index: number): boolean {
  const value = values[index];
  return value !== null && value !== '' && values.indexOf(value) !== values.lastIndexOf(value);
}

/**
 * Thêm / sửa một tuyến: điểm nhận, điểm giao, rồi từng dịch vụ con với danh sách
 * mức giá theo trọng tải xe.
 */
export function RegionRouteDialog({
  route, sessionId, onClose, onSaved,
}: RegionRouteDialogProps): ReactNode {
  const { t } = useTranslation();
  /* Thêm địa điểm mới ngay trong ô chọn cần quyền ghi ở trang Địa điểm — cùng
     luật với form đơn hàng. */
  const levels = usePageLevels();
  const canCreateLocation = levels?.priceLocations === 'edit' || levels?.priceLocations === 'full';

  const [form, setForm] = useState<FormState>(() => initialForm(route));
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setForm(initialForm(route));
    setErrorMessage(null);
  }, [route]);

  /* Khu vực của tuyến KHÔNG chọn ở đây: nó là khu vực của địa điểm nhận. Hiện
     ra để người nhập thấy tuyến này sẽ nằm ở đâu, và thấy luôn khi địa điểm
     chưa gán khu vực — lúc đó tuyến không hiện ở bảng tuyến của khu vực nào. */
  /* Danh mục đơn vị tính — cùng bảng mà bảng giá cũ dùng. Tải một lần cho cả
     hộp thoại: mỗi mức giá đều cần đúng danh sách này. */
  const [donVi, setDonVi] = useState<PriceUnit[]>([]);
  useEffect(() => {
    void fetchPriceUnits().then(setDonVi).catch(() => setDonVi([]));
  }, []);

  const [khuVuc, setKhuVuc] = useState<string | null>(null);
  const originLocationId = form.originLocationId;
  useEffect(() => {
    if (originLocationId === '') {
      setKhuVuc(null);
      return;
    }
    let con = true;
    void fetchLocations({ includeInactive: true })
      .then((p) => {
        if (con)
          setKhuVuc(p.items.find((l) => l.id === Number(originLocationId))?.regionName ?? null);
      })
      .catch(() => { if (con) setKhuVuc(null); });
    return () => { con = false; };
  }, [originLocationId]);

  const isSameEndpoint = form.originLocationId !== ''
    && form.originLocationId === form.destinationLocationId;
  const chosenChildIds = form.services.map((s) => s.kind);
  const isValid = form.originProvince !== '' && form.originLocationId !== ''
    && form.destinationProvince !== '' && form.destinationLocationId !== ''
    && !isSameEndpoint && form.services.length > 0
    && form.services.every((block, index) => {
      const loads = block.prices.map((p) => p.unitCode);
      return block.kind !== '' && !isRepeated(chosenChildIds, index)
        && block.prices.length > 0
        && block.prices.every((p, priceIndex) => isPriceRowValid(p) && !isRepeated(loads, priceIndex));
    });

  const updateService = (index: number, update: (block: ServiceBlock) => ServiceBlock): void =>
    setForm((f) => ({ ...f, services: f.services.map((b, i) => (i === index ? update(b) : b)) }));

  const updatePrice = (serviceIndex: number, priceIndex: number, patch: Partial<PriceRow>): void =>
    updateService(serviceIndex, (b) => ({
      ...b,
      prices: b.prices.map((p, i) => (i === priceIndex ? { ...p, ...patch } : p)),
    }));

  const handleSave = async (): Promise<void> => {
    if (route === null || !isValid) return;
    setIsSaving(true);
    setErrorMessage(null);
    const payload = {
      ...(sessionId === null || sessionId === undefined ? {} : { sessionId }),
      originLocationId: Number(form.originLocationId),
      destinationLocationId: Number(form.destinationLocationId),
      roundTripKm: form.roundTripKm,
      services: form.services.map((b) => ({
        kind: b.kind as 'FCL' | 'LCL',
        prices: b.prices,
      })),
    };
    try {
      if (route === 'new') await createRegionRoute(payload);
      else await updateRegionRoute(route.id, payload);
      onSaved();
    } catch (error) {
      setErrorMessage(describeError(error));
    } finally {
      setIsSaving(false);
    }
  };

  /* Hai khối, không hơn: bảng giá thật của Bee chia đúng FCL và LCL. Trước đây
     ô này chọn DỊCH VỤ CON, nhưng giá không đổi theo dịch vụ — một tuyến chở
     một cái 20DC thì giá như nhau, bất kể đơn thuộc dịch vụ nào. */
  const serviceMenuItems = (['FCL', 'LCL'] as const).map((k) => (
    <MenuItem key={k} value={k}>
      {k}
      <Box component="span" sx={{ color: 'text.secondary', ml: 0.75 }}>
        · {t(k === 'FCL' ? 'pricing.region.kindFcl' : 'pricing.region.kindLcl')}
      </Box>
    </MenuItem>
  ));

  return (
    <Dialog open={route !== null} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {route === 'new' ? t('pricing.region.addRoute') : t('pricing.region.editRoute')}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 0.5 }}>
          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

          {/* Mỗi đầu: chọn tỉnh trước, rồi chọn (hoặc thêm) địa điểm TRONG tỉnh đó.
              Đổi tỉnh thì bỏ chọn địa điểm, để không còn tuyến ghi một tỉnh kèm
              kho ở tỉnh khác. */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('pricing.region.origin')}</Typography>
            <Box sx={ENDPOINT_GRID}>
              <ProvinceField
                label={t('pricing.locationProvince')}
                value={form.originProvince}
                onChange={(province) =>
                  setForm((f) => ({ ...f, originProvince: province, originLocationId: '' }))}
                isRequired
              />
              <LocationPicker
                label={t('pricing.region.location')}
                value={form.originLocationId}
                province={form.originProvince}
                isDisabled={form.originProvince === ''}
                canCreate={canCreateLocation}
                onChange={(originLocationId) => setForm((f) => ({ ...f, originLocationId }))}
              />
            </Box>
          </Box>

          {/* Km 2 chiều đứng NGAY DƯỚI hai đầu tuyến, không nằm trong từng mức
              giá: quãng đường là của TUYẾN — Đà Nẵng → Quảng Ngãi không đổi
              theo việc chở bằng xe 1.4T hay container 20DC. Để nó ở mỗi dòng
              giá là cùng một con số chép lại tám lần, và chỉ cần một lần gõ
              lệch là không ai biết con nào đúng. */}
          <NumberField
            label={t('pricing.region.roundTripKm')}
            value={form.roundTripKm}
            onChange={(roundTripKm) => setForm((f) => ({ ...f, roundTripKm }))}
            min={0}
            unit="km"
            helperText={t('pricing.region.roundTripKmHint')}
          />

          {/* Khu vực chỉ để ĐỌC: muốn đổi thì đổi khu vực của địa điểm nhận ở
              tab Địa điểm. Một ô chọn ở đây sẽ là nguồn sự thật thứ hai, và
              tuyến sẽ ghi "Miền Nam" trong khi kho của nó ở Đà Nẵng. */}
          {form.originLocationId === '' ? null : (
            <Typography variant="caption" color={khuVuc === null ? 'warning.main' : 'text.secondary'}>
              {khuVuc === null
                ? t('pricing.region.routeRegionMissing')
                : t('pricing.region.routeRegionFrom', { region: khuVuc })}
            </Typography>
          )}

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('pricing.region.destination')}</Typography>
            <Box sx={ENDPOINT_GRID}>
              <ProvinceField
                label={t('pricing.locationProvince')}
                value={form.destinationProvince}
                onChange={(province) =>
                  setForm((f) => ({ ...f, destinationProvince: province, destinationLocationId: '' }))}
                isRequired
              />
              <LocationPicker
                label={t('pricing.region.location')}
                value={form.destinationLocationId}
                province={form.destinationProvince}
                isDisabled={form.destinationProvince === ''}
                canCreate={canCreateLocation}
                error={isSameEndpoint}
                helperText={isSameEndpoint ? t('pricing.sameEndpoints') : undefined}
                onChange={(destinationLocationId) => setForm((f) => ({ ...f, destinationLocationId }))}
              />
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('pricing.region.servicePrices')}</Typography>
            <Stack spacing={2}>
              {form.services.map((block, serviceIndex) => {
                const isDuplicate = isRepeated(chosenChildIds, serviceIndex);
                const loads = block.prices.map((p) => p.unitCode);
                return (
                  <Box
                    key={serviceIndex}
                    sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2 }}
                  >
                    <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 2 }}>
                      <TextField
                        select
                        required
                        label={t('pricing.region.kind')}
                        value={block.kind}
                        onChange={(e) => updateService(serviceIndex, (b) => ({
                          ...b, kind: e.target.value as 'FCL' | 'LCL',
                        }))}
                        error={isDuplicate}
                        helperText={isDuplicate ? t('pricing.region.duplicateKind') : undefined}
                        sx={{ flex: 1, minWidth: 0 }}
                      >
                        {serviceMenuItems}
                      </TextField>
                      <IconButton
                        aria-label={t('pricing.region.removeService')}
                        disabled={form.services.length === 1}
                        onClick={() => setForm((f) => ({ ...f, services: f.services.filter((_, i) => i !== serviceIndex) }))}
                        sx={{ mt: 1 }}
                      >
                        <IconTrash size={18} />
                      </IconButton>
                    </Stack>

                    <Stack spacing={1.5}>
                      {block.prices.map((row, priceIndex) => {
                        const isDuplicateLoad = isRepeated(loads, priceIndex);
                        return (
                          <Box key={priceIndex} sx={PRICE_GRID}>
                            {/* Đơn vị tính lấy từ DANH MỤC, không gõ số tấn:
                                bảng giá thật có cả "20'DC" và "40'DC" — đó là
                                loại container, không có con số tấn nào điền
                                vào được mà không phải bịa ra. */}
                            <Autocomplete
                              /* CẢ danh mục, không lọc theo FCL/LCL của khối:
                                 bảng giá thật có khối hàng lẻ tính theo bậc
                                 container và ngược lại, nên khoá lại là chặn
                                 một dòng giá có thật. */
                              options={donVi}
                              value={donVi.find((u) => u.code === row.unitCode) ?? null}
                              onChange={(_, u) => updatePrice(serviceIndex, priceIndex, {
                                unitCode: u === null ? '' : u.code,
                              })}
                              getOptionLabel={(u) => u.label}
                              filterOptions={locDonVi}
                              isOptionEqualToValue={(a, b) => a.code === b.code}
                              openOnFocus
                              autoHighlight
                              fullWidth
                              renderOption={(props, u) => (
                                <Box component="li" {...props} key={u.code}>{u.label}</Box>
                              )}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  required
                                  label={t('pricing.region.unit')}
                                  /* Kính lúp và chữ gợi ý: ô này GÕ ĐƯỢC để
                                     lọc, nhưng trông y hệt một ô thả xuống
                                     thường nên không ai thử gõ — và vẫn cuộn
                                     qua ba chục dòng như cũ. */
                                  placeholder={t('common.actions.search')}
                                  error={isDuplicateLoad}
                                  helperText={
                                    isDuplicateLoad ? t('pricing.region.duplicateUnit') : undefined
                                  }
                                  InputProps={{
                                    ...params.InputProps,
                                    startAdornment: (
                                      <>
                                        <InputAdornment position="start" sx={{ ml: 0.5, mr: 0 }}>
                                          <IconSearch size={16} />
                                        </InputAdornment>
                                        {params.InputProps.startAdornment}
                                      </>
                                    ),
                                  }}
                                />
                              )}
                            />
                            <CurrencyAmountField
                              label={t('pricing.region.oneWayPrice')}
                              value={row.oneWayPrice}
                              /* Gõ giá 1 chiều thì điền sẵn giá 2 chiều = +50%.
                                 Chỉ điền khi ô kia đang TRỐNG hoặc đang giữ
                                 đúng con số suy ra từ giá cũ: người đã gõ một
                                 con số riêng thì không được ghi đè lên họ. */
                              onChange={(oneWayPrice) => updatePrice(serviceIndex, priceIndex, {
                                oneWayPrice,
                                ...(oneWayPrice !== null && coChieuVe(row.unitCode)
                                  && (row.roundTripPrice === null
                                    || (row.oneWayPrice !== null
                                      && row.roundTripPrice === giaHaiChieu(row.oneWayPrice)))
                                  ? { roundTripPrice: giaHaiChieu(oneWayPrice) }
                                  : {}),
                              })}
                            />
                            <CurrencyAmountField
                              label={t('pricing.region.roundTripPrice')}
                              value={row.roundTripPrice}
                              onChange={(roundTripPrice) => updatePrice(serviceIndex, priceIndex, { roundTripPrice })}
                            />
                            <IconButton
                              aria-label={t('pricing.region.removePrice')}
                              disabled={block.prices.length === 1}
                              onClick={() => updateService(serviceIndex, (b) => ({
                                ...b, prices: b.prices.filter((_, i) => i !== priceIndex),
                              }))}
                              sx={{ mt: 1, justifySelf: 'start' }}
                            >
                              <IconTrash size={18} />
                            </IconButton>
                          </Box>
                        );
                      })}
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Button
                          size="small"
                          startIcon={<IconPlus size={16} />}
                          onClick={() => updateService(serviceIndex, (b) => ({ ...b, prices: [...b.prices, EMPTY_PRICE] }))}
                        >
                          {t('pricing.region.addPrice')}
                        </Button>
                        {/* Hai câu luật cất sau dấu (i). Vẫn phải nói — điền
                            sẵn giá 2 chiều mà không giải thích thì người dùng
                            tưởng hệ thống gõ nhầm hộ mình — nhưng đọc một lần
                            là nhớ, để nguyên dưới mỗi khối giá thì từ lần thứ
                            hai chỉ còn là chữ chen giữa các ô nhập. */}
                        <Tooltip
                          title={`${t('pricing.region.priceRowHint')} ${t('pricing.region.roundTripRule')}`}
                          enterTouchDelay={0}
                          leaveTouchDelay={6000}
                        >
                          <IconButton
                            size="small"
                            aria-label={t('pricing.region.roundTripRule')}
                            sx={{ color: 'text.secondary' }}
                          >
                            <IconInfoCircle size={17} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </Box>
                );
              })}
              {/* Chỉ có hai loại hàng, FCL và LCL. Khai đủ cả hai thì ẩn
                  hẳn nút chứ không để nó xám: một cái nút không bao giờ bấm
                  được nữa chỉ làm người ta rê chuột vào để tìm lý do. */}
              {form.services.length >= 2 ? null : (
                <Box>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<IconPlus size={16} />}
                    onClick={() => setForm((f) => ({ ...f, services: [...f.services, EMPTY_SERVICE] }))}
                  >
                    {t('pricing.region.addService')}
                  </Button>
                </Box>
              )}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={isSaving}>{t('common.actions.cancel')}</Button>
        <Button variant="contained" onClick={() => void handleSave()} disabled={isSaving || !isValid}>
          {t('common.actions.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
