import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/EmptyState';
import { findActivityActionLabelKey } from '@/constants/activityActions';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { fetchOrderTimeline } from '@/services/orderService';
import { formatDateTime } from '@/utils/formatters';
import { brandColors } from '@/theme';
import type { TimelineItem } from '@/types/order';
import type { Page } from '@/types/pagination';

function describeDetail(detail: Record<string, unknown> | null): string | null {
  if (detail === null) return null;
  return Object.entries(detail)
    .map(([field, change]) => {
      if (!Array.isArray(change)) return `${field}: ${JSON.stringify(change)}`;
      // Only a two-element array is a before/after pair; anything else is a list.
      if (change.length !== 2) return `${field}: ${change.map(String).join(', ')}`;
      const [before, after] = change;
      return `${field}: ${String(before ?? '∅')} → ${String(after ?? '∅')}`;
    })
    .join(' · ');
}

export function OrderTimelineTab({ orderId }: { orderId: number }): ReactNode {
  const { t } = useTranslation();
  const load = useCallback(
    (): Promise<Page<TimelineItem>> => fetchOrderTimeline(orderId),
    [orderId],
  );
  const resource = useAsyncResource<Page<TimelineItem>>(load, [load]);
  const items = resource.data?.items ?? [];
  const hidden = (resource.data?.total ?? 0) - items.length;

  if (items.length === 0) {
    return <EmptyState title={t('orders.detail.noTimeline')} />;
  }

  return (
    <Stack spacing={0}>
      {hidden > 0 ? (
        <Typography variant="caption" color="text.secondary" sx={{ pb: 1.5 }}>
          {t('orders.detail.timelineTruncated', { count: hidden })}
        </Typography>
      ) : null}
      {items.map((item, index) => {
        const detail = describeDetail(item.detail);
        const actionLabelKey = findActivityActionLabelKey(item.action);
        return (
          <Stack key={`${item.createdAt}-${String(index)}`} direction="row" spacing={2}>
            <Stack alignItems="center" sx={{ pt: 0.5 }}>
              <Box
                sx={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  backgroundColor: brandColors.orange,
                  flexShrink: 0,
                }}
              />
              {index === items.length - 1 ? null : (
                <Box sx={{ width: '1px', flexGrow: 1, backgroundColor: 'divider', my: 0.5 }} />
              )}
            </Stack>
            <Box sx={{ pb: 2.5 }}>
              <Typography variant="body2" fontWeight={600}>
                {actionLabelKey === null ? item.action : t(actionLabelKey)}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {formatDateTime(item.createdAt)} · {item.actorName ?? t('admin.activity.system')}
              </Typography>
              {detail === null ? null : (
                <Typography variant="caption" color="text.secondary">
                  {detail}
                </Typography>
              )}
            </Box>
          </Stack>
        );
      })}
    </Stack>
  );
}
