import type { ReactNode } from 'react';
import dayjs from 'dayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

/** The wire format for every date the API takes or returns. */
const ISO_DATE = 'YYYY-MM-DD';

export interface DateFieldProps {
  label: string;
  /** `YYYY-MM-DD`, or an empty string for "no date". */
  value: string;
  onChange: (value: string) => void;
  minDate?: string;
  maxDate?: string;
  helperText?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  isFullWidth?: boolean;
}

/**
 * One date control for the whole app. The native `<input type="date">` renders
 * differently in every browser, shows `mm/dd/yyyy` on an English system while
 * the rest of the screen is Vietnamese, and offers no way to bound a range —
 * so dates go through the MUI picker, which reads `DD/MM/YYYY` everywhere.
 *
 * The value stays an ISO string because that is what the API speaks; only the
 * display is localised.
 */
export function DateField({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  helperText,
  isRequired = false,
  isDisabled = false,
  isFullWidth = true,
}: DateFieldProps): ReactNode {
  const parsed = value === '' ? null : dayjs(value);

  return (
    <DatePicker
      label={label}
      value={parsed === null || !parsed.isValid() ? null : parsed}
      onChange={(next) => onChange(next === null || !next.isValid() ? '' : next.format(ISO_DATE))}
      format="DD/MM/YYYY"
      minDate={minDate === undefined ? undefined : dayjs(minDate)}
      maxDate={maxDate === undefined ? undefined : dayjs(maxDate)}
      disabled={isDisabled}
      slotProps={{
        textField: {
          size: 'small',
          fullWidth: isFullWidth,
          required: isRequired,
          helperText,
        },
        field: { clearable: true },
      }}
    />
  );
}
