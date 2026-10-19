import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { BeeLoader } from '@/components/BeeLoader';
import {
  Alert, Avatar, Box, Card, CardContent, Container, Grid, Stack, Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ROLE_LABEL_KEY } from '@/constants/roles';
import type { Role } from '@/constants/roles';
import { fetchLandingRepresentatives } from '@/services/saleService';
import type { LandingRepresentative } from '@/services/saleService';

function initials(fullName: string): string {
  const words = fullName.trim().split(/\s+/u).slice(-2);
  return words.map((w) => w[0] ?? '').join('').toLocaleUpperCase();
}

/**
 * Public landing page — no login required. Lists people Admin has toggled on
 * in /sale/representatives. Backend endpoint is @Public() and returns no
 * password data.
 */
export function LandingPage(): ReactNode {
  const { t } = useTranslation();
  const [reps, setReps] = useState<LandingRepresentative[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const data = await fetchLandingRepresentatives();
        if (alive) setReps(data);
      } catch {
        if (alive) setError(t('landing.loadFailed'));
      }
    })();
    return () => {
      alive = false;
    };
  }, [t]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 6 }}>
      <Container maxWidth="lg">
        <Stack spacing={1} sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h4" fontWeight={800}>
            {t('landing.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('landing.subtitle')}
          </Typography>
        </Stack>

        {error !== null ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : null}

        {reps === null && error === null ? (
          <BeeLoader />
        ) : null}

        {reps !== null && reps.length === 0 ? (
          <Typography color="text.secondary" textAlign="center">
            {t('landing.empty')}
          </Typography>
        ) : null}

        {reps !== null && reps.length > 0 ? (
          <Grid container spacing={3}>
            {reps.map((r) => (
              <Grid key={r.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
                      <Avatar
                        src={r.avatarUrl ?? undefined}
                        sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}
                      >
                        {initials(r.fullName)}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h6" fontWeight={700} noWrap>
                          {r.fullName}
                        </Typography>
                        {r.departmentName ? (
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {r.departmentName}
                          </Typography>
                        ) : null}
                      </Box>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {r.roles.map((role: Role) => t(ROLE_LABEL_KEY[role])).join(', ')}
                    </Typography>
                    {r.email ? (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {r.email}
                      </Typography>
                    ) : null}
                    {r.phone ? (
                      <Typography variant="body2" color="text.secondary">
                        {r.phone}
                      </Typography>
                    ) : null}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : null}
      </Container>
    </Box>
  );
}
