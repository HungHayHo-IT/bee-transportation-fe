import type { ReactNode } from 'react';
import { Box, FormControlLabel, FormHelperText, MenuItem, Switch, TextField } from '@mui/material';
import { DateField } from '@/components/form/DateField';
import { NumberField } from '@/components/form/NumberField';
import { FIELD_GRID } from '@/components/form/fieldGrid';
import type { ServiceField } from '@/types/serviceField';
import type { ServiceDataDraft } from './serviceDataValues';

export interface ServiceDataFieldsProps {
  fields: ServiceField[];
  value: ServiceDataDraft;
  onChange: (value: ServiceDataDraft) => void;
  isDisabled?: boolean;
}

function FieldInput({
  field,
  value,
  onChange,
  isDisabled,
}: {
  field: ServiceField;
  value: string | number | boolean | null;
  onChange: (next: string | number | boolean | null) => void;
  isDisabled: boolean;
}): ReactNode {
  const label = field.unit === null ? field.label : `${field.label} (${field.unit})`;
  const helperText = field.helpText ?? undefined;

  if (field.fieldType === 'number')
    return (
      <NumberField
        label={label}
        value={typeof value === 'number' ? value : null}
        onChange={onChange}
        decimals={2}
        min={0}
        helperText={helperText}
        isRequired={field.isRequired}
        isDisabled={isDisabled}
      />
    );

  if (field.fieldType === 'boolean')
    return (
      // Công tắc cũng phải mang được ghi chú. Trước đây nhánh này bỏ rơi
      // helperText trong khi mọi nhánh khác đều truyền, nên ghi chú của các
      // trường kiểu bật/tắt được lưu trong cấu hình mà không bao giờ hiện ra —
      // đúng những trường khó đoán nhất ("Cần hun trùng", "Cần xe hộ tống").
      <Box>
        <FormControlLabel
          control={
            <Switch
              checked={value === true}
              onChange={(event) => onChange(event.target.checked)}
              disabled={isDisabled}
            />
          }
          label={field.label}
        />
        {helperText === undefined ? null : (
          <FormHelperText sx={{ mt: 0, ml: 0 }}>{helperText}</FormHelperText>
        )}
      </Box>
    );

  if (field.fieldType === 'date')
    return (
      <DateField
        label={label}
        value={typeof value === 'string' ? value : ''}
        onChange={onChange}
        helperText={helperText}
        isRequired={field.isRequired}
        isDisabled={isDisabled}
      />
    );

  if (field.fieldType === 'select')
    return (
      <TextField
        select
        label={label}
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
        helperText={helperText}
        required={field.isRequired}
        disabled={isDisabled}
        fullWidth
      >
        {/* An empty row so a non-required choice can be taken back. */}
        <MenuItem value="">—</MenuItem>
        {field.options.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </TextField>
    );

  return (
    <TextField
      label={label}
      value={typeof value === 'string' ? value : ''}
      onChange={(event) => onChange(event.target.value)}
      helperText={helperText}
      required={field.isRequired}
      disabled={isDisabled}
      fullWidth
    />
  );
}

/**
 * The per-service half of the create-order form. Which boxes appear is configured
 * by an admin against the service, not written into this component — so adding a
 * "Số tờ khai" box to customs orders is a catalogue edit, not a release.
 */
export function ServiceDataFields({
  fields,
  value,
  onChange,
  isDisabled = false,
}: ServiceDataFieldsProps): ReactNode {
  if (fields.length === 0) return null;

  return (
    <Box sx={FIELD_GRID}>
      {fields.map((field) => (
        <Box key={field.fieldKey}>
          <FieldInput
            field={field}
            value={value[field.fieldKey] ?? null}
            onChange={(next) => onChange({ ...value, [field.fieldKey]: next })}
            isDisabled={isDisabled}
          />
        </Box>
      ))}
    </Box>
  );
}
