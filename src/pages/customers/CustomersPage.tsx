import { useCallback, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { ReactNode } from 'react';
import {
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Stack,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import { IconEye, IconPencil, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { DataTableShell } from '@/components/DataTableShell';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useDisclosure } from '@/hooks/useDisclosure';
import { usePageLevels } from '@/hooks/usePageLevels';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@/constants/pagination';
import {
  createCustomer,
  deleteCustomer,
  fetchCustomers,
  findExistingCustomerId,
  updateCustomer,
} from '@/services/customerService';
import { buildCustomerDetailPath } from '@/routes/routePaths';
import type { Customer, CustomerPayload } from '@/types/customer';
import type { Page } from '@/types/pagination';
import { describeError } from '@/services/apiClient';
import { CustomerFormDialog } from './CustomerFormDialog';

export function CustomersPage(): ReactNode {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const levels = usePageLevels();
  const formDialog = useDisclosure();

  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dangSua, setDangSua] = useState<Customer | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(searchTerm);

  const load = useCallback(
    (): Promise<Page<Customer>> =>
      fetchCustomers({
        page,
        limit: DEFAULT_PAGE_SIZE,
        // 'all' chứ không bỏ trống: backend bỏ trống nghĩa là CHỈ hồ sơ đã
        // duyệt. Từ migration 052 mọi hồ sơ đều 'approved' nên hai cách cho
        // cùng kết quả, nhưng 'all' nói đúng ý màn này.
        status: 'all',
        ...(debouncedSearch.trim() === '' ? {} : { q: debouncedSearch.trim() }),
      }),
    [debouncedSearch, page],
  );
  const resource = useAsyncResource<Page<Customer>>(load, [load]);
  const customers = resource.data?.items ?? [];
  const total = resource.data?.total ?? 0;

  const changeSearch = (value: string): void => {
    setSearchTerm(value);
    setPage(DEFAULT_PAGE);
  };

  const handleCreate = async (payload: CustomerPayload): Promise<void> => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      await createCustomer(payload);
      formDialog.close();
      resource.reload();
      enqueueSnackbar(t('common.states.saved'), { variant: 'success' });
    } catch (error) {
      // The name already belongs to a profile: send the user to it rather than
      // letting them try again and split one customer's history in two.
      const existingId = findExistingCustomerId(error);
      if (existingId !== undefined) {
        formDialog.close();
        enqueueSnackbar(describeError(error), { variant: 'warning' });
        navigate(buildCustomerDetailPath(existingId));
        return;
      }
      setFormError(describeError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  /* Xoá chỉ hiện với bậc `full` của ma trận (Admin, Trưởng phòng). Sale ở bậc
     `edit` nên backend chặn DELETE ngay ở guard — ẩn nút đi để không mời người
     ta bấm một thứ chắc chắn bị từ chối. */
  /* POST /customers nam duoi @Trang('customers') cua controller, khong phai
     'customerDetail'. Bac 'view' bi chan 403 — nhan vien va lanh dao chi xem,
     nen nut Tao khach phai bien mat chu khong phai bam vao roi bao loi. */
  const taoDuoc = levels?.customers === 'edit' || levels?.customers === 'full';
  const xoaDuoc = levels?.customerDetail === 'full';
  /* Sửa thì `edit` hay `full` đều được. Đọc CÙNG MỘT nguồn với nút xoá: hai nút
     cạnh nhau mà đọc hai nguồn khác nhau thì một vai thấy nút này không thấy
     nút kia, và không ai hiểu vì sao. */
  const suaDuoc = levels?.customerDetail === 'edit' || xoaDuoc;

  const luuSua = async (payload: CustomerPayload): Promise<void> => {
    if (dangSua === null) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      await updateCustomer(dangSua.id, payload);
      setDangSua(null);
      resource.reload();
      enqueueSnackbar(t('customers.saved'), { variant: 'success' });
    } catch (error) {
      setFormError(describeError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  /* Hỏi lại bằng hộp thoại của chính ứng dụng, không phải `window.confirm`:
     hộp của trình duyệt mang tên miền vercel.app, nút tiếng Anh lẫn tiếng Việt,
     và khoá cả tab cho tới khi bấm xong. */
  const [hoiXoa, setHoiXoa] = useState<Customer | null>(null);

  const xuLyXoa = async (khach: Customer): Promise<void> => {
    try {
      await deleteCustomer(khach.id);
      resource.reload();
      enqueueSnackbar(t('customers.deleted'), { variant: 'success' });
    } catch (error) {
      // 409 nói rõ khách có bao nhiêu đơn — hiện nguyên câu đó.
      enqueueSnackbar(describeError(error), { variant: 'error' });
    }
  };

  return (
    <PageContainer
      title={t('nav.customers')}
      description={t('customers.description')}
      // Tạo xong dùng được ngay — từ migration 052 không còn bước duyệt.
      action={
        !taoDuoc ? null : (
          <Button
            variant="contained"
            startIcon={<IconPlus size={18} />}
            onClick={() => {
              setFormError(null);
              formDialog.open();
            }}
          >
            {t('customers.create')}
          </Button>
        )
      }
    >
      <SectionCard>
        <TextField
          label={t('common.actions.search')}
          value={searchTerm}
          onChange={(event) => changeSearch(event.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch size={17} stroke={1.7} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 320 }}
        />
      </SectionCard>

      <SectionCard disableContentPadding>
        <DataTableShell
          isFirstLoad={resource.isFirstLoad}
          isRefetching={resource.isRefetching}
          errorMessage={resource.errorMessage}
          onDismissError={resource.clearError}
          isEmpty={customers.length === 0}
          page={page}
          pageCount={Math.ceil(total / DEFAULT_PAGE_SIZE)}
          totalRows={total}
          onPageChange={setPage}
          minWidth={780}
          head={
            <TableRow>
              {/* Người liên hệ đứng trước: khách đến từ form website chỉ có tên
                  người, cột tên công ty của họ trống. Để tên công ty dẫn đầu thì
                  bảng mở ra là một dãy gạch ngang, phải liếc sang cột thứ hai
                  mới biết đang nhìn ai. */}
              <TableCell>{t('customers.code')}</TableCell>
              <TableCell>{t('customers.contactName')}</TableCell>
              <TableCell>{t('customers.companyName')}</TableCell>
              <TableCell>{t('customers.taxCode')}</TableCell>
              <TableCell>{t('customers.phone')}</TableCell>
              <TableCell>{t('customers.email')}</TableCell>
              <TableCell align="right">{t('common.actions.actions')}</TableCell>
            </TableRow>
          }
        >
          {customers.map((customer) => (
            <TableRow
              key={customer.id}
              hover
              sx={{ cursor: 'pointer' }}
              onClick={() => navigate(buildCustomerDetailPath(customer.id))}
            >
              <TableCell>{customer.code ?? '—'}</TableCell>
              <TableCell>{customer.contactName ?? '—'}</TableCell>
              <TableCell>{customer.companyName ?? '—'}</TableCell>
              {/* Không xuống dòng giữa chừng: mã số thuế đọc theo cụm, bẻ đôi
                  một dãy số là người đọc phải ghép lại bằng mắt. */}
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{customer.taxCode ?? '—'}</TableCell>
              <TableCell>{customer.phone ?? '—'}</TableCell>
              <TableCell>
                {/* Nhãn đứng NGAY CẠNH email vì chính email là căn cứ nhận ra:
                    đặt ở cột khác thì người đọc không biết nó dựa vào đâu. */}
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>{customer.email ?? '—'}</span>
                  {customer.laBeeLogs ? (
                    <Tooltip title={t('customers.beeLogsHint')}>
                      <Chip size="small" color="info" label={t('customers.beeLogs')} />
                    </Tooltip>
                  ) : null}
                </Stack>
              </TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                  <Tooltip title={t('common.actions.viewDetail')}>
                    <IconButton size="small">
                      <IconEye size={17} stroke={1.7} />
                    </IconButton>
                  </Tooltip>
                  {!suaDuoc ? null : (
                    <Tooltip title={t('common.actions.edit')}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          // Chặn nổi lên hàng, nếu không thì vừa mở hộp sửa vừa
                          // nhảy sang trang chi tiết.
                          e.stopPropagation();
                          setFormError(null);
                          setDangSua(customer);
                        }}
                      >
                        <IconPencil size={17} stroke={1.7} />
                      </IconButton>
                    </Tooltip>
                  )}
                  {!xoaDuoc ? null : (
                    <Tooltip title={t('common.actions.delete')}>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          // Chặn nổi lên hàng, nếu không thì vừa xoá vừa nhảy
                          // sang trang chi tiết của khách vừa xoá.
                          e.stopPropagation();
                          setHoiXoa(customer);
                        }}
                      >
                        <IconTrash size={17} stroke={1.7} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </DataTableShell>
      </SectionCard>

      <CustomerFormDialog
        isOpen={formDialog.isOpen}
        customer={null}
        isSubmitting={isSubmitting}
        errorMessage={formError}
        onSubmit={(payload) => void handleCreate(payload)}
        onClose={formDialog.close}
      />

      <CustomerFormDialog
        isOpen={dangSua !== null}
        customer={dangSua}
        isSubmitting={isSubmitting}
        errorMessage={formError}
        onSubmit={(payload) => void luuSua(payload)}
        onClose={() => setDangSua(null)}
      />
      <ConfirmDialog
        isOpen={hoiXoa !== null}
        title={t('common.actions.delete')}
        description={hoiXoa === null ? undefined : t('customers.deleteConfirm', {
          name: hoiXoa.companyName ?? hoiXoa.contactName ?? '',
        })}
        isDestructive
        isSubmitting={isSubmitting}
        onConfirm={() => {
          const k = hoiXoa;
          setHoiXoa(null);
          if (k !== null) void xuLyXoa(k);
        }}
        onClose={() => setHoiXoa(null)}
      />
    </PageContainer>
  );
}
