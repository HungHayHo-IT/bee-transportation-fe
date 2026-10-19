import { useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import { Box, Chip, Divider, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ORDER_STATUS_LABEL_KEY } from '@/constants/orderStatus';
import type { OrderStatus } from '@/constants/orderStatus';
import { ORDER_STATUS_TONE } from '@/constants/orderStatusTone';
import { KANBAN_COLUMN_LIMIT } from '@/constants/pagination';
import type { OrderSummary } from '@/types/order';
import { KanbanCard } from './KanbanCard';
import { resolveKanbanAction } from './kanbanActions';

export interface KanbanColumnProps {
  status: OrderStatus;
  cards: OrderSummary[];
  /** Whether this user (sale/admin) may act on a card at all — makes cards draggable. */
  canAct: boolean;
  /** The status of the card being dragged, so the column knows if it will accept it. */
  draggedFrom: OrderStatus | null;
  onOpen: (orderId: number) => void;
  onCardDragStart: (order: OrderSummary) => void;
  onCardDragEnd: () => void;
  onDropCard: (targetStatus: OrderStatus) => void;
}

export function KanbanColumn({
  status,
  cards,
  canAct,
  draggedFrom,
  onOpen,
  onCardDragStart,
  onCardDragEnd,
  onDropCard,
}: KanbanColumnProps): ReactNode {
  const { t } = useTranslation();
  const [isOver, setIsOver] = useState(false);

  // The column lights up only for a drag it would actually accept, so the board
  // tells the truth about where a card can go before it is dropped.
  const accepts = draggedFrom !== null && resolveKanbanAction(draggedFrom, status) !== null;

  const handleDragOver = (event: DragEvent): void => {
    if (!accepts) return;
    event.preventDefault();
    setIsOver(true);
  };

  const tone = ORDER_STATUS_TONE[status];

  return (
    <Box
      onDragOver={handleDragOver}
      onDragLeave={() => setIsOver(false)}
      onDrop={() => {
        setIsOver(false);
        onDropCard(status);
      }}
      sx={{
        minWidth: 288,
        maxWidth: 288,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        p: 1,
        // A neutral column surface separates the lanes and lets the white cards
        // sit forward; the status colour reads from the top accent, not the fill.
        bgcolor: (theme) => theme.palette.grey[50],
        border: '1px solid',
        borderColor: accepts ? tone.color : 'divider',
        borderTop: `3px solid ${tone.color}`,
        transition: 'background-color 120ms, border-color 120ms',
        ...(isOver ? { bgcolor: tone.background } : {}),
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 0.5, pb: 1 }}>
        <Typography variant="subtitle2" sx={{ color: tone.color }}>
          {t(ORDER_STATUS_LABEL_KEY[status])}
        </Typography>
        <Chip
          size="small"
          label={cards.length}
          sx={{ color: tone.color, backgroundColor: tone.background, fontWeight: 600 }}
        />
        {cards.length >= KANBAN_COLUMN_LIMIT ? (
          <Chip size="small" color="warning" label={t('orders.kanban.capped')} />
        ) : null}
      </Stack>
      <Divider sx={{ mb: 1 }} />

      <Stack spacing={1} sx={{ flex: 1 }}>
        {cards.map((order) => (
          <KanbanCard
            key={order.id}
            order={order}
            isDraggable={canAct}
            onOpen={() => onOpen(order.id)}
            onDragStart={() => onCardDragStart(order)}
            onDragEnd={onCardDragEnd}
          />
        ))}
        {accepts && cards.length === 0 ? (
          <Box
            sx={{
              borderRadius: 1.5,
              border: '1px dashed',
              borderColor: tone.color,
              color: tone.color,
              textAlign: 'center',
              py: 2.5,
              px: 1,
              fontSize: 13,
            }}
          >
            {t('orders.kanban.dropHere')}
          </Box>
        ) : null}
      </Stack>
    </Box>
  );
}
