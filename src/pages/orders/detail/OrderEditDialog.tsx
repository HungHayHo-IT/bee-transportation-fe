import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ORDER_SOURCES, ORDER_SOURCE_LABEL_KEY, toOrderSource } from '@/constants/provinces';
import { ALL_CARGO_FIELDS } from '@/constants/cargoFields';
import { soHoacBoQua, toOptionalText } from '@/utils/formValues';
import type { OrderDetail, UpdateOrderPayload } from '@/types/order';
import type { OThieuTms } from '@/services/orderService';
import { OrderCargoFields } from '../OrderCargoFields';
import { OrderRouteFields } from '../OrderRouteFields';
import { ServiceDataFields } from '../ServiceDataFields';
import { toCargoPayload } from '../orderCargoValues';
import {
  missingRequiredFields, readServiceData, toServiceDataPayload,
} from '../serviceDataValues';
import type { ServiceDataDraft } from '../serviceDataValues';
import { useServiceSchema } from '../useServiceSchema';
import { useServiceChildren } from '../useServiceChildren';
import type { OrderRouteValues } from '../orderRouteValues';
import type { CargoFigures } from '../OrderCargoFields';
import { brandColors } from '@/theme/palette';

export interface OrderEditDialogProps {
  order: OrderDetail | null;
  isClosed: boolean;
  isSubmitting: boolean;
  onSubmit: (payload: UpdateOrderPayload) => void;
  onClose: () => void;
  /**
   * Ô còn thiếu để chuyển sang OF1-TMS. Có thì hộp này tô đỏ đúng những ô ấy
   * và hiện thêm hai ô chọn địa điểm.
   */
  thieuTms?: OThieuTms[];
}

/**
 * Ô TMS thiếu -> ô trên form. Hai mã địa điểm và hai địa chỉ là hai việc khác
 * nhau: địa chỉ là chữ tự do gửi cho OF1 đọc, còn mã địa điểm là id trong
 * master data của OF1 — chọn địa điểm trong danh mục mới có.
 */
const O_TREN_FORM: Record<string, string> = {
  mode: 'serviceChildId',
  pickupAddress: 'originAddress',
  deliveryAddress: 'destinationAddress',
  senderLocationId: 'originLocationId',
  receiverLocationId: 'destinationLocationId',
};

function readRoute(order: OrderDetail): OrderRouteValues {
  return {
    originProvince: order.originProvince ?? '',
    originAddress: order.originAddress ?? '',
    destinationProvince: order.destinationProvince ?? '',
    destinationAddress: order.destinationAddress ?? '',
    originLocationId: order.originLocationId === null ? '' : String(order.originLocationId),
    destinationLocationId:
      order.destinationLocationId === null ? '' : String(order.destinationLocationId),
    desiredDate: order.desiredDate === null ? '' : order.desiredDate.slice(0, 10),
  };
}

function readCargo(order: OrderDetail): CargoFigures {
  return {
    weightKg: order.weightKg,
    volumeCbm: order.volumeCbm,
    packageCount: order.packageCount,
    quantityUnit: order.quantityUnit ?? '',
    containerType: order.containerType ?? '',
    dimLM: order.dimLM,
    dimWM: order.dimWM,
    dimHM: order.dimHM,
  };
}

/**
 * Service and customer are deliberately not editable here: changing the service
 * would invalidate the generated order code, the milestone set the order was closed
 * with, and the whole set of per-service fields already filled in. Those corrections
 * belong to a new order.
 *
 * DỊCH VỤ CON thì sửa được, và khác hẳn: nó không đổi bộ mốc tiến độ, không đổi
 * ô thông tin nào. Nó mang mã TMS, nên thiếu nó là đơn không chuyển sang OF1
 * được — và đó đúng là ô người dùng mở hộp này để sửa.
 *
 * Mã đơn KHÔNG sinh lại: mã chốt một lần lúc tạo và đã in trên hợp đồng. Đổi
 * dịch vụ con sau đó thì tiền tố mã giữ nguyên tiền tố cũ.
 */
export function OrderEditDialog({
  order,
  isClosed,
  isSubmitting,
  onSubmit,
  onClose,
  thieuTms,
}: OrderEditDialogProps): ReactNode {
  const { t } = useTranslation();
  const oLoi = new Set(
    (thieuTms ?? []).map((o) => O_TREN_FORM[o.truong]).filter((x): x is string => x !== undefined),
  );
  /* Hai ô địa điểm giờ nằm trong chính khối "Tuyến vận chuyển" và hiện ở MỌI
     đơn, không riêng luồng TMS — chúng là đầu vào của giá gợi ý. Xem
     OrderRouteFields. */
  /* Khach hang KHONG sua duoc o hop nay: ma khach va ten khach thuoc HO SO
     KHACH, moi don cua khach ay dung chung. Noi thang ra thay vi de nguoi
     dung do tim mot o khong co tren form.

     `customerCode` phai co trong danh sach nay. No ra doi khi payload OF1
     tach ma khach khoi ten khach (contract v1.3); quen them o day thi hop
     bao "thieu ma khach" ma khong o nao sang len, cung khong cau nao giai
     thich — dung cai da xay ra. */
  const O_HO_SO_KHACH = ['customer', 'customerCode'];
  const thieuKhach = (thieuTms ?? []).some((o) => O_HO_SO_KHACH.includes(o.truong));

  const [serviceChildId, setServiceChildId] = useState('');
  const [route, setRoute] = useState<OrderRouteValues | null>(null);
  const [cargo, setCargo] = useState<CargoFigures | null>(null);
  const [serviceData, setServiceData] = useState<ServiceDataDraft>({});
  const [goodsName, setGoodsName] = useState('');
  const [note, setNote] = useState('');
  const [source, setSource] = useState('');
  const [changeNote, setChangeNote] = useState('');

  /* Theo ô ĐANG CHỌN trong hộp, không theo giá trị đã lưu của đơn: đổi dịch vụ
     con rồi thì form phải đổi hình dạng ngay, trước khi bấm Lưu. */
  const schemaState = useServiceSchema(
    order === null ? null : order.serviceId,
    serviceChildId === '' ? null : Number(serviceChildId),
  );
  const { children: serviceChildren } = useServiceChildren(
    order === null ? null : order.serviceId,
  );
  const { schema } = schemaState;
  const fields = schema?.fields ?? [];
  // Until the schema lands, show what the order actually holds rather than guessing
  // a narrower set and hiding a figure the user came here to change.
  const cargoKeys = schema?.cargoFields ?? ALL_CARGO_FIELDS;

  useEffect(() => {
    if (order === null) return;
    setServiceChildId(order.serviceChildId === null ? '' : String(order.serviceChildId));
    setRoute(readRoute(order));
    setCargo(readCargo(order));
    setGoodsName(order.goodsName ?? '');
    setNote(order.note ?? '');
    setSource(order.source ?? '');
    setChangeNote('');
  }, [order]);


  useEffect(() => {
    if (order === null || schema === null) return;
    setServiceData(readServiceData(schema.fields, order.serviceData));
  }, [order, schema]);

  if (order === null || route === null || cargo === null) return null;

  const missingRequired = missingRequiredFields(fields, serviceData);
  const isChangeNoteMissing = isClosed && changeNote.trim() === '';

  const handleSubmit = (): void => {
    onSubmit({
      // Bỏ qua khi để trống: PATCH vắng trường nghĩa là không đụng tới, nên đơn
      // cũ chưa chọn dịch vụ con vẫn sửa được thông tin khác.
      serviceChildId: soHoacBoQua(serviceChildId),
      originProvince: toOptionalText(route.originProvince),
      originAddress: toOptionalText(route.originAddress),
      destinationProvince: toOptionalText(route.destinationProvince),
      destinationAddress: toOptionalText(route.destinationAddress),
      originLocationId: soHoacBoQua(route.originLocationId),
      destinationLocationId: soHoacBoQua(route.destinationLocationId),
      desiredDate: toOptionalText(route.desiredDate),
      ...toCargoPayload(cargo, cargoKeys),
      // Only send the set once its schema is known — a `{}` sent early would wipe
      // every per-service value the order already carries.
      ...(schema === null ? {} : { serviceData: toServiceDataPayload(fields, serviceData) }),
      goodsName: toOptionalText(goodsName),
      note: toOptionalText(note),
      source: toOrderSource(source),
      changeNote: toOptionalText(changeNote),
    });
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{t('orders.edit.title', { code: order.code })}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {isClosed ? <Alert severity="warning">{t('orders.edit.closedHint')}</Alert> : null}
          {oLoi.size === 0 && !thieuKhach ? null : (
            <Alert severity="error">
              {t('orders.edit.tmsMissingHint')}
              {thieuKhach ? ` ${t('orders.edit.tmsCustomerHint')}` : ''}
            </Alert>
          )}
          {schemaState.isLoading ? <LinearProgress /> : null}
          {schemaState.errorMessage === null ? null : (
            <Alert severity="error">{schemaState.errorMessage}</Alert>
          )}

          {serviceChildren.length === 0 ? null : (
            <TextField
              select
              label={t('admin.services.children')}
              value={serviceChildId}
              onChange={(event) => setServiceChildId(event.target.value)}
              error={oLoi.has('serviceChildId')}
              helperText={oLoi.has('serviceChildId')
                ? t('orders.edit.tmsFieldHint') : t('orders.edit.serviceChildHint')}
              sx={{
                maxWidth: 420,
                ...(oLoi.has('serviceChildId') ? {
                  '& .MuiOutlinedInput-root': { bgcolor: brandColors.dangerWash },
                  '& .MuiInputLabel-root': { fontWeight: 700 },
                  '& .MuiFormHelperText-root': { fontWeight: 600 },
                } : {}),
              }}
            >
              {serviceChildren.map((con) => (
                <MenuItem key={con.id} value={String(con.id)}>
                  {con.name}
                  {con.tmsMode === null ? '' : ` · ${con.tmsMode}`}
                </MenuItem>
              ))}
            </TextField>
          )}

          <OrderRouteFields
            value={route}
            onChange={setRoute}
            hasDomesticOrigin={schema?.hasDomesticOrigin ?? true}
            hasDomesticDestination={schema?.hasDomesticDestination ?? true}
            oLoi={oLoi}
            ghiChuLoi={t('orders.edit.tmsFieldHint')}
          />

          {/* Hai ô này CHỈ hiện khi TMS đòi. Form đơn cố ý không có chúng: xem
              ghi chú trong OrderRouteFields — bắt mọi người chọn kho cho một
              con số giá gợi ý là đẩy việc của bảng giá sang cho họ. Với TMS
              thì khác, mã địa điểm là trường bắt buộc của OF1. */}
          <TextField
            select
            label={t('orders.fields.source')}
            value={source}
            onChange={(event) => setSource(event.target.value)}
            sx={{ maxWidth: 260 }}
          >
            {ORDER_SOURCES.map((value) => (
              <MenuItem key={value} value={value}>
                {t(ORDER_SOURCE_LABEL_KEY[value])}
              </MenuItem>
            ))}
          </TextField>

          {cargoKeys.length === 0 ? null : (
            <OrderCargoFields value={cargo} onChange={setCargo} visibleKeys={cargoKeys} />
          )}

          {fields.length === 0 ? null : (
            <>
              <Divider />
              <Typography variant="subtitle2">
                {t('orders.create.serviceFieldsSection', { service: order.serviceCode })}
              </Typography>
              <ServiceDataFields
                fields={fields}
                value={serviceData}
                onChange={setServiceData}
                isDisabled={isSubmitting}
              />
            </>
          )}

          <TextField
            label={t('orders.fields.goodsName')}
            value={goodsName}
            onChange={(event) => setGoodsName(event.target.value)}
            fullWidth
          />
          <TextField
            label={t('orders.fields.note')}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            helperText={t('orders.create.noteHint')}
            multiline
            minRows={2}
            fullWidth
          />

          {isClosed ? (
            <TextField
              label={t('orders.edit.changeNote')}
              value={changeNote}
              onChange={(event) => setChangeNote(event.target.value)}
              helperText={t('orders.edit.changeNoteHint')}
              multiline
              minRows={2}
              required
              fullWidth
            />
          ) : null}

          {missingRequired.length === 0 ? null : (
            <Alert severity="warning">
              {t('orders.create.missingRequired', { fields: missingRequired.join(', ') })}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="inherit" onClick={onClose} disabled={isSubmitting}>
          {t('common.actions.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitting || isChangeNoteMissing || missingRequired.length > 0}
        >
          {t('common.actions.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
