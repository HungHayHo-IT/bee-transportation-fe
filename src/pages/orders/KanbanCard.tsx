import type { ReactNode } from 'react';
import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { IconGripVertical } from '@tabler/icons-react';
import { formatCompactCurrencyVnd, formatDate } from '@/utils/formatters';
import type { OrderSummary } from '@/types/order';

export interface KanbanCardProps {
  order: OrderSummary;
  /** Only sale/admin get a draggable card; everyone can still click through. */
  isDraggable: boolean;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export function KanbanCard({
  order,
  isDraggable,
  onOpen,
  onDragStart,
  onDragEnd,
}: KanbanCardProps): ReactNode {
  return (
    <Card
      draggable={isDraggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      sx={{
        cursor: isDraggable ? 'grab' : 'pointer',
        transition: 'box-shadow 120ms, transform 120ms',
        '&:hover': { boxShadow: 4 },
        '&:active': isDraggable ? { cursor: 'grabbing' } : undefined,
      }}
    >
      <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          {isDraggable ? (
            <Box sx={{ display: 'flex', color: 'text.disabled', flexShrink: 0, ml: -0.5 }}>
              <IconGripVertical size={16} />
            </Box>
          ) : null}
          <Typography variant="body2" fontWeight={700} noWrap>
            {order.code}
          </Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary" display="block">
          {order.customerName ?? '—'}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          {order.originProvince ?? '—'} → {order.destinationProvince ?? '—'}
        </Typography>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
          <Chip size="small" variant="outlined" label={order.serviceCode} />
          <Typography variant="caption" color="text.secondary">
            {order.finalAmount === null
              ? formatDate(order.createdAt)
              : formatCompactCurrencyVnd(order.finalAmount)}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
