import type { ReactNode } from 'react';
import { Autocomplete, TextField, createFilterOptions } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useProvinces } from '@/hooks/useProvinces';
import { foldDiacritics } from '@/utils/foldDiacritics';

export interface ProvinceFieldProps {
  label: string;
  /** The province name, or '' for none. */
  value: string;
  onChange: (value: string) => void;
  isRequired?: boolean;
  isDisabled?: boolean;
  /**
   * Cho gõ một cái tên NGOÀI danh mục.
   *
   * Mặc định TẮT, và đó là mặc định đúng cho đơn hàng: backend từ chối tên
   * ngoài danh mục, nên nhận chữ tự do ở đó chỉ dẫn tới một lỗi lúc lưu.
   *
   * Bật cho những chỗ mà `province` chỉ là chữ mô tả — danh mục địa điểm
   * chẳng hạn: một cái kho có thể nằm ở nơi người ta gọi bằng tên khác với
   * tên hành chính, và chặn họ gõ là bắt họ ghi sai còn hơn không ghi.
   */
  allowFreeText?: boolean;
}

const filterProvinces = createFilterOptions<string>({ stringify: foldDiacritics });

/**
 * The one province picker for forms and filters alike: a searchable list over
 * the backend catalogue instead of a 34-row menu to scroll through.
 *
 * Mặc định KHÔNG nhận chữ tự do — backend từ chối tên ngoài danh mục, và giá
 * tham chiếu khớp theo tỉnh. Chỗ nào `province` chỉ là chữ mô tả thì bật
 * `allowFreeText`.
 */
export function ProvinceField({
  label,
  value,
  onChange,
  isRequired = false,
  isDisabled = false,
  allowFreeText = false,
}: ProvinceFieldProps): ReactNode {
  const { t } = useTranslation();
  const provinces = useProvinces();

  return (
    <Autocomplete
      options={provinces}
      freeSolo={allowFreeText}
      value={value === '' ? null : value}
      onChange={(_event, selected) => onChange(selected ?? '')}
      // Chữ đang gõ cũng phải đi lên: với freeSolo, người dùng gõ xong rồi rời
      // ô mà không chọn dòng nào là chuyện thường, và onChange không bắn.
      onInputChange={
        allowFreeText ? (_event, moi, ly_do) => {
          if (ly_do !== 'reset') onChange(moi);
        } : undefined
      }
      filterOptions={(options, state) =>
        filterProvinces(options, { ...state, inputValue: foldDiacritics(state.inputValue) })
      }
      disabled={isDisabled}
      noOptionsText={t('common.noOptions')}
      renderInput={(params) => (
        <TextField {...params} label={label} required={isRequired} fullWidth />
      )}
      fullWidth
    />
  );
}
