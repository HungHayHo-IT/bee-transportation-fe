import type { ReactNode } from 'react';
import { Box, Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material';
import { IconArrowDownRight, IconArrowUpRight, IconMinus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { formatCurrencyVnd } from '@/utils/formatters';

export interface RevenueHeroCardProps {
  amount: number;
  previousAmount: number;
  closedCount: number;
  averageValue: number | null;
  onOpenBreakdown?: () => void;
}

interface Trend {
  label: string;
  color: 'success' | 'error' | 'default';
  icon: ReactNode;
}

/** No previous figure means no percentage; the card says so in words instead. */
function resolveTrend(amount: number, previousAmount: number): Trend | null {
  if (previousAmount === 0) return null;
  const delta = ((amount - previousAmount) / previousAmount) * 100;
  const rounded = `${delta > 0 ? '+' : ''}${delta.toFixed(1).replace('.', ',')}%`;
  if (delta > 0) return { label: rounded, color: 'success', icon: <IconArrowUpRight size={15} /> };
  if (delta < 0) return { label: rounded, color: 'error', icon: <IconArrowDownRight size={15} /> };
  return { label: rounded, color: 'default', icon: <IconMinus size={15} /> };
}

/**
 * The one figure the whole dashboard exists for. It gets the largest type on the
 * page, its own card, and the comparison right beside it — a revenue number
 * without "against what" is a number nobody can act on.
 */
export function RevenueHeroCard({
  amount,
  previousAmount,
  closedCount,
  averageValue,
  onOpenBreakdown,
}: RevenueHeroCardProps): ReactNode {
  const { t } = useTranslation();
  const trend = resolveTrend(amount, previousAmount);

  return (
    <Card
      sx={{
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        borderColor: 'primary.main',
        // A wash rather than a solid fill: the figure has to stay readable and
        // the card must not shout louder than the numbers inside it.
        backgroundImage: (theme) =>
          `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.background.paper} 62%)`,
        ...(onOpenBreakdown === undefined ? {} : { cursor: 'pointer' }),
      }}
      onClick={onOpenBreakdown}
    >
      <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
        <Stack spacing={1.5}>
          <Typography variant="overline" color="text.secondary">
            {t('dashboard.tiles.revenueThisMonth')}
          </Typography>

          <Stack direction="row" alignItems="baseline" flexWrap="wrap" useFlexGap spacing={1.5}>
            <Typography
              variant="h1"
              color="primary.dark"
              sx={{ fontVariantNumeric: 'tabular-nums', wordBreak: 'break-word' }}
            >
              {formatCurrencyVnd(amount)}
            </Typography>
            {trend === null ? null : (
              <Chip
                size="small"
                color={trend.color}
                variant={trend.color === 'default' ? 'outlined' : 'filled'}
                icon={<Box sx={{ display: 'flex', ml: 0.75 }}>{trend.icon}</Box>}
                label={trend.label}
              />
            )}
          </Stack>

          <Typography variant="body2" color="text.secondary">
            {previousAmount === 0
              ? t('dashboard.tiles.noComparison')
              : t('dashboard.hero.comparedTo', { amount: formatCurrencyVnd(previousAmount) })}
          </Typography>

          <Divider sx={{ my: 0.5 }} />

          <Stack direction="row" spacing={4}>
            <Stack spacing={0.25}>
              <Typography variant="caption" color="text.secondary">
                {t('dashboard.hero.closedOrders')}
              </Typography>
              <Typography variant="h5" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {closedCount}
              </Typography>
            </Stack>
            <Stack spacing={0.25}>
              <Typography variant="caption" color="text.secondary">
                {t('dashboard.hero.averageValue')}
              </Typography>
              <Typography variant="h5" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {averageValue === null ? '—' : formatCurrencyVnd(averageValue)}
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
