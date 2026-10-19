import { useCallback, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { Button, IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip } from '@mui/material';
import { IconDownload, IconPaperclip, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { EmptyState } from '@/components/EmptyState';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useCurrentUser } from '@/store/sessionContext';
import { Role } from '@/constants/roles';
import { deleteOrderFile, downloadOrderFile, fetchOrderFiles } from '@/services/collabService';
import { uploadOrderFile } from '@/services/orderService';
import { formatDateTime } from '@/utils/formatters';
import type { OrderFile } from '@/types/order';
import { describeError } from '@/services/apiClient';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function OrderFilesTab({ orderId }: { orderId: number }): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const user = useCurrentUser();
  const load = useCallback((): Promise<OrderFile[]> => fetchOrderFiles(orderId), [orderId]);
  const resource = useAsyncResource<OrderFile[]>(load, [load]);
  const [isBusy, setIsBusy] = useState(false);

  const files = resource.data ?? [];

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = '';
    setIsBusy(true);
    try {
      for (const file of selected) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          enqueueSnackbar(t('orders.create.fileTooLarge', { name: file.name }), {
            variant: 'error',
          });
          continue;
        }
        await uploadOrderFile(orderId, file);
      }
      resource.reload();
    } catch (error) {
      enqueueSnackbar(describeError(error), { variant: 'error' });
    } finally {
      setIsBusy(false);
    }
  };

  const handleDownload = async (file: OrderFile): Promise<void> => {
    try {
      await downloadOrderFile(orderId, file);
    } catch (error) {
      enqueueSnackbar(describeError(error), { variant: 'error' });
    }
  };

  const handleDelete = async (file: OrderFile): Promise<void> => {
    setIsBusy(true);
    try {
      await deleteOrderFile(orderId, file.id);
      resource.reload();
    } catch (error) {
      enqueueSnackbar(describeError(error), { variant: 'error' });
    } finally {
      setIsBusy(false);
    }
  };

  const canDelete = (file: OrderFile): boolean =>
    user !== null && (user.roles.includes(Role.Admin) || file.uploadedById === user.id);

  return (
    <Stack spacing={2} alignItems="flex-start">
      <Button component="label" startIcon={<IconPaperclip size={18} />} disabled={isBusy}>
        {t('orders.create.attachFiles')}
        <input type="file" hidden multiple onChange={(event) => void handleUpload(event)} />
      </Button>

      {files.length === 0 ? (
        <EmptyState title={t('orders.detail.noFiles')} description={t('orders.detail.noFilesHint')} />
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('orders.detail.fileName')}</TableCell>
              <TableCell>{t('orders.detail.fileSize')}</TableCell>
              <TableCell>{t('orders.detail.uploadedBy')}</TableCell>
              <TableCell>{t('orders.detail.uploadedAt')}</TableCell>
              <TableCell align="right">{t('common.actions.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {files.map((file) => (
              <TableRow key={file.id} hover>
                <TableCell>{file.name}</TableCell>
                <TableCell>{formatSize(file.size)}</TableCell>
                <TableCell>{file.uploadedByName ?? '—'}</TableCell>
                <TableCell>{formatDateTime(file.createdAt)}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Tooltip title={t('common.actions.download')}>
                      <IconButton size="small" onClick={() => void handleDownload(file)}>
                        <IconDownload size={17} stroke={1.7} />
                      </IconButton>
                    </Tooltip>
                    {canDelete(file) ? (
                      <Tooltip title={t('common.actions.delete')}>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={isBusy}
                          onClick={() => void handleDelete(file)}
                        >
                          <IconTrash size={17} stroke={1.7} />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
}
