import { useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/EmptyState';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { fetchReferencePrices } from '@/services/quoteService';
import { formatCurrencyVnd, formatDate } from '@/utils/formatters';
import type { ReferencePrice } from '@/types/quote';

export interface ReferencePriceTableProps {
  orderId: number;
}

function describeRoute(reference: ReferencePrice): string {
  const origin = reference.originProvince ?? '—';
  const destination = reference.destinationProvince ?? '—';
  return `${origin} → ${destination}`;
}

/** The backend matches on all four figures, so the table shows all four. */
function describeSize(reference: ReferencePrice, labels: SizeLabels): string {
  const parts: string[] = [];
  if (reference.weightKg !== null) parts.push(`${String(reference.weightKg)} ${labels.weight}`);
  if (reference.volumeCbm !== null) parts.push(`${String(reference.volumeCbm)} ${labels.volume}`);
  if (reference.packageCount !== null) {
    parts.push(`${String(reference.packageCount)} ${labels.packages}`);
  }
  if (reference.containerType !== null) parts.push(labels.container(reference.containerType));
  return parts.length === 0 ? '—' : parts.join(' · ');
}

interface SizeLabels {
  weight: string;
  volume: string;
  packages: string;
  container: (type: string) => string;
}

/** Historical support for the quoting department, never a suggested price. */
export function ReferencePriceTable({ orderId }: ReferencePriceTableProps): ReactNode {
  const { t } = useTranslation();

  const load = useCallback(
    (): Promise<ReferencePrice[]> => fetchReferencePrices(orderId),
    [orderId],
  );
  const resource = useAsyncResource<ReferencePrice[]>(load, [load]);
  const references = resource.data ?? [];
  const sizeLabels: SizeLabels = {
    weight: t('quotes.unit.weight'),
    volume: t('quotes.unit.volume'),
    packages: t('quotes.reference.packages'),
    container: (type) => t('quotes.reference.container', { type }),
  };

  if (resource.isFirstLoad) return <LinearProgress />;

  if (resource.errorMessage !== null) {
    return <Alert severity="error">{resource.errorMessage}</Alert>;
  }

  if (references.length === 0) {
    return (
      <EmptyState
        title={t('quotes.reference.empty')}
        description={t('quotes.reference.emptyHint')}
      />
    );
  }

  return (
    <Stack spacing={1}>
      <Typography variant="caption" color="text.secondary">
        {t('quotes.reference.criteria')}
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('queue.code')}</TableCell>
            <TableCell>{t('orders.detail.closedAt')}</TableCell>
            <TableCell>{t('unrouted.route')}</TableCell>
            <TableCell>{t('quotes.reference.size')}</TableCell>
            <TableCell align="right">{t('orders.detail.finalAmount')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {references.map((reference) => (
            <TableRow key={reference.code} hover>
              <TableCell>{reference.code}</TableCell>
              <TableCell>{formatDate(reference.closedAt)}</TableCell>
              <TableCell>{describeRoute(reference)}</TableCell>
              <TableCell>{describeSize(reference, sizeLabels)}</TableCell>
              <TableCell align="right">{formatCurrencyVnd(reference.finalAmount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
  );
}
