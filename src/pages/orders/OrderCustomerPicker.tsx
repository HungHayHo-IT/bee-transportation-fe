import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Autocomplete, Box, Stack, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { EmailField } from '@/components/form/EmailField';
import { FIELD_GRID } from '@/components/form/fieldGrid';
import { PhoneField } from '@/components/form/PhoneField';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { searchCustomers } from '@/services/customerService';
import type { Customer } from '@/types/customer';
import { customerDisplayName } from '@/utils/customerName';

export interface CustomerSelection {
  existing: Customer | null;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
}

export interface OrderCustomerPickerProps {
  value: CustomerSelection;
  onChange: (value: CustomerSelection) => void;
}

/**
 * `CreateOrderDto` accepts only `customerId`, so a customer typed by hand has to
 * be created first. The picker keeps both cases in one shape and the page decides
 * which call to make.
 */
export function OrderCustomerPicker({ value, onChange }: OrderCustomerPickerProps): ReactNode {
  const { t } = useTranslation();
  const [options, setOptions] = useState<Customer[]>([]);
  /** Tổng số hồ sơ khớp — để nói ra còn bao nhiêu chưa hiện. */
  const [tongSo, setTongSo] = useState(0);
  const debouncedQuery = useDebouncedValue(value.companyName);

  useEffect(() => {
    let isCurrent = true;
    searchCustomers(debouncedQuery)
      .then((kq) => {
        if (!isCurrent) return;
        setOptions(kq.items);
        setTongSo(kq.total);
      })
      .catch(() => {
        if (isCurrent) { setOptions([]); setTongSo(0); }
      });
    return () => {
      isCurrent = false;
    };
  }, [debouncedQuery]);

  const isNewCustomer = value.existing === null && value.companyName.trim() !== '';
  /** Số hồ sơ khớp nhưng chưa hiện trong danh sách. */
  const conLai = Math.max(tongSo - options.length, 0);

  // Two rows of two: who the customer is on the left, how to reach them on the
  // right — company beside phone, contact person beside email.
  return (
    <Stack spacing={2}>
      <Box sx={FIELD_GRID}>
        <Autocomplete
          freeSolo
          options={options}
          value={value.existing}
          inputValue={value.companyName}
          getOptionLabel={(option) =>
            typeof option === 'string' ? option : (customerDisplayName(option) ?? '')
          }
          isOptionEqualToValue={(option, selected) => option.id === selected.id}
          onInputChange={(_event, inputValue, reason) => {
            if (reason === 'reset') return;
            onChange({ ...value, companyName: inputValue, existing: null });
          }}
          onChange={(_event, selected) => {
            if (selected === null || typeof selected === 'string') {
              onChange({ ...value, existing: null });
              return;
            }
            onChange({
              existing: selected,
              companyName: selected.companyName ?? '',
              contactName: selected.contactName ?? '',
              phone: selected.phone ?? '',
              email: selected.email ?? '',
            });
          }}
          renderOption={({ key: _label, ...optionProps }, option) => (
            // Two profiles may legitimately carry the same company name, so the row
            // is keyed by id — MUI would otherwise key it by the label and collide.
            // Mã khách đứng cạnh tên: 697 khách nhập từ hệ thống cũ có nhiều
            // tên gần giống nhau, mã là thứ phân biệt được.
            <li {...optionProps} key={option.id}>
              {option.code === null ? option.companyName : `${option.code} — ${option.companyName}`}
            </li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t('customers.companyName')}
              required
              fullWidth
              /* Danh sách bị cắt thì NÓI RA. Một ô xổ xuống hiện 100 dòng trông
                 y như đã liệt kê hết, và người dùng kết luận khách của mình
                 chưa có trong hệ thống rồi tạo thêm một hồ sơ trùng. */
              helperText={conLai > 0 ? t('orders.create.customerMore', { count: conLai }) : undefined}
            />
          )}
        />
        <PhoneField
          label={t('customers.phone')}
          isRequired
          value={value.phone}
          onChange={(phone) => onChange({ ...value, phone })}
        />
        <TextField
          label={t('customers.contactName')}
          value={value.contactName}
          onChange={(event) => onChange({ ...value, contactName: event.target.value })}
          fullWidth
        />
        <EmailField
          label={t('customers.email')}
          value={value.email}
          onChange={(email) => onChange({ ...value, email })}
        />
      </Box>

      {isNewCustomer ? (
        <Alert severity="info">{t('orders.create.newCustomerHint')}</Alert>
      ) : null}
    </Stack>
  );
}
