import { useState } from 'react';
import type { ReactNode } from 'react';
import { TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { validatePhone } from '@/utils/validation';

export interface PhoneFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  isFullWidth?: boolean;
}

/** Digits plus the separators people actually type; letters never get in. */
function keepPhoneCharacters(input: string): string {
  return input.replace(/[^\d+\-.() ]/g, '').slice(0, 20);
}

/**
 * A phone number field. Typing is filtered so a letter can never land in the
 * value, and the shape is checked on blur rather than on every keystroke — an
 * error on the second digit of a number is noise, not help.
 */
export function PhoneField({
  label,
  value,
  onChange,
  helperText,
  isRequired = false,
  isDisabled = false,
  isFullWidth = true,
}: PhoneFieldProps): ReactNode {
  const { t } = useTranslation();
  const [isTouched, setIsTouched] = useState(false);

  const errorKey = validatePhone(value);
  const showError = isTouched && errorKey !== null;

  return (
    <TextField
      label={label}
      value={value}
      onChange={(event) => onChange(keepPhoneCharacters(event.target.value))}
      onBlur={() => setIsTouched(true)}
      error={showError}
      helperText={showError ? t(errorKey) : helperText}
      required={isRequired}
      disabled={isDisabled}
      fullWidth={isFullWidth}
      slotProps={{ htmlInput: { inputMode: 'tel', autoComplete: 'tel' } }}
    />
  );
}
