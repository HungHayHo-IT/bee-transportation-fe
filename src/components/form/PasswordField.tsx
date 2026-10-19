import { useState } from 'react';
import type { ReactNode } from 'react';
import { IconButton, InputAdornment, TextField, Tooltip } from '@mui/material';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
  errorMessage?: string | null;
  /** "current-password" on login, "new-password" wherever one is being set. */
  autoComplete?: 'current-password' | 'new-password' | 'off';
  isRequired?: boolean;
  isDisabled?: boolean;
  isAutoFocused?: boolean;
}

/**
 * A password input with a reveal toggle. Typing a temporary password from a
 * chat message into a masked field is where most failed first logins come from,
 * so every password field in the app carries the same toggle.
 */
export function PasswordField({
  label,
  value,
  onChange,
  helperText,
  errorMessage = null,
  autoComplete = 'off',
  isRequired = false,
  isDisabled = false,
  isAutoFocused = false,
}: PasswordFieldProps): ReactNode {
  const { t } = useTranslation();
  const [isRevealed, setIsRevealed] = useState(false);
  const toggleLabel = isRevealed ? t('common.actions.hidePassword') : t('common.actions.showPassword');

  return (
    <TextField
      label={label}
      type={isRevealed ? 'text' : 'password'}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      error={errorMessage !== null}
      helperText={errorMessage ?? helperText}
      required={isRequired}
      disabled={isDisabled}
      autoFocus={isAutoFocused}
      fullWidth
      slotProps={{
        htmlInput: { autoComplete },
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title={toggleLabel}>
                <IconButton
                  size="small"
                  edge="end"
                  aria-label={toggleLabel}
                  onClick={() => setIsRevealed((revealed) => !revealed)}
                  disabled={isDisabled}
                >
                  {isRevealed ? <IconEyeOff size={18} stroke={1.7} /> : <IconEye size={18} stroke={1.7} />}
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
