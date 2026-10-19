import type { ReactNode } from 'react';
import { Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';

const MAU: Record<string, 'success' | 'warning' | 'default'> = {
  active: 'success',
  draft: 'warning',
  archived: 'default',
};

const NHAN: Record<string, string> = {
  active: 'pricing.sessionActive',
  draft: 'pricing.sessionDraft',
  archived: 'pricing.sessionArchived',
};

/**
 * Trạng thái của một phiên giá.
 *
 * Để riêng vì hai màn cùng vẽ nó — ô chọn phiên và bảng quản lý phiên. Hai bản
 * sao thì sớm muộn một chỗ đổi màu hay thêm trạng thái mà chỗ kia không, và
 * cùng một phiên hiện hai kiểu ở hai nơi.
 */
export function PhienStatusChip({ status }: { status: string }): ReactNode {
  const { t } = useTranslation();
  return (
    <Chip
      size="small"
      variant="outlined"
      color={MAU[status] ?? 'default'}
      label={t(NHAN[status] ?? 'pricing.sessionArchived')}
    />
  );
}
