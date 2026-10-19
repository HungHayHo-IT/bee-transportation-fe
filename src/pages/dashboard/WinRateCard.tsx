import type { ReactNode } from 'react';
import { Divider, LinearProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/EmptyState';
import type { WinRateReport } from '@/types/dashboard';

export interface WinRateCardProps {
  report: WinRateReport;
  onReasonSelected: (reason: string) => void;
}

function formatPercent(value: number | null): string {
  if (value === null) return '—';
  return `${value.toFixed(1).replace('.', ',')}%`;
}

/**
 * The denominator is decided orders — won plus customer-rejected. Cancellations
 * are internal and deliberately stay out of it.
 */
export function WinRateCard({ report, onReasonSelected }: WinRateCardProps): ReactNode {
  const { t } = useTranslation();

  if (report.decided === 0) {
    return <EmptyState title={t('dashboard.winRate.empty')} description={t('dashboard.winRate.emptyHint')} />;
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="baseline" spacing={1}>
        <Typography variant="h4" color="primary.main">
          {formatPercent(report.winRate)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('dashboard.winRate.ratio', { won: report.won, decided: report.decided })}
        </Typography>
      </Stack>

      <LinearProgress
        variant="determinate"
        value={Math.min(100, report.winRate ?? 0)}
        sx={{ height: 8, borderRadius: 4 }}
      />

      <Divider />

      <Typography variant="subtitle2">{t('dashboard.winRate.reasons')}</Typography>
      {report.reasons.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('dashboard.winRate.noReasons')}
        </Typography>
      ) : (
        <Stack spacing={1}>
          {report.reasons.map((row) => (
            <Stack
              key={row.reason}
              direction="row"
              justifyContent="space-between"
              sx={{ cursor: 'pointer' }}
              onClick={() => onReasonSelected(row.reason)}
            >
              <Typography variant="body2">{row.reason}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('dashboard.winRate.orderCount', { count: row.count })}
              </Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
