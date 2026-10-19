import type { ReactNode } from 'react';
import {
  LinearProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/EmptyState';
import { SectionCard } from '@/components/SectionCard';
import type { ResponseTimeRow } from '@/types/dashboard';

export interface ResponseTimeCardProps {
  rows: ResponseTimeRow[];
  isRefetching: boolean;
  onDepartmentSelected: (row: ResponseTimeRow) => void;
}

function formatHours(value: number | null, suffix: string): string {
  if (value === null) return '—';
  return `${value.toFixed(1).replace('.', ',')} ${suffix}`;
}

export function ResponseTimeCard({
  rows,
  isRefetching,
  onDepartmentSelected,
}: ResponseTimeCardProps): ReactNode {
  const { t } = useTranslation();

  return (
    <SectionCard
      title={t('dashboard.responseTime.title')}
      subtitle={t('dashboard.responseTime.subtitle')}
    >
      {isRefetching ? <LinearProgress /> : null}
      {rows.length === 0 && !isRefetching ? (
        <EmptyState title={t('dashboard.responseTime.empty')} />
      ) : (
        <TableContainer sx={{ overflowX: 'auto' }}>
          {/* Bảng báo cáo rộng hơn màn hình điện thoại. Thiếu khung cuộn này thì
              Paper của thẻ cắt mất cột cuối và không cách nào xem tới. */}
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('admin.routing.department')}</TableCell>
                <TableCell align="right">{t('dashboard.responseTime.toClaim')}</TableCell>
                <TableCell align="right">{t('dashboard.responseTime.toFirstQuote')}</TableCell>
                <TableCell align="right">{t('dashboard.responseTime.lateCount')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.departmentId}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => onDepartmentSelected(row)}
                >
                  <TableCell>{row.departmentName}</TableCell>
                  <TableCell align="right">
                    {formatHours(row.hoursToClaim, t('dashboard.responseTime.hours'))}
                  </TableCell>
                  <TableCell align="right">
                    {formatHours(row.hoursToFirstQuote, t('dashboard.responseTime.hours'))}
                  </TableCell>
                  <TableCell align="right">{row.lateCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </SectionCard>
  );
}
