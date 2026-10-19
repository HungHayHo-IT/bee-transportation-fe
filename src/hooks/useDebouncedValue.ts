import { useEffect, useState } from 'react';
import { SEARCH_DEBOUNCE_MS } from '@/constants/pagination';

export function useDebouncedValue<TValue>(
  value: TValue,
  delayMs: number = SEARCH_DEBOUNCE_MS,
): TValue {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
