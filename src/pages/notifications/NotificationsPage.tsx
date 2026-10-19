import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { BeeLoader } from '@/components/BeeLoader';
import {
  Alert,
  Button,
  LinearProgress,
  List,
  Pagination,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { IconChecks } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { EmptyState } from '@/components/EmptyState';
import { NotificationListItem } from '@/components/NotificationListItem';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { findNotificationTargetTab } from '@/constants/notificationTypes';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@/constants/pagination';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationsRead,
} from '@/services/notificationService';
import { useNotificationCenter } from '@/store/notificationContext';
import { formatDate } from '@/utils/formatters';
import { buildOrderDetailPath } from '@/routes/routePaths';
import type { NotificationItem } from '@/types/notification';
import type { Page } from '@/types/pagination';
import { describeError } from '@/services/apiClient';

type InboxFilter = 'all' | 'unread';

interface DayGroup {
  day: string;
  items: NotificationItem[];
}

/** Newest first, grouped by the day they arrived. */
function groupByDay(items: NotificationItem[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const item of items) {
    const day = formatDate(item.createdAt);
    const current = groups.at(-1);
    if (current !== undefined && current.day === day) {
      current.items.push(item);
      continue;
    }
    groups.push({ day, items: [item] });
  }
  return groups;
}

export function NotificationsPage(): ReactNode {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { refreshUnreadCount } = useNotificationCenter();

  const [filter, setFilter] = useState<InboxFilter>('all');
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const load = useCallback(
    (): Promise<Page<NotificationItem>> =>
      fetchNotifications({
        page,
        limit: DEFAULT_PAGE_SIZE,
        ...(filter === 'unread' ? { isRead: false } : {}),
      }),
    [filter, page],
  );
  const resource = useAsyncResource<Page<NotificationItem>>(load, [load]);
  const items = resource.data?.items ?? [];
  const total = resource.data?.total ?? 0;
  const pageCount = Math.ceil(total / DEFAULT_PAGE_SIZE);
  const groups = groupByDay(items);

  const changeFilter = (next: InboxFilter): void => {
    setFilter(next);
    setPage(DEFAULT_PAGE);
  };

  const handleOpen = (item: NotificationItem): void => {
    if (!item.isRead) {
      markNotificationsRead([item.id])
        .then(() => {
          refreshUnreadCount();
          resource.reload();
        })
        .catch(() => refreshUnreadCount());
    }
    if (item.orderId === null) return;
    const tab = findNotificationTargetTab(item.type);
    navigate(
      tab === undefined
        ? buildOrderDetailPath(item.orderId)
        : `${buildOrderDetailPath(item.orderId)}?tab=${tab}`,
    );
  };

  const handleMarkAll = async (): Promise<void> => {
    setIsMarkingAll(true);
    try {
      await markAllNotificationsRead();
      refreshUnreadCount();
      setPage(DEFAULT_PAGE);
      resource.reload();
      enqueueSnackbar(t('notifications.markedAll'), { variant: 'success' });
    } catch (error) {
      enqueueSnackbar(describeError(error), { variant: 'error' });
    } finally {
      setIsMarkingAll(false);
    }
  };

  return (
    <PageContainer title={t('nav.notifications')} description={t('notifications.description')}>
      <SectionCard
        action={
          <Button
            startIcon={<IconChecks size={18} />}
            color="inherit"
            disabled={isMarkingAll}
            onClick={() => void handleMarkAll()}
          >
            {t('notifications.markAll')}
          </Button>
        }
        disableContentPadding
      >
        <Tabs
          value={filter}
          onChange={(_event, value: InboxFilter) => changeFilter(value)}
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab value="all" label={t('notifications.filterAll')} />
          <Tab value="unread" label={t('notifications.filterUnread')} />
        </Tabs>

        {resource.isFirstLoad ? (
          <BeeLoader />
        ) : null}
        {resource.isRefetching && !resource.isFirstLoad ? <LinearProgress /> : null}

        {resource.errorMessage === null ? null : (
          <Alert severity="error" onClose={resource.clearError} sx={{ m: 2 }}>
            {resource.errorMessage}
          </Alert>
        )}

        {!resource.isFirstLoad && items.length === 0 ? (
          <EmptyState
            title={t('notifications.empty')}
            description={t('notifications.emptyHint')}
          />
        ) : null}

        {groups.map((group) => (
          <Stack key={group.day}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ px: 2, pt: 1.5, pb: 0.5, fontWeight: 600 }}
            >
              {group.day}
            </Typography>
            <List disablePadding>
              {group.items.map((item) => (
                <NotificationListItem key={item.id} item={item} onOpen={handleOpen} />
              ))}
            </List>
          </Stack>
        ))}

        {pageCount > 1 ? (
          <Stack alignItems="center" sx={{ py: 2 }}>
            <Pagination
              page={page}
              count={pageCount}
              onChange={(_event, next) => setPage(next)}
              shape="rounded"
            />
          </Stack>
        ) : null}
      </SectionCard>
    </PageContainer>
  );
}
