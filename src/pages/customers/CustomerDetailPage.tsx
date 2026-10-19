import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { IconPencil } from '@tabler/icons-react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useDisclosure } from '@/hooks/useDisclosure';
import { usePageLevels } from '@/hooks/usePageLevels';
import { fetchCustomerDetail, updateCustomer } from '@/services/customerService';
import { formatCurrencyVnd } from '@/utils/formatters';
import { RoutePath } from '@/routes/routePaths';
import type { CustomerDetail, CustomerPayload } from '@/types/customer';
import { describeError } from '@/services/apiClient';
import { CustomerFormDialog } from './CustomerFormDialog';
import { customerDisplayName } from '@/utils/customerName';

function DetailRow({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <Stack direction="row" spacing={2}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 160 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Stack>
  );
}

export function CustomerDetailPage(): ReactNode {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const levels = usePageLevels();
  /* `edit` hay `full` đều sửa được — chỉ `view` là không. Đọc mức quyền thật
     thay vì đoán theo vai: lần sau ai sửa ma trận thì giao diện đi theo. */
  const suaDuoc = levels?.customerDetail === 'edit' || levels?.customerDetail === 'full';
  const { customerId } = useParams();
  const formDialog = useDisclosure();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const numericId = Number(customerId);
  const load = useCallback(
    (): Promise<CustomerDetail> => fetchCustomerDetail(numericId),
    [numericId],
  );
  const resource = useAsyncResource<CustomerDetail>(load, [numericId]);
  const customer = resource.data;

  const handleUpdate = async (payload: CustomerPayload): Promise<void> => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      await updateCustomer(numericId, payload);
      formDialog.close();
      resource.reload();
      enqueueSnackbar(t('common.states.saved'), { variant: 'success' });
    } catch (error) {
      setFormError(describeError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageContainer
      title={customerDisplayName(customer) ?? t('nav.customers')}
      description={t('customers.detailDescription')}
      backTo={RoutePath.Customers}
      action={
        /* Gác bằng MỨC QUYỀN THẬT của trang, không bằng CreateOrder.
           CreateOrder là [admin, sale] nên Trưởng phòng bị loại, trong khi ma
           trận cho họ `full` trên trang khách hàng — nút xoá hiện mà nút sửa
           thì không, hai nút cạnh nhau đọc hai nguồn khác nhau. */
        suaDuoc && customer !== null ? (
          <Button
            variant="contained"
            startIcon={<IconPencil size={18} />}
            onClick={() => {
              setFormError(null);
              formDialog.open();
            }}
          >
            {t('common.actions.edit')}
          </Button>
        ) : null
      }
    >
      <SectionCard title={t('customers.profile')}>
        {customer === null ? (
          <Typography variant="body2" color="text.secondary">
            {resource.errorMessage ?? t('common.states.loading')}
          </Typography>
        ) : (
          <Stack spacing={1.25}>
            <DetailRow label={t('customers.code')} value={customer.code ?? '—'} />
            <DetailRow label={t('customers.contactName')} value={customer.contactName ?? '—'} />
            <DetailRow label={t('customers.companyName')} value={customer.companyName ?? '—'} />
            <DetailRow label={t('customers.taxCode')} value={customer.taxCode ?? '—'} />
            <DetailRow label={t('customers.phone')} value={customer.phone ?? '—'} />
            <DetailRow label={t('customers.email')} value={customer.email ?? '—'} />
            <DetailRow label={t('customers.note')} value={customer.note ?? '—'} />
          </Stack>
        )}
      </SectionCard>

      {customer === null ? null : (
        <Box sx={{ mt: 2 }}>
          <SectionCard title={t('customers.summary')}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t('customers.orderCount')}
                </Typography>
                <Typography variant="h5">{customer.orderCount}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t('customers.totalRevenue')}
                </Typography>
                <Typography variant="h5">{formatCurrencyVnd(customer.totalRevenue)}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('customers.revenueScopeHint')}
                </Typography>
              </Box>
            </Stack>
          </SectionCard>
        </Box>
      )}

      <CustomerFormDialog
        isOpen={formDialog.isOpen}
        customer={customer}
        isSubmitting={isSubmitting}
        errorMessage={formError}
        onSubmit={(payload) => void handleUpdate(payload)}
        onClose={formDialog.close}
      />
    </PageContainer>
  );
}
