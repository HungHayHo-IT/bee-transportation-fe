import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  List,
  Menu,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { IconBell } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/EmptyState';
import { NotificationListItem } from '@/components/NotificationListItem';
import { findNotificationTargetTab } from '@/constants/notificationTypes';
import { fetchNotifications, markNotificationsRead } from '@/services/notificationService';
import { useNotificationCenter } from '@/store/notificationContext';
import { buildOrderDetailPath, RoutePath } from '@/routes/routePaths';
import type { NotificationItem } from '@/types/notification';

const DROPDOWN_SIZE = 10;

export function NotificationBell(): ReactNode {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { unreadCount, refreshUnreadCount, subscribe } = useNotificationCenter();

  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadItems = useCallback((): void => {
    setIsLoading(true);
    fetchNotifications({ limit: DROPDOWN_SIZE })
      .then((page) => setItems(page.items))
      // The dropdown is a convenience; a failure here must not block the header.
      .catch(() => setItems([]))
      .finally(() => setIsLoading(false));
  }, []);

  // Only while the dropdown is open: a live notification arriving behind a closed
  // menu needs no work, since opening it fetches anyway.
  useEffect(() => {
    if (anchor === null) return undefined;
    return subscribe(loadItems);
  }, [anchor, loadItems, subscribe]);

  const openDropdown = (element: HTMLElement): void => {
    setAnchor(element);
    loadItems();
  };

  const handleOpenItem = (item: NotificationItem): void => {
    setAnchor(null);
    if (!item.isRead) {
      markNotificationsRead([item.id])
        .then(refreshUnreadCount)
        .catch(() => refreshUnreadCount());
    }
    if (item.orderId === null) {
      navigate(RoutePath.Notifications);
      return;
    }
    const tab = findNotificationTargetTab(item.type);
    navigate(
      tab === undefined
        ? buildOrderDetailPath(item.orderId)
        : `${buildOrderDetailPath(item.orderId)}?tab=${tab}`,
    );
  };

  return (
    <>
      <Tooltip title={t('header.notifications')}>
        <IconButton size="small" onClick={(event) => openDropdown(event.currentTarget)}>
          <Badge color="primary" badgeContent={unreadCount} max={99}>
            <IconBell size={20} stroke={1.7} />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { width: 380, maxWidth: '100%' } } }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2">{t('notifications.title')}</Typography>
        </Box>
        <Divider />

        {isLoading ? (
          <Stack alignItems="center" sx={{ py: 3 }}>
            <CircularProgress size={22} />
          </Stack>
        ) : (
          <Box sx={{ maxHeight: 420, overflowY: 'auto' }}>
            {items.length === 0 ? (
              <EmptyState title={t('notifications.empty')} />
            ) : (
              <List disablePadding>
                {items.map((item) => (
                  <NotificationListItem key={item.id} item={item} onOpen={handleOpenItem} />
                ))}
              </List>
            )}
          </Box>
        )}

        <Divider />
        <Box sx={{ px: 1, py: 0.5 }}>
          <Button
            fullWidth
            color="inherit"
            onClick={() => {
              setAnchor(null);
              navigate(RoutePath.Notifications);
            }}
          >
            {t('notifications.openInbox')}
          </Button>
        </Box>
      </Menu>
    </>
  );
}
