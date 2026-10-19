import type { ReactNode } from 'react';
import { Box, Chip, Divider, Link as MuiLink, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SectionCard } from '@/components/SectionCard';
import { StatusChip } from '@/components/StatusChip';
import { buildCustomerDetailPath } from '@/routes/routePaths';
import { formatCurrencyVnd, formatDateTime } from '@/utils/formatters';
import type { OrderDetail } from '@/types/order';
import { doanTuyen } from '../orderRouteValues';

export interface OrderSummaryHeaderProps {
  order: OrderDetail;
  /**
   * False for a cross-border service, whose orders have no domestic destination.
   * The arrow is then dropped rather than pointed at an em dash: "Lạng Sơn → —"
   * reads as a missing value, when in fact there is nothing to miss.
   */
  hasDomesticOrigin?: boolean;
  hasDomesticDestination?: boolean;
  children?: ReactNode;
}

function MetaField({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <Box sx={{ minWidth: 150 }}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {value}
      </Typography>
    </Box>
  );
}

/**
 * The header answers the three questions someone opens an order with: where is
 * it, where does it go, and what is it worth. The value sits on its own on the
 * right in the largest type on the card — everything else is context for it.
 */
export function OrderSummaryHeader({
  order,
  hasDomesticOrigin = true,
  hasDomesticDestination = true,
  children,
}: OrderSummaryHeaderProps): ReactNode {
  const { t } = useTranslation();
  /* Đầu nằm ngoài nước không có tỉnh/thành để hiện, nhưng vẫn có địa chỉ —
     một đơn xuất khẩu vẫn đi tới một nơi có tên. Dòng tuyến luôn đủ hai vế. */
  const route = [
    doanTuyen(hasDomesticOrigin, order.originProvince, order.originAddress),
    doanTuyen(hasDomesticDestination, order.destinationProvince, order.destinationAddress),
  ].join(' → ');

  return (
    <SectionCard>
      <Stack spacing={2.5}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={2}
        >
          <Stack spacing={1} sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <StatusChip status={order.status} />
              {/* Đơn vẫn "Đã chốt" sau mốc cuối; completedAt mới nói việc đã xong. */}
              {order.completedAt === null ? null : (
                <Chip size="small" color="success" label={t('orders.detail.completedChip')} />
              )}
              <Chip size="small" variant="outlined" label={order.serviceCode} />
              <Typography variant="body2" color="text.secondary">
                {order.serviceName}
              </Typography>
            </Stack>
            <Typography variant="h4">{route}</Typography>
            <Typography variant="body2" color="text.secondary">
              {order.customerId === null || order.customerName === null ? (
                (order.customerName ?? t('orders.detail.noCustomer'))
              ) : (
                <MuiLink
                  component={Link}
                  to={buildCustomerDetailPath(order.customerId)}
                  color="inherit"
                  underline="none"
                >
                  {order.customerName}
                </MuiLink>
              )}{' '}
              · {t('orders.list.sale')}: {order.saleName ?? t('orders.list.noSale')}
            </Typography>
          </Stack>

          <Stack
            spacing={0.25}
            alignItems={{ xs: 'flex-start', md: 'flex-end' }}
            sx={{ flexShrink: 0 }}
          >
            <Typography variant="overline" color="text.secondary">
              {t('orders.detail.finalAmount')}
            </Typography>
            <Typography
              variant="h2"
              color={order.finalAmount === null ? 'text.secondary' : 'primary.dark'}
              sx={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatCurrencyVnd(order.finalAmount)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {order.closedAt === null
                ? t('orders.detail.notClosedYet')
                : t('orders.detail.closedOn', { date: formatDateTime(order.closedAt) })}
            </Typography>
          </Stack>
        </Stack>

        <Divider />

        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={4}>
          <MetaField
            label={t('orders.list.department')}
            value={order.departmentName ?? t('orders.detail.notDecided')}
          />
          <MetaField
            label={t('orders.detail.latestMilestone')}
            value={order.latestMilestone ?? '—'}
          />
          <MetaField label={t('unrouted.createdAt')} value={formatDateTime(order.createdAt)} />
          <MetaField label={t('orders.detail.updatedAt')} value={formatDateTime(order.updatedAt)} />
        </Stack>

        {children}
      </Stack>
    </SectionCard>
  );
}
