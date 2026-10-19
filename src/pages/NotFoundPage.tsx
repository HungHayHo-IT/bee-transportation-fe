import type { ReactNode } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function NotFoundPage(): ReactNode {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      <Stack spacing={2} alignItems="center" textAlign="center">
        <Typography variant="h1" color="primary">
          404
        </Typography>
        <Typography variant="h5">{t('notFound.title')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
          {t('notFound.description')}
        </Typography>
        {/* Về '/' chứ không về Bảng điều khiển: với vai trò không mở được màn
            đó, nút này dẫn từ trang 404 sang đúng một trang 404 nữa. */}
        <Button component={Link} to="/" variant="contained">
          {t('notFound.action')}
        </Button>
      </Stack>
    </Box>
  );
}
