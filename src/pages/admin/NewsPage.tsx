import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Button, Chip, IconButton, Stack, TableCell, TableRow, Tooltip,
} from '@mui/material';
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { DataTableShell } from '@/components/DataTableShell';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useDisclosure } from '@/hooks/useDisclosure';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@/constants/pagination';
import { describeError } from '@/services/apiClient';
import {
  createNewsArticle, deleteNewsArticle, fetchNewsList, updateNewsArticle,
} from '@/services/newsService';
import type { NewsArticle, NewsPage, NewsStatus } from '@/services/newsService';
import { NewsFormDialog } from './NewsFormDialog';
import type { NewsFormValues } from './NewsFormDialog';

const STATUS_COLOR: Record<NewsStatus, 'default' | 'success' | 'warning'> = {
  draft: 'warning', published: 'success', archived: 'default',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

/** CRUD trang tin tức. Admin-only (được gate ở AppRoutes). */
export function NewsPage(): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [editing, setEditing] = useState<NewsArticle | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<NewsArticle | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const formDialog = useDisclosure();

  const resource = useAsyncResource<NewsPage>(
    useCallback(() => fetchNewsList({ page, limit: DEFAULT_PAGE_SIZE }), [page]),
    [page],
  );
  const items = resource.data?.items ?? [];

  const openCreate = (): void => {
    setEditing(null); setFormError(null); formDialog.open();
  };
  const openEdit = (article: NewsArticle): void => {
    setEditing(article); setFormError(null); formDialog.open();
  };

  const handleSubmit = async (values: NewsFormValues): Promise<void> => {
    setIsSaving(true); setFormError(null);
    try {
      const payload = {
        title: values.title.trim(), slug: values.slug.trim(),
        excerpt: values.excerpt.trim() || undefined,
        body: values.body,
        coverImageUrl: values.coverImageUrl.trim() || undefined,
        status: values.status,
      };
      if (editing) await updateNewsArticle(editing.id, payload);
      else await createNewsArticle(payload);
      formDialog.close();
      enqueueSnackbar(t(editing ? 'news.toast.updated' : 'news.toast.created'), { variant: 'success' });
      resource.reload();
    } catch (err) {
      setFormError(describeError(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!confirmDelete) return;
    try {
      await deleteNewsArticle(confirmDelete.id);
      enqueueSnackbar(t('news.toast.deleted'), { variant: 'success' });
      setConfirmDelete(null);
      resource.reload();
    } catch (err) {
      enqueueSnackbar(describeError(err), { variant: 'error' });
    }
  };

  return (
    <PageContainer
      title={t('news.title')}
      action={
        <Button variant="contained" startIcon={<IconPlus size={18} />} onClick={openCreate}>
          {t('news.actions.create')}
        </Button>
      }
    >
      <SectionCard disableContentPadding>
        <DataTableShell
          isFirstLoad={resource.isFirstLoad}
          isRefetching={resource.isRefetching}
          errorMessage={resource.errorMessage}
          onDismissError={resource.clearError}
          isEmpty={items.length === 0}
          emptyTitle={t('news.empty')}
          page={page}
          pageCount={Math.max(1, Math.ceil((resource.data?.total ?? 0) / DEFAULT_PAGE_SIZE))}
          totalRows={resource.data?.total ?? 0}
          onPageChange={setPage}
          head={
            <TableRow>
              <TableCell>{t('news.table.title')}</TableCell>
              <TableCell>{t('news.table.slug')}</TableCell>
              <TableCell>{t('news.table.status')}</TableCell>
              <TableCell>{t('news.table.publishedAt')}</TableCell>
              <TableCell>{t('news.table.updatedAt')}</TableCell>
              <TableCell align="right">{t('common.actions.actions')}</TableCell>
            </TableRow>
          }
        >
          {items.map((row) => (
            <TableRow key={row.id} hover>
              <TableCell sx={{ maxWidth: 380 }}>
                <div style={{ fontWeight: 600 }}>{row.title}</div>
                {row.excerpt ? (
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                    {row.excerpt.slice(0, 120)}
                  </div>
                ) : null}
              </TableCell>
              <TableCell>
                <code style={{ fontSize: 12 }}>{row.slug}</code>
              </TableCell>
              <TableCell>
                <Chip
                  size="small" label={t(`news.status.${row.status}`)}
                  color={STATUS_COLOR[row.status]}
                />
              </TableCell>
              <TableCell>{formatDate(row.publishedAt)}</TableCell>
              <TableCell>{formatDate(row.updatedAt)}</TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                  <Tooltip title={t('common.actions.edit')}>
                    <IconButton size="small" onClick={() => openEdit(row)}>
                      <IconPencil size={16} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('common.actions.delete')}>
                    <IconButton
                      size="small" color="error"
                      onClick={() => setConfirmDelete(row)}
                    >
                      <IconTrash size={16} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </DataTableShell>
      </SectionCard>

      <NewsFormDialog
        isOpen={formDialog.isOpen}
        initial={editing}
        isSubmitting={isSaving}
        errorMessage={formError}
        onClose={formDialog.close}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        title={t('news.confirmDelete.title')}
        description={t('news.confirmDelete.body', { title: confirmDelete?.title ?? '' })}
        confirmLabel={t('common.actions.delete')}
        isDestructive
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </PageContainer>
  );
}
