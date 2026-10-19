import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Autocomplete, Box, Button, Stack, TextField, createFilterOptions } from '@mui/material';
import { IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { createLocation, fetchLocations } from '@/services/pricingService';
import { describeError } from '@/services/apiClient';
import { foldDiacritics } from '@/utils/foldDiacritics';
import type { Location } from '@/types/pricing';

export interface LocationPickerProps {
  label: string;
  /** Id địa điểm dạng chuỗi, '' = chưa chọn. Giống mọi ô select khác của form. */
  value: string;
  onChange: (value: string) => void;
  /**
   * Tỉnh để lọc danh sách — do MÀN CHA sở hữu, ô này không tự dựng ô tỉnh
   * riêng. '' thì liệt kê cả danh mục.
   */
  province?: string;
  isDisabled?: boolean;
  error?: boolean;
  helperText?: string;
  /** Cho thêm địa chỉ mới ngay tại chỗ. Tắt khi người dùng không có quyền. */
  canCreate?: boolean;
}

const locFilter = createFilterOptions<Location>({
  stringify: (l) => foldDiacritics(`${l.name} ${l.address ?? ''}`),
});

/**
 * Chọn một địa điểm trong danh mục, LỌC THEO TỈNH MÀ MÀN CHA ĐANG KHAI.
 *
 * Ô này KHÔNG tự dựng ô tỉnh của riêng nó. Nó từng làm vậy, và khi đặt vào
 * form đơn — nơi đã có sẵn "Tỉnh/thành điểm đi" — màn hình mọc ra hai ô tỉnh
 * cho cùng một đầu tuyến, bốn ô cho cả đơn. Tệ hơn: hai ô đó là hai state rời
 * nhau, `defaultProvince` chỉ là giá trị khởi tạo nên đổi tỉnh của đơn về sau
 * không kéo theo ô kia, và người dùng để lại được một đơn ghi điểm đi TP.HCM
 * kèm một kho ở Đà Nẵng mà không có gì báo.
 *
 * Vì sao vẫn lọc theo tỉnh: danh mục địa điểm là hàng trăm KCN, cảng, kho và
 * cửa khẩu trên cả nước, và tên chúng giống nhau đến mức vô dụng khi để chung
 * một danh sách — có "KCN Hòa Khánh" ở Đà Nẵng và "KCN Hòa Khánh Mở rộng"
 * ngay cạnh.
 *
 * Tỉnh trống thì liệt kê CẢ danh mục chứ không khoá ô lại: đầu tuyến ngoài
 * nước không có tỉnh/thành nào để khai, mà khoá ô thì nó thành ô chết kèm câu
 * "chọn tỉnh/thành trước" chỉ sang một ô không tồn tại trên form.
 *
 * Hỏi backend theo từng tỉnh (`?province=`) chứ không tải cả danh mục rồi lọc
 * trong trình duyệt: danh mục này sẽ dài ra theo thời gian, và tải hết về chỉ
 * để hiện hai mươi dòng là trả giá cho mọi lần mở form.
 *
 * "Hoặc điền địa chỉ mới" là một phần của yêu cầu, không phải tính năng thêm:
 * Sale nhận đơn cho một KCN chưa có trong danh mục mà không tự thêm được thì
 * tắc hoàn toàn, trong khi đơn đang cần nhập ngay.
 */
export function LocationPicker({
  label,
  value,
  onChange,
  province = '',
  isDisabled,
  error,
  helperText,
  canCreate = false,
}: LocationPickerProps): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();

  const [items, setItems] = useState<Location[]>([]);
  /**
   * Tải danh mục hỏng thì nói VÌ SAO, đừng hiện "không có địa chỉ nào khớp".
   *
   * Hai chuyện khác hẳn nhau: tỉnh đó thật sự chưa có kho nào, và người dùng
   * không được phép đọc danh mục. Gộp làm một câu thì người ta đi tìm kho
   * trong khi thứ phải sửa là quyền — đã mất nửa buổi vì đúng chuyện này.
   */
  const [loiTai, setLoiTai] = useState<string | null>(null);
  const [dangTao, setDangTao] = useState(false);
  const [tenMoi, setTenMoi] = useState('');
  const [dangGui, setDangGui] = useState(false);

  /* Tỉnh trống thì hỏi cả danh mục — xem ghi chú đầu tệp. */
  useEffect(() => {
    void fetchLocations(province === '' ? {} : { province })
      .then((p) => { setItems(p.items); setLoiTai(null); })
      .catch((e) => { setItems([]); setLoiTai(describeError(e)); });
  }, [province]);

  const dangChon = useMemo(
    () => items.find((l) => String(l.id) === value) ?? null,
    [items, value],
  );

  const them = async (): Promise<void> => {
    const ten = tenMoi.trim();
    if (ten === '' || province === '') return;
    setDangGui(true);
    try {
      const l = await createLocation({ name: ten, province });
      setItems((cu) => [...cu, l].sort((a, b) => a.name.localeCompare(b.name, 'vi')));
      onChange(String(l.id));
      setTenMoi('');
      setDangTao(false);
    } catch (e) {
      // 409 = đã có rồi. Câu của backend nêu đúng TÊN ĐANG CÓ, nên in nguyên
      // văn còn hơn một câu chung chung bắt họ tự đi tìm.
      enqueueSnackbar(describeError(e), { variant: 'error' });
    } finally {
      setDangGui(false);
    }
  };

  return (
    <Stack spacing={1.5}>
      <Autocomplete
        options={items}
        value={dangChon}
        onChange={(_, l) => onChange(l === null ? '' : String(l.id))}
        getOptionLabel={(l) => l.name}
        filterOptions={locFilter}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        disabled={isDisabled}
        noOptionsText={loiTai ?? t('pricing.picker.empty')}
        renderOption={(props, l) => (
          <Box component="li" {...props} key={l.id}>
            <Box>
              <Box sx={{ fontSize: 14 }}>{l.name}</Box>
              {l.address === null ? null : (
                <Box sx={{ fontSize: 12, color: 'text.secondary' }}>{l.address}</Box>
              )}
            </Box>
          </Box>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            error={error}
            helperText={helperText}
          />
        )}
      />

      {/* Thêm mới cần tỉnh THẬT: địa điểm lưu kèm tỉnh, tạo khi tỉnh trống là
          đẻ ra một dòng không ai lọc ra được nữa. */}
      {!canCreate || province === '' || isDisabled ? null : dangTao ? (
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            fullWidth
            autoFocus
            label={t('pricing.picker.newName')}
            value={tenMoi}
            onChange={(e) => setTenMoi(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void them(); }}
          />
          <Button onClick={() => void them()} disabled={dangGui || tenMoi.trim() === ''}>
            {t('common.actions.save')}
          </Button>
          <Button color="inherit" onClick={() => setDangTao(false)}>
            {t('common.actions.cancel')}
          </Button>
        </Stack>
      ) : (
        <Button
          size="small"
          startIcon={<IconPlus size={16} />}
          onClick={() => setDangTao(true)}
          sx={{ alignSelf: 'flex-start' }}
        >
          {t('pricing.picker.add')}
        </Button>
      )}
    </Stack>
  );
}
