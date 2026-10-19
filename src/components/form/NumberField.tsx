import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { InputAdornment, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { validateNumberRange } from '@/utils/validation';

export interface NumberFieldProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  /** 0 keeps the field integer-only, which is what counts and hours need. */
  decimals?: number;
  min?: number;
  max?: number;
  /** Rendered inside the field, e.g. "kg" or "CBM". */
  unit?: string;
  helperText?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  isFullWidth?: boolean;
  /** Inside a table the column header already names the field. */
  isLabelHidden?: boolean;
}

/** Everything the field will accept while typing; anything else is dropped. */
function keepNumericCharacters(input: string, decimals: number): string {
  const cleaned = input.replace(decimals > 0 ? /[^\d.,]/g : /\D/g, '').replace(',', '.');
  if (decimals === 0) return cleaned;
  const [whole, ...rest] = cleaned.split('.');
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join('').slice(0, decimals)}`;
}

function parse(text: string): number | null {
  if (text === '' || text === '.') return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * A number input that cannot hold a non-number. `type="number"` was not enough:
 * it still accepts "e", changes value on scroll, and leaves the browser's
 * spinner arrows in a layout that has no room for them.
 */
export function NumberField({
  label,
  value,
  onChange,
  decimals = 0,
  min,
  max,
  unit,
  helperText,
  isRequired = false,
  isDisabled = false,
  isFullWidth = true,
  isLabelHidden = false,
}: NumberFieldProps): ReactNode {
  const { t } = useTranslation();
  const [text, setText] = useState(value === null ? '' : String(value));

  // A value changed from outside (a form reset, a prefill) must show through,
  // but re-rendering must not fight what is being typed — "1." parses to 1.
  useEffect(() => {
    if (parse(text) === value) return;
    setText(value === null ? '' : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const rangeErrorKey = validateNumberRange(value, { min, max });
  const errorMessage =
    rangeErrorKey === null ? null : t(rangeErrorKey, { min: min ?? 0, max: max ?? 0 });

  return (
    <TextField
      label={isLabelHidden ? undefined : label}
      value={text}
      onChange={(event) => {
        const next = keepNumericCharacters(event.target.value, decimals);
        setText(next);
        onChange(parse(next));
      }}
      error={errorMessage !== null}
      helperText={errorMessage ?? helperText}
      required={isRequired}
      disabled={isDisabled}
      fullWidth={isFullWidth}
      slotProps={{
        input: {
          inputMode: decimals > 0 ? 'decimal' : 'numeric',
          endAdornment:
            unit === undefined ? undefined : (
              <InputAdornment position="end">{unit}</InputAdornment>
            ),
        },
        htmlInput: {
          inputMode: decimals > 0 ? 'decimal' : 'numeric',
          autoComplete: 'off',
          'aria-label': label,
          ...(isLabelHidden ? { style: { textAlign: 'right' } } : {}),
        },
      }}
    />
  );
}
