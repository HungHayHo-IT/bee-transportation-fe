import type { ReactNode } from 'react';
import { Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ORDER_STATUS_LABEL_KEY } from '@/constants/orderStatus';
import type { OrderStatus } from '@/constants/orderStatus';
import { ORDER_STATUS_TONE } from '@/constants/orderStatusTone';

export interface StatusChipProps {
  status: OrderStatus;
  size?: 'small' | 'medium';
}

/**
 * A status column is read by scanning, not by reading, so each state carries a
 * soft tinted block rather than an outline.
 */
export function StatusChip({ status, size = 'small' }: StatusChipProps): ReactNode {
  const { t } = useTranslation();
  const tone = ORDER_STATUS_TONE[status];

  return (
    <Chip
      size={size}
      label={t(ORDER_STATUS_LABEL_KEY[status])}
      sx={{
        color: tone.color,
        backgroundColor: tone.background,
        border: 'none',
        fontWeight: 600,
      }}
    />
  );
}
