import type { ReactNode } from 'react';
import { Alert, Button, Stack } from '@mui/material';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SectionCard } from '@/components/SectionCard';
import { OrderStatus } from '@/constants/orderStatus';
import { buildOrderDetailPath } from '@/routes/routePaths';
import type { OrderSummary } from '@/types/order';

export interface CreateOrderSuccessPanelProps {
  order: OrderSummary;
  uploadWarning: string | null;
  onCreateAnother: () => void;
}

export function CreateOrderSuccessPanel({
  order,
  uploadWarning,
  onCreateAnother,
}: CreateOrderSuccessPanelProps): ReactNode {
  const { t } = useTranslation();

  // `departmentName` is the winning department and stays null until the order is
  // closed, so it says nothing about distribution. Only the status does: an order
  // with no responsible department stays `new`.
  const isUnrouted = order.status === OrderStatus.New;

  return (
    <SectionCard>
      <Stack spacing={2} alignItems="flex-start">
        <Alert severity="success" sx={{ width: '100%' }}>
          {t('orders.create.success', { code: order.code })}
        </Alert>

        {uploadWarning === null ? null : (
          <Alert severity="warning" sx={{ width: '100%' }}>
            {uploadWarning}
          </Alert>
        )}

        <Alert severity={isUnrouted ? 'warning' : 'info'} sx={{ width: '100%' }}>
          {isUnrouted ? t('orders.create.unroutedHint') : t('orders.create.distributedHint')}
        </Alert>

        <Stack direction="row" spacing={1}>
          <Button variant="contained" component={Link} to={buildOrderDetailPath(order.id)}>
            {t('orders.create.openOrder')}
          </Button>
          <Button color="inherit" onClick={onCreateAnother}>
            {t('orders.create.createAnother')}
          </Button>
        </Stack>
      </Stack>
    </SectionCard>
  );
}
