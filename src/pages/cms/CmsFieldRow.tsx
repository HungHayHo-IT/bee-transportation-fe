import type { ReactNode } from 'react';
import { Box, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { CmsFieldLabel } from './cmsUi';
import { compactInputSx, selectedSx } from './cmsStyles';

export interface CmsFieldRowProps {
  keyPath: string;
  label: string;
  /** Tên khối đứng trước nhãn — chỉ ở kết quả tìm kiếm. */
  prefix?: string;
  /** Giá trị mặc định đang nằm trong code của landing. */
  fallback: string;
  /** Giá trị đang hiện (đã gồm bản nháp). Bằng fallback nghĩa là chưa ghi đè. */
  value: string;
  /** Ô đang được chọn trên khung xem trước. */
  isSelected?: boolean;
  /**
   * Ô này trong từ điển là SỐ ('425 chuyến/ngày' thì 425 là ô số). Landing bỏ
   * qua giá trị không đọc ra số và giữ nguyên mặc định — nhập sai thì trang
   * KHÔNG đổi gì và cũng KHÔNG báo lỗi. Nên chặn ngay lúc gõ.
   */
  isNumber?: boolean;
  onChange: (value: string) => void;
  /** Không truyền = ô thuộc một danh sách, khôi phục theo cả danh sách. */
  onReset?: () => void;
  onFocus?: () => void;
}

/** Chỗ điền `{year}` và thẻ `<b>…</b>` — xoá mất là trang hiện sai. */
const markupTokensOf = (text: string): string[] =>
  [...text.matchAll(/\{\w+\}|<\/?\w+>/g)].map((m) => m[0]).sort();

const rowsFor = (text: string): number =>
  Math.min(10, Math.max(1, Math.ceil(text.length / 46) + (text.match(/\n/g)?.length ?? 0)));

/**
 * Một ô nội dung — chép theo `ValueEditor` bên btn-admin: nhãn nhỏ, chấm cam
 * khi khác bản gốc, nút về bản gốc chỉ hiện khi có gì để về.
 *
 * Ô nhập luôn hiện giá trị ĐANG DÙNG chứ không để trống với placeholder là bản
 * gốc: người sửa cần copy được chữ cũ ra để sửa một chữ trong câu.
 */
export function CmsFieldRow({
  keyPath, label, prefix, fallback, value, isSelected = false, isNumber = false,
  onChange, onReset, onFocus,
}: CmsFieldRowProps): ReactNode {
  const { t } = useTranslation();
  const can = markupTokensOf(fallback);
  const thieuToken = can.join() !== markupTokensOf(value).join();

  return (
    <Box data-field-key={keyPath} sx={[{ display: 'flex', flexDirection: 'column', gap: 0.5 }, selectedSx(isSelected)]}>
      <CmsFieldLabel
        label={label}
        prefix={prefix}
        title={keyPath}
        changed={value !== fallback}
        onReset={onReset}
      />
      <TextField
        value={value}
        onFocus={onFocus}
        onChange={(e) =>
          onChange(isNumber ? e.target.value.replace(/[^0-9.-]/g, '') : e.target.value)
        }
        fullWidth
        size="small"
        multiline={!isNumber}
        minRows={isNumber ? undefined : rowsFor(value)}
        inputMode={isNumber ? 'numeric' : undefined}
        helperText={isNumber ? t('cms.numberOnly') : undefined}
        sx={compactInputSx}
        slotProps={{ htmlInput: { spellCheck: false } }}
      />
      {thieuToken ? (
        <Typography variant="caption" color="error">
          {t('cms.markupWarning', { tokens: can.join(' ') })}
        </Typography>
      ) : null}
    </Box>
  );
}
