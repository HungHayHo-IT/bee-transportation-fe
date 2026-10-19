import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, IconButton, Stack, TableCell, TableRow, Tooltip } from '@mui/material';
import { IconEdit, IconEye, IconTrash } from '@tabler/icons-react';
import { formatCurrencyVnd } from '@/utils/formatters';
import type { RegionRoute, RouteService } from '@/types/pricing';
import type { CotDonVi } from './regionPriceColumns';

/**
 * Bảng giá tuyến hiển thị ĐÚNG như file Excel: dạng rộng.
 *
 * Mỗi dòng là MỘT tuyến × MỘT dịch vụ con; mỗi đơn vị tính một cột, trong ô là
 * giá 1 chiều và 2 chiều. Đây là hình dạng của chính bảng giá giấy mà Bee đang
 * dùng — đọc ngang một dòng là thấy cả dải giá của một tuyến, thay vì tám dòng
 * giống hệt nhau chỉ khác mỗi loại xe.
 *
 * Cột đơn vị tính dựng từ dữ liệu ĐANG HIỆN, không phải từ cả danh mục 27 đơn
 * vị: một bảng giá thật chỉ dùng 6–10 bậc, in hết là bắt người ta cuộn ngang
 * qua mấy chục cột trống.
 */

function DiaDiem({ ten, tinh }: { ten: string; tinh: string | null }): ReactNode {
  return (
    <Box>
      <Box sx={{ fontSize: 14 }}>{ten}</Box>
      <Box sx={{ fontSize: 12, color: 'text.secondary' }}>{tinh ?? '—'}</Box>
    </Box>
  );
}

/**
 * Một ô giá: hai chiều xếp chồng, NHÃN và SỐ thẳng hàng nhau.
 *
 * Nhãn cố định bề ngang và số canh phải, nên hai dòng "1 chiều" / "2 chiều"
 * của cùng một ô — và của mọi ô trong cột — nằm thẳng cột với nhau. Để nhãn
 * chạy theo độ dài con số thì mỗi dòng lệch một kiểu, và cả bảng đọc như bị
 * xô. `nowrap` để "1 chiều" không bị bẻ xuống dòng khi cột hẹp.
 *
 * Chiều không có giá thì KHÔNG có dòng — khác hẳn giá 0.
 */
function OGia({ service, unitCode }: { service: RouteService; unitCode: string }): ReactNode {
  const { t } = useTranslation();
  const gia = service.prices.find((p) => p.unitCode === unitCode);
  if (gia === undefined) return <Box sx={{ color: 'text.disabled' }}>—</Box>;

  const dong = (nhan: string, tien: number): ReactNode => (
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, whiteSpace: 'nowrap' }}>
      <Box component="span" sx={{ color: 'text.secondary', fontSize: 11, minWidth: 40, textAlign: 'left' }}>
        {nhan}
      </Box>
      <Box component="span" sx={{ fontSize: 13, flex: 1, textAlign: 'right' }}>
        {formatCurrencyVnd(tien)}
      </Box>
    </Box>
  );

  return (
    <Stack spacing={0.25} sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 132 }}>
      {gia.oneWayPrice === null ? null : dong(t('pricing.region.oneWayShort'), gia.oneWayPrice)}
      {gia.roundTripPrice === null ? null : dong(t('pricing.region.roundTripShort'), gia.roundTripPrice)}
    </Stack>
  );
}

export interface RegionPriceHeadProps {
  units: readonly CotDonVi[];
  /** Hiện cột Khu vực — danh sách phẳng cần, bảng trong một khu vực thì không. */
  showRegion?: boolean;
  showActions?: boolean;
}

export function RegionPriceHead({
  units, showRegion = false, showActions = true,
}: RegionPriceHeadProps): ReactNode {
  const { t } = useTranslation();
  return (
    <TableRow>
      {showRegion ? <TableCell>{t('pricing.region.region')}</TableCell> : null}
      <TableCell>{t('pricing.region.origin')}</TableCell>
      <TableCell>{t('pricing.region.destination')}</TableCell>
      <TableCell align="right">{t('pricing.region.roundTripKm')}</TableCell>
      <TableCell>{t('pricing.region.kind')}</TableCell>
      {units.map((u) => (
        <TableCell key={u.code} align="right" sx={{ whiteSpace: 'nowrap' }}>{u.label}</TableCell>
      ))}
      {showActions ? <TableCell align="right" /> : null}
    </TableRow>
  );
}

export interface RegionPriceRowsProps {
  route: RegionRoute;
  units: readonly CotDonVi[];
  showRegion?: boolean;
  onView?: (route: RegionRoute) => void;
  onEdit?: (route: RegionRoute) => void;
  onDelete?: (route: RegionRoute) => void;
}

/**
 * Các dòng của MỘT tuyến — một dòng cho mỗi dịch vụ con.
 *
 * Hai đầu tuyến, km và nhóm nút gộp ô theo chiều dọc (`rowSpan`) thay vì lặp
 * lại: lặp thì nhìn như nhiều tuyến trùng nhau, mà nút sửa/xoá lặp lại còn tệ
 * hơn — chúng tác động lên CẢ tuyến chứ không lên riêng dòng dịch vụ đó.
 */
export function RegionPriceRows({
  route, units, showRegion = false, onView, onEdit, onDelete,
}: RegionPriceRowsProps): ReactNode {
  const { t } = useTranslation();
  const coNut = onView !== undefined || onEdit !== undefined || onDelete !== undefined;
  // Tuyến chưa khai dịch vụ nào vẫn phải hiện: nó có thật, và giấu đi thì không
  // ai sửa được nó nữa.
  const services: (RouteService | null)[] = route.services.length === 0 ? [null] : route.services;

  const nut = (
    <Stack direction="row" spacing={0} justifyContent="flex-end">
      {onView ? (
        <Tooltip title={t('common.actions.viewDetail')}>
          <IconButton size="small" onClick={() => onView(route)}><IconEye size={17} /></IconButton>
        </Tooltip>
      ) : null}
      {onEdit ? (
        <Tooltip title={t('common.actions.edit')}>
          <IconButton size="small" onClick={() => onEdit(route)}><IconEdit size={17} /></IconButton>
        </Tooltip>
      ) : null}
      {onDelete ? (
        <Tooltip title={t('common.actions.delete')}>
          <IconButton size="small" color="error" onClick={() => onDelete(route)}>
            <IconTrash size={17} />
          </IconButton>
        </Tooltip>
      ) : null}
    </Stack>
  );

  return (
    <>
      {services.map((service, i) => (
        <TableRow key={service?.kind ?? 'trong'} hover>
          {i > 0 ? null : (
            <>
              {showRegion ? (
                <TableCell rowSpan={services.length}>
                  {route.regionName ?? (
                    <Box component="span" sx={{ color: 'warning.main' }}>
                      {t('pricing.region.noRegion')}
                    </Box>
                  )}
                </TableCell>
              ) : null}
              <TableCell rowSpan={services.length}>
                <DiaDiem ten={route.origin.locationName} tinh={route.origin.province} />
              </TableCell>
              <TableCell rowSpan={services.length}>
                <DiaDiem ten={route.destination.locationName} tinh={route.destination.province} />
              </TableCell>
              <TableCell rowSpan={services.length} align="right" sx={{ whiteSpace: 'nowrap' }}>
                {route.roundTripKm === null ? '—' : `${route.roundTripKm} km`}
              </TableCell>
            </>
          )}
          <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
            {service?.kind ?? (
              <Box component="span" sx={{ fontWeight: 400, color: 'text.disabled' }}>
                {t('pricing.region.noPriceYet')}
              </Box>
            )}
          </TableCell>
          {units.map((u) => (
            <TableCell key={u.code} align="right">
              {service === null
                ? <Box sx={{ color: 'text.disabled' }}>—</Box>
                : <OGia service={service} unitCode={u.code} />}
            </TableCell>
          ))}
          {coNut && i === 0 ? (
            <TableCell rowSpan={services.length} align="right" sx={{ whiteSpace: 'nowrap' }}>
              {nut}
            </TableCell>
          ) : null}
        </TableRow>
      ))}
    </>
  );
}
