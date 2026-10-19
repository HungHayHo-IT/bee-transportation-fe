import type { ReactNode } from 'react';
import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { formatCurrencyVnd } from '@/utils/formatters';
import type { GiaNiemYetTuyen } from '@/services/pricingService';

export interface BangGiaNiemYetProps {
  gia: GiaNiemYetTuyen | null;
  /** Bấm một dòng để điền số đó vào ô tiền. */
  onChon?: (price: number) => void;
}

/**
 * Giá niêm yết của tuyến — MỘT DÒNG MỖI ĐƠN VỊ TÍNH.
 *
 * Không gộp thành một con số, và không điền sẵn vào ô tiền. Một tuyến
 * container có tám mức giá khác nhau theo loại cont và bậc tải; chọn hộ một
 * mức là giấu đi bảy mức còn lại, mà người báo giá mới là người biết lô hàng
 * này đi loại xe nào.
 *
 * Bảng giá không có tuyến này thì KHÔNG hiện gì cả. Một dòng "không có giá
 * niêm yết" là chữ mà người đọc chẳng làm gì được, và nó chiếm chỗ ngay trên
 * ô họ đang cần gõ.
 */
export function BangGiaNiemYet({ gia, onChon }: BangGiaNiemYetProps): ReactNode {
  const { t } = useTranslation();
  if (gia === null || gia.units.length === 0) return null;

  return (
    <Alert severity="info" icon={false} sx={{ py: 1 }}>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
        {t(onChon === undefined ? 'quotes.form.listedTitleRead' : 'quotes.form.listedTitle', {
          session: gia.sessionName ?? '',
        })}
      </Typography>
      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75}>
        {gia.units.map((u) => (
          <Chip
            key={u.unitCode}
            size="small"
            variant="outlined"
            onClick={onChon === undefined ? undefined : () => onChon(u.price)}
            label={
              <Box component="span" sx={{ fontSize: 12 }}>
                {/* FCL/LCL hiện kèm: cùng một tuyến có cả hai, và người báo giá
                    cần biết con số đang nhìn thuộc nhóm nào. */}
                <Box component="span" sx={{ color: 'text.secondary' }}>
                  {u.unitKind}
                </Box>
                {` · ${u.unitLabel} · `}
                <Box component="span" sx={{ fontWeight: 600 }}>
                  {formatCurrencyVnd(u.price)}
                </Box>
              </Box>
            }
          />
        ))}
      </Stack>
    </Alert>
  );
}
