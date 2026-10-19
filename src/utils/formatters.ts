import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);

const DATE_FORMAT = 'DD/MM/YYYY';
const DATE_TIME_FORMAT = 'DD/MM/YYYY HH:mm';
const EMPTY_PLACEHOLDER = '—';

const currencyFormatter = new Intl.NumberFormat('vi-VN');

/**
 * Amounts cross the wire as strings because the backend stores them as Decimal.
 * A null amount means the caller is not allowed to see it, which is different
 * from an amount of zero and must never be rendered as one.
 */
export function formatCurrencyVnd(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return EMPTY_PLACEHOLDER;
  const numeric = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(numeric)) return EMPTY_PLACEHOLDER;
  return `${currencyFormatter.format(numeric)} ₫`;
}

/** Narrow table columns: 14200000 becomes "14,2M ₫". */
export function formatCompactCurrencyVnd(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return EMPTY_PLACEHOLDER;
  const numeric = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(numeric)) return EMPTY_PLACEHOLDER;
  if (numeric >= 1_000_000_000) return `${(numeric / 1_000_000_000).toFixed(1).replace('.', ',')}B ₫`;
  if (numeric >= 1_000_000) return `${(numeric / 1_000_000).toFixed(1).replace('.', ',')}M ₫`;
  if (numeric >= 1_000) return `${Math.round(numeric / 1_000)}K ₫`;
  return `${numeric} ₫`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return EMPTY_PLACEHOLDER;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format(DATE_FORMAT) : EMPTY_PLACEHOLDER;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return EMPTY_PLACEHOLDER;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format(DATE_TIME_FORMAT) : EMPTY_PLACEHOLDER;
}

export function formatRelativeTime(value: string | null | undefined, locale: string): string {
  if (!value) return EMPTY_PLACEHOLDER;
  const parsed = dayjs(value).locale(locale === 'vi' ? 'vi' : 'en');
  return parsed.isValid() ? parsed.fromNow() : EMPTY_PLACEHOLDER;
}

export { EMPTY_PLACEHOLDER };
