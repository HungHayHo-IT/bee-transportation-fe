import type { ReactNode } from 'react';
import { Box, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { DateField } from '@/components/form/DateField';
import { FIELD_FULL_ROW, FIELD_GRID } from '@/components/form/fieldGrid';
import { LocationPicker } from '@/components/form/LocationPicker';
import { ProvinceField } from '@/components/form/ProvinceField';
import { usePageLevels } from '@/hooks/usePageLevels';
import type { OrderRouteValues } from './orderRouteValues';
import { brandColors } from '@/theme/palette';

export interface OrderRouteFieldsProps {
  value: OrderRouteValues;
  onChange: (value: OrderRouteValues) => void;
  isProvinceRequired?: boolean;
  /**
   * false bỏ ĐÚNG MỘT THỨ của đầu đó: ô tỉnh/thành. Ô địa chỉ luôn còn.
   *
   * Danh mục tỉnh/thành là danh mục Việt Nam nên với đầu nằm ngoài nước nó
   * không có gì để chọn. Nhưng cảng Busan hay địa chỉ người nhận ở Lào thì vẫn
   * phải ghi được ở đâu đó — ẩn cả khối là đơn xuất khẩu không còn chỗ nào ghi
   * điểm đến, mà `deliveryAddress` lại là ô BẮT BUỘC để đẩy sang OF1-TMS. Khi
   * đó mọi đơn xuất khẩu kẹt lại, kèm một popup chỉ sang "Sửa đơn → Điểm đến"
   * là chỗ không tồn tại trên form.
   *
   * Backend đọc cùng hai cờ này và cũng chỉ thôi đòi TỈNH/THÀNH — thiếu vế đó
   * thì đơn nằm mãi ở "Cần bổ sung thông tin" chờ một ô không ai nhìn thấy.
   *
   * HAI cờ chứ không một: hàng NHẬP khẩu lấy hàng ở nước ngoài nên đầu không
   * có tỉnh/thành là đầu ĐI, ngược với hàng xuất.
   */
  hasDomesticOrigin?: boolean;
  hasDomesticDestination?: boolean;
  /**
   * Tên những ô phải tô đỏ, kèm câu ghi chú dùng chung. Dùng khi người dùng
   * vào đây từ popup "đơn chưa đủ thông tin để chuyển sang TMS": không chỉ
   * đúng ô thì họ phải tự dò giữa mười mấy ô.
   */
  oLoi?: ReadonlySet<string>;
  ghiChuLoi?: string;
}

/**
 * Provinces come from the backend catalogue, never a free text field: an unlisted
 * name is rejected on write.
 *
 * ĐỊA ĐIỂM (kho, cảng, KCN) nằm NGAY ĐÂY, không còn chỉ hiện trong luồng TMS.
 *
 * Trước đây form đơn cố ý không có hai ô này, với lý do "bắt mọi người chọn kho
 * cho một con số giá gợi ý là đẩy việc của bảng giá sang cho họ". Lý do đó hết
 * hiệu lực: bảng giá khoá theo CẶP ĐỊA ĐIỂM, nên không chọn địa điểm thì không
 * có giá gợi ý nào hiện ra cả — và đó chính là thứ người báo giá cần. Hai ô này
 * là đầu vào của giá, không phải thủ tục thừa.
 *
 * Vẫn KHÔNG bắt buộc: đơn giao tận nơi không đi giữa hai kho nào cả.
 */
export function OrderRouteFields({
  value,
  onChange,
  isProvinceRequired = false,
  hasDomesticOrigin = true,
  hasDomesticDestination = true,
  oLoi,
  ghiChuLoi,
}: OrderRouteFieldsProps): ReactNode {
  const { t } = useTranslation();
  /* Thêm địa chỉ mới cần bậc `edit` trở lên trên trang Địa điểm (056). Đọc mức
     thật từ ma trận chứ không đoán theo vai trò: nút hiện ra rồi bấm vào ăn
     403 là kiểu hỏng khó chịu nhất. */
  const levels = usePageLevels();
  const themDiaChiDuoc = levels?.priceLocations === 'edit' || levels?.priceLocations === 'full';
  /* Ô cần sửa: viền đỏ thôi chưa đủ. Hộp sửa đơn có hơn hai chục ô, và một
     viền mảnh giữa chúng thì mắt lướt qua — người dùng mở hộp ra rồi đóng lại
     mà không biết phải sửa gì. Thêm nền đỏ nhạt và nhãn đậm: khối màu bắt mắt
     từ xa, nhãn đậm nói đúng ô nào. */
  const loi = (ten: string): Record<string, unknown> =>
    (oLoi?.has(ten) ?? false)
      ? {
        error: true,
        helperText: ghiChuLoi,
        sx: {
          '& .MuiOutlinedInput-root': { bgcolor: brandColors.dangerWash },
          '& .MuiInputLabel-root': { fontWeight: 700 },
          '& .MuiFormHelperText-root': { fontWeight: 600 },
        },
      }
      : { error: false };

  /* Không còn ô "Kho đi / Kho đến" ở đây. Hai ô đó từng có để TRA giá niêm
     yết, nhưng giá niêm yết chỉ là GỢI Ý — bắt người nhập đơn chọn kho cho một
     con số gợi ý là đẩy việc của bảng giá sang cho họ. Màn báo giá tự tra theo
     TỈNH/THÀNH của đơn; xem lookup-tinh.helper.ts bên backend. */

  return (
    /* MỘT CỘT CHO MỖI ĐẦU TUYẾN: đi bên trái, đến bên phải.
       Trước đây sáu ô thả thẳng vào lưới hai cột và chảy theo hàng, nên cột
       trái thành "tỉnh đi / kho đi / kho đến" còn cột phải thành "địa chỉ đi /
       địa chỉ đến / thời gian" — đọc ngang một hàng là hai đầu tuyến khác
       nhau. Ẩn ô tỉnh của một đầu (đơn xuất/nhập) thì mọi thứ phía dưới lại
       xê dịch thêm một bậc.

       Thời gian mong muốn xuống hàng riêng: nó không thuộc đầu nào cả. */
    <Box sx={FIELD_GRID}>
      <Stack spacing={2}>
        <Typography variant="subtitle2" color="text.secondary">
          {t('orders.fields.originSide')}
        </Typography>
        {!hasDomesticOrigin ? null : (
          <ProvinceField
            label={t('orders.fields.originProvince')}
            value={value.originProvince}
            /* Đổi tỉnh thì BỎ CHỌN địa điểm của đầu này: giữ lại là đơn ghi
               điểm đi một tỉnh kèm một kho ở tỉnh khác, không gì báo. */
            onChange={(province) =>
              onChange({ ...value, originProvince: province, originLocationId: '' })
            }
            isRequired={isProvinceRequired}
          />
        )}
        <LocationPicker
          label={t('orders.edit.locationOrigin')}
          value={value.originLocationId}
          onChange={(v) => onChange({ ...value, originLocationId: v })}
          province={value.originProvince}
          canCreate={themDiaChiDuoc}
          {...loi('originLocationId')}
        />
        <TextField
          label={t('orders.fields.originAddress')}
          value={value.originAddress}
          onChange={(event) => onChange({ ...value, originAddress: event.target.value })}
          fullWidth
          {...loi('originAddress')}
        />
      </Stack>

      <Stack spacing={2}>
        <Typography variant="subtitle2" color="text.secondary">
          {t('orders.fields.destinationSide')}
        </Typography>
        {!hasDomesticDestination ? null : (
          <ProvinceField
            label={t('orders.fields.destinationProvince')}
            value={value.destinationProvince}
            onChange={(province) =>
              onChange({ ...value, destinationProvince: province, destinationLocationId: '' })
            }
            isRequired={isProvinceRequired}
          />
        )}
        <LocationPicker
          label={t('orders.edit.locationDestination')}
          value={value.destinationLocationId}
          onChange={(v) => onChange({ ...value, destinationLocationId: v })}
          province={value.destinationProvince}
          canCreate={themDiaChiDuoc}
          {...loi('destinationLocationId')}
        />
        <TextField
          label={t('orders.fields.destinationAddress')}
          value={value.destinationAddress}
          onChange={(event) => onChange({ ...value, destinationAddress: event.target.value })}
          fullWidth
          {...loi('destinationAddress')}
        />
      </Stack>

      <Box sx={FIELD_FULL_ROW}>
        <DateField
          label={t('orders.fields.desiredDate')}
          value={value.desiredDate}
          onChange={(desiredDate) => onChange({ ...value, desiredDate })}
        />
      </Box>
    </Box>
  );
}
