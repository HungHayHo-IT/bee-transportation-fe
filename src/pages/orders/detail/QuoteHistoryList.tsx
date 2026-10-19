import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  Button,
  Collapse,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { IconHistory } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { fetchQuoteHistory } from '@/services/quoteService';
import { formatCurrencyVnd, formatDate, formatDateTime } from '@/utils/formatters';
import type { QuoteHistoryEntry } from '@/types/quote';
import { describeError } from '@/services/apiClient';

export interface QuoteHistoryListProps {
  orderId: number;
  departmentId: number;
  /** Version 1 has superseded nothing, so there is nothing to offer. */
  currentVersion: number;
}

/**
 * The versions a department has already replaced. Sealed quoting still applies:
 * the endpoint answers a department only for itself, and the owning sale and the
 * company-level roles for everyone.
 */
export function QuoteHistoryList({
  orderId,
  departmentId,
  currentVersion,
}: QuoteHistoryListProps): ReactNode {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [entries, setEntries] = useState<QuoteHistoryEntry[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (currentVersion < 2) return null;

  const toggle = (): void => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    setIsOpen(true);
    if (entries !== null || isLoading) return;
    setIsLoading(true);
    fetchQuoteHistory(orderId, departmentId)
      .then((history) => {
        setEntries(history.entries);
        setErrorMessage(null);
      })
      .catch((error: unknown) => setErrorMessage(describeError(error)))
      .finally(() => setIsLoading(false));
  };

  return (
    <Stack spacing={1}>
      <Stack direction="row">
        <Button size="small" color="inherit" startIcon={<IconHistory size={17} />} onClick={toggle}>
          {isOpen
            ? t('quotes.history.hide')
            : t('quotes.history.show', { count: currentVersion - 1 })}
        </Button>
      </Stack>

      <Collapse in={isOpen} unmountOnExit>
        {isLoading ? <LinearProgress /> : null}
        {errorMessage === null ? null : <Alert severity="error">{errorMessage}</Alert>}
        {entries !== null && entries.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('quotes.history.empty')}
          </Typography>
        ) : null}
        {entries !== null && entries.length > 0 ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('quotes.history.version')}</TableCell>
                <TableCell align="right">{t('quotes.form.amount')}</TableCell>
                <TableCell>{t('orders.detail.scopeNote')}</TableCell>
                <TableCell>{t('orders.detail.leadTime')}</TableCell>
                <TableCell>{t('orders.detail.validUntil')}</TableCell>
                <TableCell>{t('quotes.history.sentBy')}</TableCell>
                <TableCell>{t('quotes.history.sentAt')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.version}>
                  <TableCell>{`v${String(entry.version)}`}</TableCell>
                  <TableCell align="right">{formatCurrencyVnd(entry.amount)}</TableCell>
                  <TableCell>{entry.scopeNote ?? '—'}</TableCell>
                  <TableCell>{entry.leadTime ?? '—'}</TableCell>
                  <TableCell>{formatDate(entry.validUntil)}</TableCell>
                  <TableCell>{entry.sentByName ?? '—'}</TableCell>
                  <TableCell>{formatDateTime(entry.at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </Collapse>
    </Stack>
  );
}
