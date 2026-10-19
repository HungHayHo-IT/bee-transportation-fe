import type { ReactNode } from 'react';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';

export type StatIntent = 'default' | 'success' | 'warning' | 'danger';

export interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  intent?: StatIntent;
  onClick?: () => void;
}

/** Icon tint and value colour come from the same intent, never set separately. */
const INTENT_STYLE: Record<StatIntent, { value: string; icon: string; iconBackground: string }> = {
  default: { value: 'text.primary', icon: 'text.secondary', iconBackground: 'action.hover' },
  success: { value: 'text.primary', icon: 'success.main', iconBackground: 'success.light' },
  warning: { value: 'warning.main', icon: 'warning.main', iconBackground: 'warning.light' },
  danger: { value: 'error.main', icon: 'error.main', iconBackground: 'error.light' },
};

/**
 * A supporting figure: one number, its name, and one line of context. The label
 * sits above the value in small caps so the number is the first thing read — the
 * opposite arrangement makes a row of tiles read as a list of labels.
 */
export function StatTile({
  label,
  value,
  hint,
  icon,
  intent = 'default',
  onClick,
}: StatTileProps): ReactNode {
  const style = INTENT_STYLE[intent];

  return (
    <Card
      sx={{
        height: '100%',
        transition: 'border-color 120ms ease, box-shadow 120ms ease',
        ...(onClick === undefined
          ? {}
          : {
              cursor: 'pointer',
              '&:hover': { borderColor: 'primary.main' },
            }),
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 2,
              flexShrink: 0,
              color: style.icon,
              backgroundColor: style.iconBackground,
            }}
          >
            {icon}
          </Box>
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary" noWrap>
              {label}
            </Typography>
            <Typography variant="h4" color={style.value} sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {value}
            </Typography>
            {hint === undefined ? null : (
              <Typography variant="caption" color="text.secondary">
                {hint}
              </Typography>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
