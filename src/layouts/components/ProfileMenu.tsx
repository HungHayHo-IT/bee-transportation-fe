import { useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import {
  Avatar,
  Box,
  Chip,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { IconLogout, IconUser } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RoutePath } from '@/routes/routePaths';
import { ROLE_LABEL_KEY } from '@/constants/roles';
import { useSession } from '@/store/sessionContext';

function buildInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const last = parts.at(-1) ?? '';
  return last.slice(0, 1).toUpperCase();
}

export function ProfileMenu(): ReactNode {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, signOut } = useSession();
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);

  const user = state.status === 'authenticated' ? state.user : null;

  const handleOpen = (event: MouseEvent<HTMLElement>): void => setAnchorElement(event.currentTarget);
  const handleClose = (): void => setAnchorElement(null);

  const handleSignOut = async (): Promise<void> => {
    handleClose();
    await signOut();
    navigate(RoutePath.Login, { replace: true });
  };

  return (
    <>
      <Tooltip title={user?.fullName ?? t('header.profile')}>
        <IconButton onClick={handleOpen} size="small">
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
            {user === null ? <IconUser size={18} stroke={1.8} /> : buildInitials(user.fullName)}
          </Avatar>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorElement}
        open={anchorElement !== null}
        onClose={handleClose}
        slotProps={{ paper: { sx: { minWidth: 260 } } }}
      >
        {user !== null ? (
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2">{user.fullName}</Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              {user.departmentName ?? t('header.noDepartment')}
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
              {user.roles.map((role) => (
                <Chip key={role} size="small" label={t(ROLE_LABEL_KEY[role])} />
              ))}
            </Stack>
          </Box>
        ) : null}

        <Divider />
        <MenuItem onClick={() => { handleClose(); navigate(RoutePath.Profile); }}>
          <ListItemIcon>
            <IconUser size={18} stroke={1.7} />
          </ListItemIcon>
          {t('nav.profile')}
        </MenuItem>
        <MenuItem onClick={() => void handleSignOut()}>
          <ListItemIcon>
            <IconLogout size={18} stroke={1.7} />
          </ListItemIcon>
          {t('header.logout')}
        </MenuItem>
      </Menu>
    </>
  );
}
