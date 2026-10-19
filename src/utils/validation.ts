/**
 * Field rules shared by every form. Each rule answers with an i18n key rather
 * than a sentence, so a screen decides where the message is rendered and the
 * copy stays in `src/locales`.
 *
 * The backend validates everything again — these rules exist to catch a mistake
 * before a round trip, never to replace the server's answer.
 */

/** Deliberately permissive: the shape of an address, not the RFC. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Vietnamese numbers: 9–11 digits, optionally written as +84 or 0084. */
const PHONE_DIGITS_MIN = 9;
const PHONE_DIGITS_MAX = 11;

/** The backend rejects anything shorter. */
export const PASSWORD_MIN_LENGTH = 8;

export function validateEmail(value: string): string | null {
  if (value.trim() === '') return null;
  return EMAIL_PATTERN.test(value.trim()) ? null : 'validation.email';
}

/** Counts digits only, so "+84 912 345 678" and "0912345678" both pass. */
export function validatePhone(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const digits = trimmed.replace(/\D/g, '');
  const normalised = digits.startsWith('84') ? digits.slice(2) : digits;
  if (normalised.length < PHONE_DIGITS_MIN || normalised.length > PHONE_DIGITS_MAX) {
    return 'validation.phone';
  }
  return null;
}

export function validatePassword(value: string): string | null {
  if (value === '') return null;
  return value.length < PASSWORD_MIN_LENGTH ? 'validation.passwordMin' : null;
}

export function validateRequired(value: string): string | null {
  return value.trim() === '' ? 'validation.required' : null;
}

export interface NumberRangeOptions {
  min?: number;
  max?: number;
}

/** `value` is already parsed; `null` means the field is empty, which is allowed. */
export function validateNumberRange(
  value: number | null,
  { min, max }: NumberRangeOptions,
): string | null {
  if (value === null) return null;
  if (min !== undefined && value < min) return 'validation.numberMin';
  if (max !== undefined && value > max) return 'validation.numberMax';
  return null;
}
