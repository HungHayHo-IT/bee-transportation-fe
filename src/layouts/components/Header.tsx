import type { ReactNode } from 'react';
import { AppBar, Box, IconButton, Stack, Toolbar, Tooltip } from '@mui/material';
import { IconMenu2 } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NotificationBell } from './NotificationBell';
import { ProfileMenu } from './ProfileMenu';

export interface HeaderProps {
  onToggleSidebar: () => void;
  onToggleMobileSidebar: () => void;
}

export function Header({ onToggleSidebar, onToggleMobileSidebar }: HeaderProps): ReactNode {
  const { t } = useTranslation();

  return (
    <AppBar
      position="sticky"
      elevation={0}
      color="inherit"
      sx={{ borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}
    >
      <Toolbar sx={{ minHeight: 64 }}>
        <Tooltip title={t('header.toggleSidebar')}>
          <IconButton
            onClick={onToggleSidebar}
            size="small"
            sx={{ display: { xs: 'none', lg: 'inline-flex' } }}
          >
            <IconMenu2 size={20} stroke={1.8} />
          </IconButton>
        </Tooltip>
        <IconButton
          onClick={onToggleMobileSidebar}
          size="small"
          sx={{ display: { xs: 'inline-flex', lg: 'none' } }}
        >
          <IconMenu2 size={20} stroke={1.8} />
        </IconButton>

        <Box sx={{ flexGrow: 1 }} />

        <Stack direction="row" alignItems="center" spacing={0.5}>
          <LanguageSwitcher />
          <NotificationBell />
          <ProfileMenu />
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
