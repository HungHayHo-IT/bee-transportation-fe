import type { ReactNode } from 'react';
import { Box, ListItemButton, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { describeNotificationType } from '@/constants/notificationTypes';
import type { NotificationIntent } from '@/constants/notificationTypes';
import { formatRelativeTime } from '@/utils/formatters';
import type { NotificationItem } from '@/types/notification';

export interface NotificationListItemProps {
  item: NotificationItem;
  onOpen: (item: NotificationItem) => void;
}

const INTENT_COLOR: Record<NotificationIntent, string> = {
  default: 'text.secondary',
  primary: 'primary.main',
  success: 'success.main',
  warning: 'warning.main',
  error: 'error.main',
};

export function NotificationListItem({ item, onOpen }: NotificationListItemProps): ReactNode {
  const { t, i18n } = useTranslation();
  const descriptor = describeNotificationType(item.type);
  const TypeIcon = descriptor.icon;

  return (
    <ListItemButton
      onClick={() => onOpen(item)}
      sx={{
        alignItems: 'flex-start',
        gap: 1.5,
        py: 1.25,
        backgroundColor: item.isRead ? 'transparent' : 'action.hover',
      }}
    >
      <Box sx={{ color: INTENT_COLOR[descriptor.intent], display: 'flex', pt: 0.25 }}>
        <TypeIcon size={19} stroke={1.7} />
      </Box>

      <Stack spacing={0.25} sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={item.isRead ? 400 : 600}>
          {item.title}
        </Typography>
        {item.body === null ? null : (
          <Typography variant="caption" color="text.secondary">
            {item.body}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          {t(descriptor.labelKey)} · {formatRelativeTime(item.createdAt, i18n.language)}
        </Typography>
      </Stack>

      {item.isRead ? null : (
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: 'primary.main',
            flexShrink: 0,
            mt: 0.75,
          }}
        />
      )}
    </ListItemButton>
  );
}
