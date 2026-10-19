import { useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { CurrencyAmountField } from '@/components/CurrencyAmountField';
import { describeError } from '@/services/apiClient';
import { setSalePrice } from '@/services/quoteService';
import { formatCurrencyVnd } from '@/utils/formatters';

export interface SalePriceCardProps {
  orderId: number;
  /** Giá của phòng thắng — giá vốn, mức sàn của giá chốt. */
  giaPhongBan: number;
  salePrice: number | null;
  /** Đơn landing bắt buộc nhập; đơn khác để trống thì dùng giá phòng ban. */
  isLanding: boolean;
  canEdit: boolean;
  onChanged: () => void;
}

/**
 * Mọi đơn, sau khi chọn phòng thắng: Sale nhập giá đã thoả thuận riêng với
 * khách. Đơn landing bắt buộc (khách không được thấy giá phòng ban); đơn khác
 * để trống thì hợp đồng và doanh thu dùng giá phòng ban. Backend chặn giá
 * thấp hơn giá phòng ban; chặn sẵn ở đây để Sale không phải đợi một lượt gọi API.
 */
export function SalePriceCard({
  orderId,
  giaPhongBan,
  salePrice,
  isLanding,
  canEdit,
  onChanged,
}: SalePriceCardProps): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const [value, setValue] = useState<number | null>(salePrice);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isTooLow = value !== null && value < giaPhongBan;
  const chenhLech = value === null ? null : value - giaPhongBan;

  const handleSave = async (): Promise<void> => {
    if (value === null || isTooLow) return;
    setIsSubmitting(true);
    try {
      await setSalePrice(orderId, value);
      enqueueSnackbar(t('quotes.salePrice.done'), { variant: 'success' });
      onChanged();
    } catch (error) {
      enqueueSnackbar(describeError(error), { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ border: 1, borderColor: 'primary.main', borderRadius: 2, p: 2 }}>
      <Stack spacing={1.5}>
        <Typography variant="subtitle1" fontWeight={600}>
          {t('quotes.salePrice.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('quotes.salePrice.giaPhongBan', { amount: formatCurrencyVnd(giaPhongBan) })}
        </Typography>

        {canEdit ? (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-start' }}>
            <Box sx={{ flex: 1, maxWidth: 360 }}>
              <CurrencyAmountField
                label={t('quotes.salePrice.label')}
                value={value}
                onChange={setValue}
                hasError={isTooLow}
                helperText={
                  isTooLow
                    ? t('quotes.salePrice.tooLow')
                    : chenhLech !== null
                      ? t('quotes.salePrice.chenhLech', { amount: formatCurrencyVnd(chenhLech) })
                      : undefined
                }
                isRequired={isLanding}
              />
            </Box>
            <Button
              variant="contained"
              onClick={() => void handleSave()}
              disabled={value === null || isTooLow || value === salePrice || isSubmitting}
              sx={{ mt: { sm: 1 } }}
            >
              {t('quotes.salePrice.save')}
            </Button>
          </Stack>
        ) : (
          <Typography variant="h6">
            {salePrice !== null
              ? formatCurrencyVnd(salePrice)
              : isLanding
                ? t('quotes.salePrice.empty')
                : t('quotes.salePrice.dungGiaPhongBan', { amount: formatCurrencyVnd(giaPhongBan) })}
          </Typography>
        )}

        {salePrice === null ? (
          <Alert severity="info">
            {t(isLanding ? 'quotes.salePrice.hint' : 'quotes.salePrice.hintOther')}
          </Alert>
        ) : null}
      </Stack>
    </Box>
  );
}
