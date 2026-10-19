import type { ReactNode } from 'react';
import { Box, Button, InputAdornment, MenuItem, Stack, TextField } from '@mui/material';
import { IconFileExport, IconSearch } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { DateField } from '@/components/form/DateField';
import { ProvinceField } from '@/components/form/ProvinceField';
import { SectionCard } from '@/components/SectionCard';
import { ORDER_STATUS_LABEL_KEY, ORDER_STATUS_SEQUENCE } from '@/constants/orderStatus';
import type { Service } from '@/types/organisation';
import { ALL_OPTION, EMPTY_FILTERS, ORDER_DATE_FIELDS } from './orderFilterValues';
import type { OrderDateField, OrderFilterValues } from './orderFilterValues';
import { OrderPartyFilters } from './OrderPartyFilters';
import { OrderServiceFieldFilter } from './OrderServiceFieldFilter';

const DATE_FIELD_LABEL_KEY: Record<OrderDateField, string> = {
  created: 'orders.list.dateCreated',
  closed: 'orders.list.dateClosed',
  completed: 'orders.list.dateCompleted',
};

export interface OrderFiltersBarProps {
  values: OrderFilterValues;
  services: Service[];
  onChange: (values: OrderFilterValues) => void;
  onExport?: () => void;
  isExporting?: boolean;
}

export function OrderFiltersBar({
  values,
  services,
  onChange,
  onExport,
  isExporting = false,
}: OrderFiltersBarProps): ReactNode {
  const { t } = useTranslation();
  const update = (patch: Partial<OrderFilterValues>): void => onChange({ ...values, ...patch });
  // "Lọc ngày theo" only chooses which date the range below applies to; naming
  // that date in the two range labels makes the pairing visible, so the select
  // no longer looks like a filter that does nothing on its own.
  const dateField = ORDER_DATE_FIELDS.find((field) => field === values.dateField) ?? 'created';
  const dateFieldLabel = t(DATE_FIELD_LABEL_KEY[dateField]);

  return (
    <SectionCard>
      <Stack spacing={2}>
        {/* One even grid so every field keeps the same width and reads in a
            predictable order, however many are shown for the current role. */}
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(3, minmax(0, 1fr))',
              lg: 'repeat(4, minmax(0, 1fr))',
            },
          }}
        >
          <TextField
            fullWidth
            label={t('orders.list.search')}
            value={values.q}
            onChange={(event) => update({ q: event.target.value })}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <IconSearch size={17} stroke={1.7} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            select
            fullWidth
            label={t('common.table.status')}
            value={values.status}
            onChange={(event) => update({ status: event.target.value })}
          >
            <MenuItem value={ALL_OPTION}>{t('common.actions.all')}</MenuItem>
            {ORDER_STATUS_SEQUENCE.map((status) => (
              <MenuItem key={status} value={status}>
                {t(ORDER_STATUS_LABEL_KEY[status])}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            fullWidth
            label={t('orders.fields.service')}
            value={values.serviceId}
            // A different service has a different set of own fields, so the pair
            // below is cleared rather than left pointing at a key that no longer exists.
            onChange={(event) =>
              update({
                serviceId: event.target.value,
                serviceFieldKey: '',
                serviceFieldValue: '',
              })
            }
          >
            <MenuItem value={ALL_OPTION}>{t('common.actions.all')}</MenuItem>
            {services.map((service) => (
              <MenuItem key={service.id} value={String(service.id)}>
                {service.code} · {service.name}
              </MenuItem>
            ))}
          </TextField>
          <OrderServiceFieldFilter
            serviceId={values.serviceId}
            fieldKey={values.serviceFieldKey}
            fieldValue={values.serviceFieldValue}
            onChange={update}
          />
          <OrderPartyFilters values={values} onChange={update} />
          {/* The picker's '' is this list's "all": clearing the box lifts the filter. */}
          <ProvinceField
            label={t('orders.fields.originProvince')}
            value={values.originProvince === ALL_OPTION ? '' : values.originProvince}
            onChange={(province) => update({ originProvince: province === '' ? ALL_OPTION : province })}
          />
          {/* The picker's '' is this list's "all": clearing the box lifts the filter. */}
          <ProvinceField
            label={t('orders.fields.destinationProvince')}
            value={values.destinationProvince === ALL_OPTION ? '' : values.destinationProvince}
            onChange={(province) => update({ destinationProvince: province === '' ? ALL_OPTION : province })}
          />
          <TextField
            select
            fullWidth
            label={t('orders.list.dateField')}
            value={values.dateField}
            onChange={(event) => update({ dateField: event.target.value })}
          >
            {ORDER_DATE_FIELDS.map((field) => (
              <MenuItem key={field} value={field}>
                {t(DATE_FIELD_LABEL_KEY[field])}
              </MenuItem>
            ))}
          </TextField>
          <DateField
            label={t('orders.list.fromDateOf', { field: dateFieldLabel })}
            value={values.fromDate}
            maxDate={values.toDate === '' ? undefined : values.toDate}
            onChange={(fromDate) => update({ fromDate })}
          />
          <DateField
            label={t('orders.list.toDateOf', { field: dateFieldLabel })}
            value={values.toDate}
            minDate={values.fromDate === '' ? undefined : values.fromDate}
            onChange={(toDate) => update({ toDate })}
          />
        </Box>

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button color="inherit" onClick={() => onChange(EMPTY_FILTERS)}>
            {t('common.actions.reset')}
          </Button>
          {onExport === undefined ? null : (
            <Button
              variant="outlined"
              startIcon={<IconFileExport size={17} />}
              onClick={onExport}
              disabled={isExporting}
            >
              {t('common.actions.export')}
            </Button>
          )}
        </Stack>
      </Stack>
    </SectionCard>
  );
}
