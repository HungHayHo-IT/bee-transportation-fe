import { BeeLoader } from '@/components/BeeLoader';
import type { ReactNode } from 'react';
import {
  Alert,
  Box,
  LinearProgress,
  Pagination,
  Stack,
  Table,
  TableBody,
  TableContainer,
  TableHead,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { EmptyState } from './EmptyState';

export interface DataTableShellProps {
  /** True only until the first response arrives; later refetches use the linear bar. */
  isFirstLoad: boolean;
  isRefetching?: boolean;
  errorMessage?: string | null;
  onDismissError?: () => void;
  isEmpty: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  head: ReactNode;
  children: ReactNode;
  minWidth?: number;
  /**
   * Column widths come from the head cells instead of the rows on screen, so a
   * re-sort or a new page never shifts the columns. Head cells without a `width`
   * share whatever the fixed ones leave.
   */
  isFixedLayout?: boolean;
  page?: number;
  pageCount?: number;
  totalRows?: number;
  onPageChange?: (page: number) => void;
}

export function DataTableShell({
  isFirstLoad,
  isRefetching = false,
  errorMessage = null,
  onDismissError,
  isEmpty,
  emptyTitle,
  emptyDescription,
  head,
  children,
  minWidth = 720,
  isFixedLayout = false,
  page,
  pageCount,
  totalRows,
  onPageChange,
}: DataTableShellProps): ReactNode {
  const { t } = useTranslation();

  if (isFirstLoad) {
    return (
      <BeeLoader />
    );
  }

  const showPagination =
    page !== undefined && pageCount !== undefined && pageCount > 1 && onPageChange !== undefined;

  return (
    <Box>
      {errorMessage ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={onDismissError}>
          {errorMessage}
        </Alert>
      ) : null}

      {/* The slot is always there, so a refetch shows the bar without pushing
          the table down and snapping it back when the data arrives. */}
      <Box sx={{ height: 4, mb: 1 }}>{isRefetching ? <LinearProgress /> : null}</Box>

      {isEmpty ? (
        <EmptyState
          title={emptyTitle ?? t('common.states.empty')}
          description={emptyDescription ?? t('common.states.emptyHint')}
        />
      ) : (
        <TableContainer sx={{ overflowX: 'auto', maxHeight: '68vh' }}>
          {/* The header stays put while a long result set scrolls under it. */}
          <Table
            size="small"
            stickyHeader
            sx={{
              minWidth,
              tableLayout: isFixedLayout ? 'fixed' : 'auto',
              // A fixed column clips instead of growing, so a long header label
              // ends in an ellipsis rather than running into its neighbour.
              ...(isFixedLayout ? { '& th': { overflow: 'hidden', textOverflow: 'ellipsis' } } : {}),
            }}
          >
            <TableHead>{head}</TableHead>
            <TableBody>{children}</TableBody>
          </Table>
        </TableContainer>
      )}

      {showPagination || totalRows !== undefined ? (
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ px: 2.5, py: 1.5, borderTop: 1, borderColor: 'divider' }}
        >
          <Typography variant="caption" color="text.secondary">
            {totalRows === undefined ? '' : t('common.table.totalRows', { count: totalRows })}
          </Typography>
          {showPagination ? (
            <Pagination
              page={page}
              count={pageCount}
              onChange={(_event, nextPage) => onPageChange(nextPage)}
              shape="rounded"
              color="primary"
              size="small"
            />
          ) : null}
        </Stack>
      ) : null}
    </Box>
  );
}
