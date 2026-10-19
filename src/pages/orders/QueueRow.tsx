import type { ReactNode } from 'react';
import {
  Button,
  Chip,
  IconButton,
  Stack,
  TableCell,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { IconArrowsExchange, IconHandGrab, IconUserPlus, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { EllipsisCell } from '@/components/EllipsisCell';
import {
  DEPARTMENT_STATE_LABEL_KEY,
  DepartmentState,
  isDeptWorkable,
  ORDER_STATUS_LABEL_KEY,
} from '@/constants/orderStatus';
import { formatDateTime, formatRelativeTime } from '@/utils/formatters';
import type { QueueItem } from '@/types/queue';

/** Shared by the header cell so the two stay pinned to the same edge. */
export const STICKY_ACTION_CELL = {
  position: 'sticky',
  right: 0,
  backgroundColor: 'background.paper',
  borderLeft: 1,
  borderLeftColor: 'divider',
} as const;

export interface QueueRowProps {
  item: QueueItem;
  isBusy: boolean;
  canAct: boolean;
  /** Chỉ Pricing nhận đơn — người khác không thấy nút. */
  canClaim: boolean;
  canAssign: boolean;
  canTransfer: boolean;
  onClaim: (item: QueueItem) => void;
  onAssign: (item: QueueItem) => void;
  onTransfer: (item: QueueItem) => void;
  onPass: (item: QueueItem) => void;
}

export function QueueRow({
  item,
  isBusy,
  canAct,
  canClaim,
  canAssign,
  canTransfer,
  onClaim,
  onAssign,
  onTransfer,
  onPass,
}: QueueRowProps): ReactNode {
  const { t, i18n } = useTranslation();
  // Cancelling an order never touches the department state, so a cancelled order
  // still arrives here as `pending`. Show what actually happened to the order and
  // stop offering actions the backend would reject with a 409.
  const isOrderOpen = isDeptWorkable(item.orderStatus);
  const isPending = item.state === DepartmentState.Pending && isOrderOpen;

  return (
    <TableRow hover>
      <TableCell>
        <Typography variant="body2" fontWeight={700} noWrap>
          {item.code}
        </Typography>
      </TableCell>
      <TableCell sx={{ maxWidth: 170 }}>
        <EllipsisCell text={item.serviceName} />
      </TableCell>
      <TableCell sx={{ maxWidth: 200 }}>
        <EllipsisCell text={item.customerName ?? '—'} />
      </TableCell>
      <TableCell sx={{ maxWidth: 180 }}>
        <EllipsisCell
          text={`${item.originProvince ?? '—'} → ${item.destinationProvince ?? '—'}`}
        />
      </TableCell>
      <TableCell>
        <Stack direction="row" spacing={0.5}>
          {isOrderOpen ? (
            <Chip
              size="small"
              variant="outlined"
              label={t(DEPARTMENT_STATE_LABEL_KEY[item.state])}
            />
          ) : (
            <Chip
              size="small"
              color="error"
              variant="filled"
              label={t(ORDER_STATUS_LABEL_KEY[item.orderStatus])}
            />
          )}
          {item.slaLate ? <Chip size="small" color="error" label={t('queue.slaLate')} /> : null}
        </Stack>
      </TableCell>
      <TableCell sx={{ maxWidth: 150 }}>
        <EllipsisCell text={item.assigneeName ?? '—'} />
      </TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        <Tooltip title={formatDateTime(item.distributedAt)}>
          <span>{formatRelativeTime(item.distributedAt, i18n.resolvedLanguage ?? 'vi')}</span>
        </Tooltip>
      </TableCell>
      {/* Actions stay pinned to the right edge: this is the screen where the
          whole job is to claim or pass, and scrolling to reach the button is a
          tax on every row. */}
      <TableCell align="right" sx={STICKY_ACTION_CELL}>
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
          {canClaim ? (
            <Button
              size="small"
              variant="contained"
              startIcon={<IconHandGrab size={16} />}
              disabled={!isPending || isBusy || !canAct}
              onClick={() => onClaim(item)}
            >
              {t('queue.claim')}
            </Button>
          ) : null}
          {canAssign ? (
            <Tooltip title={t('queue.assign')}>
              <span>
                <IconButton
                  size="small"
                  disabled={isBusy || !isOrderOpen}
                  onClick={() => onAssign(item)}
                >
                  <IconUserPlus size={17} stroke={1.7} />
                </IconButton>
              </span>
            </Tooltip>
          ) : null}
          {canTransfer ? (
            <Tooltip title={t('queue.transferShort')}>
              <span>
                <IconButton
                  size="small"
                  disabled={isBusy || !isOrderOpen}
                  onClick={() => onTransfer(item)}
                >
                  <IconArrowsExchange size={17} stroke={1.7} />
                </IconButton>
              </span>
            </Tooltip>
          ) : null}
          <Tooltip title={t('queue.passShort')}>
            <span>
              <IconButton
                size="small"
                color="error"
                disabled={isBusy || !canAct || !isOrderOpen}
                onClick={() => onPass(item)}
              >
                <IconX size={17} stroke={1.7} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </TableCell>
    </TableRow>
  );
}
