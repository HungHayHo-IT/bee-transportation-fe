import { useState } from 'react';
import type { ReactNode } from 'react';
import { TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { validateEmail } from '@/utils/validation';

export interface EmailFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  isFullWidth?: boolean;
}

/**
 * `type="email"` alone only validates when a form is submitted natively, which
 * these dialogs never do. The shape is checked on blur instead, so the message
 * arrives when the user leaves the field rather than on the first character.
 */
export function EmailField({
  label,
  value,
  onChange,
  helperText,
  isRequired = false,
  isDisabled = false,
  isFullWidth = true,
}: EmailFieldProps): ReactNode {
  const { t } = useTranslation();
  const [isTouched, setIsTouched] = useState(false);

  const errorKey = validateEmail(value);
  const showError = isTouched && errorKey !== null;

  return (
    <TextField
      label={label}
      type="email"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={() => setIsTouched(true)}
      error={showError}
      helperText={showError ? t(errorKey) : helperText}
      required={isRequired}
      disabled={isDisabled}
      fullWidth={isFullWidth}
      slotProps={{ htmlInput: { autoComplete: 'email', spellCheck: false } }}
    />
  );
}
