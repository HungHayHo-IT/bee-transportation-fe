import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { IconArrowLeft } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { setPageTitle } from '@/utils/documentTitle';

export interface PageContainerProps {
  title: string;
  description?: string;
  action?: ReactNode;
  /**
   * A detail page's way back to its list. Rendered as an icon beside the title —
   * the arrow says "back" on its own, and the right edge stays for real actions.
   */
  backTo?: string;
  children: ReactNode;
}

export function PageContainer({
  title,
  description,
  action,
  backTo,
  children,
}: PageContainerProps): ReactNode {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Never assign document.title here: the unread badge writes to it too, and the
  // last writer would win. documentTitle owns the string; this owns one half of it.
  useEffect(() => {
    setPageTitle(`${title} · ${t('app.name')}`);
  }, [title, t]);

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 2.5 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            {backTo === undefined ? null : (
              <Tooltip title={t('common.actions.back')}>
                <IconButton
                  aria-label={t('common.actions.back')}
                  onClick={() => navigate(backTo)}
                  size="small"
                  sx={{ ml: -0.75 }}
                >
                  <IconArrowLeft size={22} />
                </IconButton>
              </Tooltip>
            )}
            <Typography variant="h3" component="h1" sx={{ minWidth: 0 }}>
              {title}
            </Typography>
          </Stack>
          {description === undefined ? null : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: '80ch' }}>
              {description}
            </Typography>
          )}
        </Box>
        {action}
      </Stack>
      {children}
    </Box>
  );
}
