import type { ReactNode } from 'react';
import {
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { IconUsersGroup } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/EmptyState';
import { SectionCard } from '@/components/SectionCard';
import type { CompetitionRow } from '@/types/dashboard';
import { StatTile } from './StatTile';

export interface CompetitionCardProps {
  rows: CompetitionRow[];
  averageDepartments: number | null;
  onDepartmentSelected: (row: CompetitionRow) => void;
}

function formatPercent(value: number | null): string {
  if (value === null) return '—';
  return `${value.toFixed(1).replace('.', ',')}%`;
}

export function CompetitionCard({
  rows,
  averageDepartments,
  onDepartmentSelected,
}: CompetitionCardProps): ReactNode {
  const { t } = useTranslation();

  return (
    <SectionCard
      title={t('dashboard.competition.title')}
      subtitle={t('dashboard.competition.subtitle')}
    >
      <Stack spacing={2}>
        <StatTile
          label={t('dashboard.competition.avgDepartments')}
          value={averageDepartments === null ? '—' : averageDepartments.toFixed(2).replace('.', ',')}
          hint={t('dashboard.competition.avgDepartmentsHint')}
          icon={<IconUsersGroup size={20} stroke={1.7} />}
        />
        {rows.length === 0 ? (
          <EmptyState title={t('dashboard.competition.empty')} />
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            {/* Bảng báo cáo rộng hơn màn hình điện thoại. Thiếu khung cuộn này thì
                Paper của thẻ cắt mất cột cuối và không cách nào xem tới. */}
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('admin.routing.department')}</TableCell>
                  <TableCell align="right">{t('dashboard.competition.participated')}</TableCell>
                  <TableCell align="right">{t('dashboard.competition.won')}</TableCell>
                  <TableCell align="right">{t('dashboard.competition.passed')}</TableCell>
                  <TableCell align="right">{t('dashboard.competition.quoteWinRate')}</TableCell>
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
                    <TableCell align="right">{row.participated}</TableCell>
                    <TableCell align="right">{row.won}</TableCell>
                    <TableCell align="right">{row.passed}</TableCell>
                    <TableCell align="right">{formatPercent(row.quoteWinRate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Stack>
    </SectionCard>
  );
}
