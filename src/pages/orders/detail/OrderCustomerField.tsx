import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { Link as MuiLink, Stack } from '@mui/material';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { fetchCustomerDetail } from '@/services/customerService';
import { buildCustomerDetailPath } from '@/routes/routePaths';
import type { CustomerDetail } from '@/types/customer';
import { DetailField } from './DetailField';
import { customerDisplayName } from '@/utils/customerName';

/** `tel:` refuses spaces and separators; the label keeps the readable form. */
function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/gu, '')}`;
}

export interface OrderCustomerFieldProps {
  customerId: number | null;
  customerName: string | null;
}

/**
 * Who the customer is and how to ring them, in one cell: the name over the phone
 * number. The order payload carries only `customerName`, so the number is read
 * from the profile behind `customerId`; the rest of the profile stays one click
 * away rather than crowding the top of the order.
 *
 * Two cases are ordinary, not failures, and both fall back to the name the order
 * already holds: an order created without a customer id, and a profile the caller
 * may not read (the backend answers 404 for a row out of scope). Neither may take
 * the tab down, so the lookup never surfaces an error of its own.
 */
export function OrderCustomerField({
  customerId,
  customerName,
}: OrderCustomerFieldProps): ReactNode {
  const { t } = useTranslation();

  const load = useCallback(
    (): Promise<CustomerDetail | null> =>
      customerId === null ? Promise.resolve(null) : fetchCustomerDetail(customerId),
    [customerId],
  );
  const resource = useAsyncResource<CustomerDetail | null>(load, [load]);
  const customer = resource.data;

  const name = customerName ?? customerDisplayName(customer) ?? null;
  const phone = customer?.phone ?? null;

  return (
    <DetailField
      // "Người liên hệ" chứ không phải "Tên công ty": giá trị ở đây là
      // customerDisplayName — tên công ty NẾU CÓ, không thì tên người liên hệ.
      // Từ khi khách đến từ form website (chỉ để lại tên người) và sau đợt dọn
      // dữ liệu 024, phần lớn hồ sơ không có tên công ty, nên nhãn cũ đứng trên
      // một cái tên người là nói sai.
      label={t('customers.contactName')}
      value={
        <Stack spacing={0.25}>
          {name === null ? (
            '—'
          ) : customerId === null ? (
            name
          ) : (
            <MuiLink component={Link} to={buildCustomerDetailPath(customerId)} underline="none">
              {name}
            </MuiLink>
          )}
          {phone === null ? null : (
            <MuiLink href={telHref(phone)} underline="none">
              {phone}
            </MuiLink>
          )}
        </Stack>
      }
    />
  );
}
