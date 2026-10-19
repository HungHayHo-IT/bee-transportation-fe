import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Chip, MenuItem, Stack, TableCell, TableRow, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { DataTableShell } from '@/components/DataTableShell';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { findActivityActionLabelKey } from '@/constants/activityActions';
import { fetchActivity } from '@/services/organisationService';
import { formatDateTime } from '@/utils/formatters';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@/constants/pagination';
import type { ActivityPage } from '@/types/organisation';

const ALL_OPTION = 'all';
const ENTITY_OPTIONS = ['orders', 'users', 'departments', 'services'] as const;

function describeDetail(detail: Record<string, unknown> | null): string {
  if (detail === null) return '—';
  return Object.entries(detail)
    .map(([field, change]) => {
      if (!Array.isArray(change)) return `${field}: ${JSON.stringify(change)}`;
      const [before, after] = change as [unknown, unknown];
      return `${field}: ${String(before ?? '∅')} → ${String(after ?? '∅')}`;
    })
    .join(' · ');
}

export function ActivityLogPage(): ReactNode {
  const { t } = useTranslation();
  const [entityFilter, setEntityFilter] = useState<string>(ALL_OPTION);
  const [page, setPage] = useState(DEFAULT_PAGE);

  const filters = useMemo(
    () => ({
      page,
      limit: DEFAULT_PAGE_SIZE,
      ...(entityFilter === ALL_OPTION ? {} : { entity: entityFilter }),
    }),
    [entityFilter, page],
  );
  const resource = useAsyncResource<ActivityPage>(() => fetchActivity(filters), [filters]);

  const describeAction = (action: string): string => {
    const labelKey = findActivityActionLabelKey(action);
    return labelKey === null ? action : t(labelKey);
  };

  const entries = resource.data?.items ?? [];
  const total = resource.data?.total ?? 0;

  return (
    <PageContainer title={t('nav.activityLog')} description={t('admin.activity.description')}>
      <SectionCard>
        <Stack direction="row" spacing={2}>
          <TextField
            select
            label={t('admin.activity.entity')}
            value={entityFilter}
            onChange={(event) => {
              setEntityFilter(event.target.value);
              setPage(DEFAULT_PAGE);
            }}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value={ALL_OPTION}>{t('common.actions.all')}</MenuItem>
            {ENTITY_OPTIONS.map((entity) => (
              <MenuItem key={entity} value={entity}>
                {entity}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </SectionCard>

      <SectionCard disableContentPadding>
        <DataTableShell
          isFirstLoad={resource.isFirstLoad}
          isRefetching={resource.isRefetching}
          errorMessage={resource.errorMessage}
          onDismissError={resource.clearError}
          isEmpty={entries.length === 0}
          totalRows={total}
          page={page}
          pageCount={Math.ceil(total / DEFAULT_PAGE_SIZE)}
          onPageChange={setPage}
          minWidth={920}
          head={
            <TableRow>
              <TableCell>{t('admin.activity.time')}</TableCell>
              <TableCell>{t('admin.activity.actor')}</TableCell>
              <TableCell>{t('admin.activity.entity')}</TableCell>
              <TableCell>{t('admin.activity.action')}</TableCell>
              <TableCell>{t('admin.activity.detail')}</TableCell>
            </TableRow>
          }
        >
          {entries.map((entry) => (
            <TableRow key={entry.id} hover>
              <TableCell>{formatDateTime(entry.createdAt)}</TableCell>
              <TableCell>{entry.actorName ?? t('admin.activity.system')}</TableCell>
              <TableCell>
                <Chip
                  size="small"
                  variant="outlined"
                  label={entry.orderCode ?? `${entry.entity} #${entry.entityId}`}
                />
              </TableCell>
              <TableCell>{describeAction(entry.action)}</TableCell>
              <TableCell>
                <Typography variant="caption" color="text.secondary">
                  {describeDetail(entry.detail)}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </DataTableShell>
      </SectionCard>
    </PageContainer>
  );
}
