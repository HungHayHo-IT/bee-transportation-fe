import type { ReactNode } from 'react';
import { InputAdornment, TextField } from '@mui/material';

export interface CurrencyAmountFieldProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  helperText?: string;
  hasError?: boolean;
  isRequired?: boolean;
  isDisabled?: boolean;
}

const groupedFormatter = new Intl.NumberFormat('vi-VN');

/** The column is `numeric(15,0)`, so a longer number can only ever be a typing slip. */
const MAX_DONG_DIGITS = 15;

/** Whole dong only: the backend rejects decimals and the currency has no minor unit. */
function parseWholeDong(rawInput: string): number | null | undefined {
  const digits = rawInput.replace(/\D/g, '');
  if (digits === '') return null;
  if (digits.length > MAX_DONG_DIGITS) return undefined;
  const parsed = Number(digits);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

/**
 * Shows grouped thousands while typing and hands the caller a plain integer, so
 * no screen has to parse a formatted string back into a number.
 */
export function CurrencyAmountField({
  label,
  value,
  onChange,
  helperText,
  hasError = false,
  isRequired = false,
  isDisabled = false,
}: CurrencyAmountFieldProps): ReactNode {
  return (
    <TextField
      label={label}
      value={value === null ? '' : groupedFormatter.format(value)}
      onChange={(event) => {
        const parsed = parseWholeDong(event.target.value);
        if (parsed === undefined) return;
        onChange(parsed);
      }}
      error={hasError}
      helperText={helperText}
      required={isRequired}
      disabled={isDisabled}
      fullWidth
      slotProps={{
        htmlInput: { inputMode: 'numeric', autoComplete: 'off' },
        input: {
          endAdornment: <InputAdornment position="end">₫</InputAdornment>,
        },
      }}
    />
  );
}
