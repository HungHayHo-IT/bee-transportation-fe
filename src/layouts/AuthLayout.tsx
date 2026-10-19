import type { ReactNode } from 'react';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { IconChartBar, IconClipboardList, IconTruckDelivery } from '@tabler/icons-react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { brandColors, railColors } from '@/theme';

const HIGHLIGHT_KEYS = ['intake', 'quotes', 'reports'] as const;

const HIGHLIGHT_ICON = {
  intake: <IconClipboardList size={20} stroke={1.7} />,
  quotes: <IconTruckDelivery size={20} stroke={1.7} />,
  reports: <IconChartBar size={20} stroke={1.7} />,
} as const;

function BrandMark({ isOnDark = false }: { isOnDark?: boolean }): ReactNode {
  const { t } = useTranslation();

  return (
    <Stack direction="row" alignItems="center" spacing={1.5}>
      {/* Animated Bee loader as the logo. Height-locked, the art is ~2.6:1. */}
      <Box
        component="img"
        src="/bee-loader.svg"
        alt={t('app.name')}
        sx={{ height: 48, width: 'auto', objectFit: 'contain', display: 'block' }}
      />
      <Box>
        <Typography variant="h5" lineHeight={1.1} color={isOnDark ? 'common.white' : 'text.primary'}>
          {t('app.name')}
        </Typography>
        <Typography variant="caption" sx={{ color: isOnDark ? railColors.text : 'text.secondary' }}>
          {t('app.tagline')}
        </Typography>
      </Box>
    </Stack>
  );
}

/**
 * Sign-in is the only screen an outsider ever sees, so it carries the product's
 * face: what BeeOps is for on the left, the form alone on the right. Below the
 * `md` breakpoint the panel drops away and the form takes the whole screen —
 * nobody needs a sales pitch on a phone at seven in the morning.
 */
export function AuthLayout(): ReactNode {
  const { t } = useTranslation();

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', backgroundColor: 'background.default' }}>
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '42%',
          maxWidth: 520,
          p: 6,
          color: 'common.white',
          backgroundColor: railColors.background,
          backgroundImage: `radial-gradient(circle at 15% 12%, rgba(255, 90, 0, 0.32) 0%, transparent 46%)`,
        }}
      >
        <BrandMark isOnDark />

        <Stack spacing={3}>
          <Typography variant="h2" color="common.white">
            {t('auth.brand.headline')}
          </Typography>
          <Stack spacing={2}>
            {HIGHLIGHT_KEYS.map((key) => (
              <Stack key={key} direction="row" spacing={1.5} alignItems="flex-start">
                <Box
                  sx={{
                    display: 'flex',
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: brandColors.orange,
                    backgroundColor: 'rgba(255, 90, 0, 0.14)',
                  }}
                >
                  {HIGHLIGHT_ICON[key]}
                </Box>
                <Typography variant="body2" sx={{ color: railColors.text, pt: 0.75 }}>
                  {t(`auth.brand.${key}`)}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>

        <Typography variant="caption" sx={{ color: railColors.textMuted }}>
          {t('auth.brand.company')}
        </Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
          py: 6,
        }}
      >
        <Card sx={{ width: '100%', maxWidth: 420 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: { md: 'none' }, mb: 3 }}>
              <BrandMark />
            </Box>
            <Outlet />
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
