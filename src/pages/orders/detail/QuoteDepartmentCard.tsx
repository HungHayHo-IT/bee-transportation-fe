import type { ReactNode } from 'react';
import { Box, Button, Chip, Divider, Stack, Typography } from '@mui/material';
import { IconTrophy } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { DEPARTMENT_STATE_LABEL_KEY, DepartmentState } from '@/constants/orderStatus';
import { formatCurrencyVnd, formatDate, formatRelativeTime } from '@/utils/formatters';
import type { OrderDepartment } from '@/types/order';
import { QuoteHistoryList } from './QuoteHistoryList';

export interface QuoteDepartmentCardProps {
  orderId: number;
  department: OrderDepartment;
  isLowestAmount: boolean;
  canSelect: boolean;
  onSelect: (department: OrderDepartment) => void;
}

function DetailLine({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="caption" textAlign="right">
        {value}
      </Typography>
    </Stack>
  );
}

export function QuoteDepartmentCard({
  orderId,
  department,
  isLowestAmount,
  canSelect,
  onSelect,
}: QuoteDepartmentCardProps): ReactNode {
  const { t, i18n } = useTranslation();

  const hasPassed = department.state === DepartmentState.Passed;
  const hasQuote = department.quoteVersion > 0;
  const hasWon = department.state === DepartmentState.Won;

  return (
    <Box
      sx={{
        flex: '1 1 260px',
        minWidth: 260,
        maxWidth: 360,
        borderRadius: 2,
        border: 1,
        borderColor: hasWon || isLowestAmount ? 'primary.main' : 'divider',
        opacity: hasPassed ? 0.6 : 1,
        p: 2,
      }}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Typography variant="subtitle2">{department.departmentName}</Typography>
          <Chip
            size="small"
            variant="outlined"
            color={hasWon ? 'success' : 'default'}
            label={t(DEPARTMENT_STATE_LABEL_KEY[department.state])}
          />
        </Stack>

        {hasQuote ? (
          <Stack spacing={0.5}>
            <Typography variant="h6" color={isLowestAmount ? 'primary.main' : 'text.primary'}>
              {formatCurrencyVnd(department.amount)}
            </Typography>
            <Stack direction="row" spacing={0.5}>
              <Chip size="small" label={`v${department.quoteVersion}`} />
              {isLowestAmount ? (
                <Chip size="small" color="primary" label={t('quotes.compare.lowest')} />
              ) : null}
            </Stack>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {hasPassed ? t('quotes.compare.passed') : t('quotes.compare.awaiting')}
          </Typography>
        )}

        {hasPassed && department.passReason !== null ? (
          <Typography variant="caption" color="warning.main">
            {department.passReason}
          </Typography>
        ) : null}

        <Divider />

        <Stack spacing={0.5}>
          <DetailLine
            label={t('queue.assignee')}
            value={department.assigneeName ?? '—'}
          />
          <DetailLine
            label={t('orders.detail.scopeNote')}
            value={department.scopeNote ?? '—'}
          />
          <DetailLine label={t('orders.detail.leadTime')} value={department.leadTime ?? '—'} />
          <DetailLine
            label={t('orders.detail.validUntil')}
            value={formatDate(department.validUntil)}
          />
          <DetailLine
            label={t('quotes.compare.lastQuotedAt')}
            value={formatRelativeTime(department.lastQuotedAt, i18n.language)}
          />
        </Stack>

        <QuoteHistoryList
          orderId={orderId}
          departmentId={department.departmentId}
          currentVersion={department.quoteVersion}
        />

        {canSelect && hasQuote && !hasWon ? (
          <Button
            variant="outlined"
            size="small"
            startIcon={<IconTrophy size={17} />}
            onClick={() => onSelect(department)}
          >
            {t('quotes.compare.select')}
          </Button>
        ) : null}
      </Stack>
    </Box>
  );
}
