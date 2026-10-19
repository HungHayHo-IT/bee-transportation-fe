import type { ReactNode } from 'react';
import { Box, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { DateField } from '@/components/form/DateField';
import type { DashboardFilters } from '@/types/dashboard';

export interface DashboardFiltersBarProps {
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
  children?: ReactNode;
}

/** Revenue is measured by `closedAt`, so the date range is labelled accordingly. */
export function DashboardFiltersBar({
  filters,
  onChange,
  children,
}: DashboardFiltersBarProps): ReactNode {
  const { t } = useTranslation();

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
      <Box sx={{ minWidth: 190 }}>
        <DateField
          label={t('dashboard.filters.fromDate')}
          value={filters.fromDate ?? ''}
          maxDate={filters.toDate}
          onChange={(fromDate) =>
            onChange({ ...filters, fromDate: fromDate === '' ? undefined : fromDate })
          }
        />
      </Box>
      <Box sx={{ minWidth: 190 }}>
        <DateField
          label={t('dashboard.filters.toDate')}
          value={filters.toDate ?? ''}
          minDate={filters.fromDate}
          onChange={(toDate) => onChange({ ...filters, toDate: toDate === '' ? undefined : toDate })}
        />
      </Box>
      {children}
    </Stack>
  );
}
