import type { ReactNode } from 'react';
import { Alert, Divider, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ORDER_SOURCE_LABEL_KEY } from '@/constants/provinces';
import { CARGO_FIELD_LABEL_KEY } from '@/constants/cargoFields';
import type { CargoFieldKey } from '@/constants/cargoFields';
import { OrderStatus } from '@/constants/orderStatus';
import { formatDate } from '@/utils/formatters';
import type { OrderDetail } from '@/types/order';
import type { ServiceField } from '@/types/serviceField';
import { useServiceSchema } from '../useServiceSchema';
import { DetailField } from './DetailField';
import { OrderCustomerField } from './OrderCustomerField';
import { BangGiaNiemYet } from './BangGiaNiemYet';
import { useGiaNiemYet } from './useGiaNiemYet';

/**
 * A value the service still declares gets its configured label and unit. One left
 * behind by a field that has since been removed is shown under its raw key rather
 * than dropped — the order really does carry it, and hiding it would make the
 * detail page disagree with the Excel export.
 */
function ServiceValues({
  fields,
  values,
}: {
  fields: ServiceField[];
  values: Record<string, unknown>;
}): ReactNode {
  const { t } = useTranslation();
  const known = new Set(fields.map((field) => field.fieldKey));

  const read = (value: unknown): string => {
    if (typeof value === 'boolean') return t(value ? 'common.states.yes' : 'common.states.no');
    return String(value);
  };

  const rows = [
    ...fields
      .filter((field) => values[field.fieldKey] !== undefined)
      .map((field) => ({
        key: field.fieldKey,
        label: field.unit === null ? field.label : `${field.label} (${field.unit})`,
        value: read(values[field.fieldKey]),
      })),
    ...Object.keys(values)
      .filter((key) => !known.has(key))
      .map((key) => ({ key, label: key, value: read(values[key]) })),
  ];

  if (rows.length === 0) return null;

  return (
    <>
      <Divider />
      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={3}>
        {rows.map((row) => (
          <DetailField key={row.key} label={row.label} value={row.value} />
        ))}
      </Stack>
    </>
  );
}

export function OrderOverviewTab({ order }: { order: OrderDetail }): ReactNode {
  const { t } = useTranslation();
  const { schema } = useServiceSchema(order.serviceId, order.serviceChildId);
  const giaTuyen = useGiaNiemYet(order.id);
  const dimensions = [order.dimLM, order.dimWM, order.dimHM];
  const hasDimensions = dimensions.some((value) => value !== null);

  /**
   * A figure is shown when the service uses it, or when this order carries a value
   * for it anyway — orders created before the service dropped that figure still
   * have to display what they hold.
   */
  const shows = (key: CargoFieldKey, value: unknown): boolean =>
    (schema?.cargoFields ?? []).includes(key) || (value !== null && value !== '');

  /**
   * Cross-border services have no domestic destination, so the create and edit
   * forms hide the destination boxes entirely. This read-only view has to agree:
   * showing "Tỉnh/thành điểm đến: —" invites staff to go looking for a value that
   * cannot exist, which is the same confusion the forms were changed to remove.
   *
   * Defaults to showing it while the schema is still in flight — an order really
   * can have a destination nobody has filled in yet, and blanking that out would
   * hide a genuine gap.
   */
  const hasDomesticOrigin = schema?.hasDomesticOrigin ?? true;
  const hasDomesticDest = schema?.hasDomesticDestination ?? true;

  // Three separate columns since 23/08/2026, so each note carries its own label
  // instead of one field being renamed after the status.
  const hasOutcomeNote =
    order.rejectReason !== null ||
    order.closeNote !== null ||
    order.rejectNote !== null ||
    order.cancelReason !== null;

  const packages = shows('packageCount', order.packageCount);
  const cargoShown =
    shows('weightKg', order.weightKg) ||
    shows('volumeCbm', order.volumeCbm) ||
    packages ||
    shows('dimLM', order.dimLM) ||
    order.goodsName !== null;

  return (
    <Stack spacing={3}>
      {order.status !== OrderStatus.AwaitingInfo ? null : (
        <Alert severity="warning">
          {/* Printed as the backend sends it. Working out what is missing here as
              well produced a list that disagreed with the one the backend acts on,
              so an order could be told it was incomplete without being told why. */}
          {t('orders.awaitingInfo.hint', { fields: order.missingInfo.join(', ') })}
        </Alert>
      )}

      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={3}>
        <OrderCustomerField customerId={order.customerId} customerName={order.customerName} />
        <DetailField label={t('orders.fields.service')} value={`${order.serviceCode} · ${order.serviceName}`} />
        {/* Dịch vụ con hiện CẢ tên lẫn mã TMS: tên để người đọc hiểu, mã để biết
            đơn này có đẩy sang OF1 được không. Đơn cũ chưa có thì ẩn hẳn dòng,
            không hiện một ô trống không giải thích gì. */}
        {order.serviceChildName === null ? null : (
          <DetailField
            label={t('admin.services.children')}
            value={order.serviceChildTmsMode === null
              ? order.serviceChildName
              : `${order.serviceChildName} · ${order.serviceChildTmsMode}`}
          />
        )}
        {/* Mã thực sự gửi sang OF1. Chỉ hiện riêng khi nó KHÔNG đến từ dịch vụ
            con — đơn nội địa không khai FCL/LCL vẫn có mã, và đó mới là thứ
            người đọc cần biết để trả lời "đơn này đẩy sang TMS được chưa". */}
        {order.tmsMode === null || order.serviceChildTmsMode !== null ? null : (
          <DetailField label={t('admin.services.tmsMode')} value={order.tmsMode} />
        )}
        <DetailField label={t('orders.list.sale')} value={order.saleName ?? t('orders.list.noSale')} />
        <DetailField label={t('orders.fields.desiredDate')} value={formatDate(order.desiredDate)} />
        <DetailField
          label={t('orders.fields.source')}
          value={order.source === null ? '—' : t(ORDER_SOURCE_LABEL_KEY[order.source])}
        />
      </Stack>

      <Divider />

      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={3}>
        {/* Hai đầu LUÔN hiện. Đầu nằm ngoài nước chỉ không có tỉnh/thành để
            đọc, nên ô đó đọc địa chỉ và đổi nhãn theo — hàng nhập khẩu là đầu
            ĐI, hàng xuất là đầu ĐẾN. Ô riêng "Nước đến", "Cửa khẩu" của dịch
            vụ con hiện ở khối thông tin riêng bên dưới. */}
        {/* Mỗi thứ một ô có nhãn riêng, không nối "tỉnh · địa chỉ" thành một
            dòng: ba thứ này khác nhau và dùng vào việc khác nhau — tỉnh là thứ
            báo cáo chạy trên, KHO/CẢNG là khoá tra giá niêm yết, còn địa chỉ
            là chỗ xe thật sự tới. Nối lại thì thiếu cái nào cũng không biết. */}
        {!hasDomesticOrigin ? null : (
          <DetailField
            label={t('orders.fields.originProvince')}
            value={order.originProvince ?? '—'}
          />
        )}
        <DetailField
          label={t('orders.edit.locationOrigin')}
          value={order.originLocationName ?? '—'}
        />
        <DetailField
          label={t('orders.fields.originAddress')}
          value={order.originAddress ?? '—'}
        />
        {!hasDomesticDest ? null : (
          <DetailField
            label={t('orders.fields.destinationProvince')}
            value={order.destinationProvince ?? '—'}
          />
        )}
        <DetailField
          label={t('orders.edit.locationDestination')}
          value={order.destinationLocationName ?? '—'}
        />
        <DetailField
          label={t('orders.fields.destinationAddress')}
          value={order.destinationAddress ?? '—'}
        />
      </Stack>

      {/* Giá niêm yết của tuyến, NGAY Ở TỔNG QUAN.
          Nó vốn chỉ nằm trong ô báo giá, mà ô đó chỉ hiện với người THUỘC một
          phòng ban của đơn. Tài khoản Quản trị hệ thống không thuộc phòng nào,
          nên với họ gợi ý giá không bao giờ hiện ra — ở bất kỳ tab nào. Giá
          của tuyến là thuộc tính của chính cái đơn, ai mở đơn cũng cần biết,
          nên chỗ của nó là đây.
          Chỉ ĐỌC: bấm để điền vẫn là việc của ô báo giá.

          Thiếu một đầu tuyến thì NÓI RA vì sao trống, giống hệt ô báo giá:
          không có gì hiện ra mà cũng không có lời nào thì người đọc tưởng
          bảng giá chưa có tuyến này, trong khi thật ra đơn chưa chọn địa
          điểm trong danh mục — hai chuyện khác hẳn nhau, và chỉ một trong
          hai là họ tự sửa được. */}
      {order.originLocationId === null || order.destinationLocationId === null ? (
        <Typography variant="caption" color="text.secondary">
          {t('quotes.form.listedNeedsAddress')}
        </Typography>
      ) : (
        <BangGiaNiemYet gia={giaTuyen} />
      )}

      {!cargoShown ? null : (
        <>
          <Divider />
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={3}>
            {!shows('weightKg', order.weightKg) ? null : (
              <DetailField
                label={t(CARGO_FIELD_LABEL_KEY.weightKg)}
                value={order.weightKg === null ? '—' : String(order.weightKg)}
              />
            )}
            {!shows('volumeCbm', order.volumeCbm) ? null : (
              <DetailField
                label={t(CARGO_FIELD_LABEL_KEY.volumeCbm)}
                value={order.volumeCbm === null ? '—' : String(order.volumeCbm)}
              />
            )}
            {!packages ? null : (
              <DetailField
                label={t(CARGO_FIELD_LABEL_KEY.packageCount)}
                value={
                  order.packageCount === null
                    ? '—'
                    : `${order.packageCount}${order.containerType === null ? '' : ` × ${order.containerType}'`}`
                }
              />
            )}
            {!shows('dimLM', order.dimLM) ? null : (
              <DetailField
                label={t('orders.detail.dimensions')}
                value={hasDimensions ? dimensions.map((value) => value ?? '—').join(' × ') : '—'}
              />
            )}
            <DetailField label={t('orders.fields.goodsName')} value={order.goodsName ?? '—'} />
          </Stack>
        </>
      )}

      <ServiceValues fields={schema?.fields ?? []} values={order.serviceData} />

      {order.note === null ? null : (
        <>
          <Divider />
          <DetailField label={t('orders.fields.note')} value={order.note} />
        </>
      )}

      {hasOutcomeNote ? (
        <>
          <Divider />
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={3}>
            {order.rejectReason === null ? null : (
              <DetailField label={t('orders.detail.rejectReason')} value={order.rejectReason} />
            )}
            {order.closeNote === null ? null : (
              <DetailField label={t('orders.detail.closeNote')} value={order.closeNote} />
            )}
            {order.rejectNote === null ? null : (
              <DetailField label={t('orders.detail.rejectNote')} value={order.rejectNote} />
            )}
            {order.cancelReason === null ? null : (
              <DetailField label={t('orders.detail.cancelNote')} value={order.cancelReason} />
            )}
          </Stack>
        </>
      ) : null}
    </Stack>
  );
}
