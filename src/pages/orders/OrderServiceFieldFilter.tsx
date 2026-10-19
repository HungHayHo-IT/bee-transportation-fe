import { Fragment } from 'react';
import type { ReactNode } from 'react';
import { MenuItem, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ALL_OPTION } from './orderFilterValues';
import { useServiceSchema } from './useServiceSchema';

export interface OrderServiceFieldFilterProps {
  /** `ALL_OPTION` while no single service is selected. */
  serviceId: string;
  fieldKey: string;
  fieldValue: string;
  onChange: (patch: { serviceFieldKey: string; serviceFieldValue: string }) => void;
}

/**
 * Filtering on a service's own fields only makes sense once the list is narrowed to
 * one service — the fields differ per service, so a key picked against a mixed list
 * would match nothing. The pair disappears rather than sitting there disabled.
 */
export function OrderServiceFieldFilter({
  serviceId,
  fieldKey,
  fieldValue,
  onChange,
}: OrderServiceFieldFilterProps): ReactNode {
  const { t } = useTranslation();
  const { schema } = useServiceSchema(
    serviceId === ALL_OPTION || serviceId === '' ? null : Number(serviceId),
  );

  const fields = schema?.fields ?? [];
  if (fields.length === 0) return null;

  const selected = fields.find((field) => field.fieldKey === fieldKey) ?? null;

  return (
    <Fragment>
      <TextField
        select
        fullWidth
        label={t('orders.list.serviceField')}
        value={selected === null ? ALL_OPTION : fieldKey}
        // Changing the key clears the value: the old one belonged to another field
        // and would silently filter the list down to nothing.
        onChange={(event) =>
          onChange({
            serviceFieldKey: event.target.value === ALL_OPTION ? '' : event.target.value,
            serviceFieldValue: '',
          })
        }
      >
        <MenuItem value={ALL_OPTION}>{t('common.actions.all')}</MenuItem>
        {fields.map((field) => (
          <MenuItem key={field.fieldKey} value={field.fieldKey}>
            {field.label}
          </MenuItem>
        ))}
      </TextField>

      {selected === null ? null : (
        <TextField
          select={selected.fieldType === 'select' || selected.fieldType === 'boolean'}
          fullWidth
          label={t('orders.list.serviceFieldValue')}
          value={fieldValue}
          onChange={(event) =>
            onChange({ serviceFieldKey: fieldKey, serviceFieldValue: event.target.value })
          }
        >
          {selected.fieldType === 'boolean'
            ? [
                <MenuItem key="true" value="true">
                  {t('common.states.yes')}
                </MenuItem>,
                <MenuItem key="false" value="false">
                  {t('common.states.no')}
                </MenuItem>,
              ]
            : selected.options.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
        </TextField>
      )}
    </Fragment>
  );
}
