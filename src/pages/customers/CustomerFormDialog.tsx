import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { EmailField } from '@/components/form/EmailField';
import { PhoneField } from '@/components/form/PhoneField';
import type { Customer, CustomerPayload } from '@/types/customer';

export interface CustomerFormDialogProps {
  isOpen: boolean;
  customer: Customer | null;
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (payload: CustomerPayload) => void;
  onClose: () => void;
}

interface FormValues {
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  note: string;
  taxCode: string;
  businessLicence: string;
}

const EMPTY_VALUES: FormValues = {
  companyName: '',
  contactName: '',
  phone: '',
  email: '',
  note: '',
  taxCode: '',
  businessLicence: '',
};

function toPayload(values: FormValues): CustomerPayload {
  const trimmed = {
    contactName: values.contactName.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
    note: values.note.trim(),
    taxCode: values.taxCode.trim(),
    businessLicence: values.businessLicence.trim(),
  };
  return {
    // Bỏ hẳn khi trống thay vì gửi chuỗi rỗng: hồ sơ chưa có tên công ty phải
    // là NULL trong DB, không phải một cái tên rỗng trông như đã điền rồi.
    ...(values.companyName.trim() === '' ? {} : { companyName: values.companyName.trim() }),
    ...(trimmed.contactName === '' ? {} : { contactName: trimmed.contactName }),
    ...(trimmed.phone === '' ? {} : { phone: trimmed.phone }),
    ...(trimmed.email === '' ? {} : { email: trimmed.email }),
    ...(trimmed.note === '' ? {} : { note: trimmed.note }),
    ...(trimmed.taxCode === '' ? {} : { taxCode: trimmed.taxCode }),
    ...(trimmed.businessLicence === ''
      ? {}
      : { businessLicence: trimmed.businessLicence }),
  };
}

export function CustomerFormDialog({
  isOpen,
  customer,
  isSubmitting,
  errorMessage,
  onSubmit,
  onClose,
}: CustomerFormDialogProps): ReactNode {
  const { t } = useTranslation();
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);

  useEffect(() => {
    if (!isOpen) return;
    setValues(
      customer === null
        ? EMPTY_VALUES
        : {
            companyName: customer.companyName ?? '',
            contactName: customer.contactName ?? '',
            phone: customer.phone ?? '',
            email: customer.email ?? '',
            note: customer.note ?? '',
            taxCode: customer.taxCode ?? '',
            businessLicence: customer.businessLicence ?? '',
          },
    );
  }, [isOpen, customer]);

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {customer === null ? t('customers.createTitle') : t('customers.editTitle')}
      </DialogTitle>
      <DialogContent>
        {errorMessage ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        ) : null}
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* Người liên hệ đứng trước, cùng thứ tự với danh bạ và trang chi
              tiết — ba màn hình nói khác nhau về cùng một khách thì người dùng
              phải đọc lại nhãn mỗi lần chuyển màn.

              Không đánh dấu bắt buộc riêng ô nào: luật thật là "ít nhất một
              trong hai". Để dấu sao ở tên công ty thì khách đến từ form
              website — vốn chỉ có tên người — trông như một hồ sơ lỗi. */}
          <TextField
            label={t('customers.contactName')}
            value={values.contactName}
            onChange={(event) => setValues({ ...values, contactName: event.target.value })}
            fullWidth
          />
          <TextField
            label={t('customers.companyName')}
            value={values.companyName}
            onChange={(event) => setValues({ ...values, companyName: event.target.value })}
            helperText={t('customers.oneNameRequired')}
            fullWidth
          />
          {/* Hai ô giấy tờ: KHÔNG bắt buộc, và nói thẳng ra như vậy. Khách lẻ
              và khách đến từ form website không có mã số thuế lẫn giấy phép —
              để chúng trông như ô bắt buộc là mỗi hồ sơ như vậy nhìn thành một
              hồ sơ điền thiếu. */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={t('customers.taxCode')}
              value={values.taxCode}
              onChange={(event) => setValues({ ...values, taxCode: event.target.value })}
              helperText={t('customers.optional')}
              fullWidth
            />
            <TextField
              label={t('customers.businessLicence')}
              value={values.businessLicence}
              onChange={(event) =>
                setValues({ ...values, businessLicence: event.target.value })
              }
              helperText={t('customers.optional')}
              fullWidth
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <PhoneField
              label={t('customers.phone')}
              value={values.phone}
              onChange={(phone) => setValues({ ...values, phone })}
            />
            <EmailField
              label={t('customers.email')}
              value={values.email}
              onChange={(email) => setValues({ ...values, email })}
            />
          </Stack>
          <TextField
            label={t('customers.note')}
            value={values.note}
            onChange={(event) => setValues({ ...values, note: event.target.value })}
            multiline
            minRows={2}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
          {t('common.actions.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={() => onSubmit(toPayload(values))}
          // Đòi ÍT NHẤT MỘT trong hai tên, không riêng tên công ty: khách đến
          // từ form website chưa có tên công ty, ép có thì admin muốn sửa mỗi
          // số điện thoại của họ cũng phải bịa ra một cái tên.
          disabled={
            isSubmitting
            || (values.companyName.trim() === '' && values.contactName.trim() === '')
          }
        >
          {t('common.actions.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
