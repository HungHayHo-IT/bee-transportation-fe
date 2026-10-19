import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiError } from '@/services/apiClient';

export interface AsyncResource<TValue> {
  data: TValue | null;
  isFirstLoad: boolean;
  isRefetching: boolean;
  errorMessage: string | null;
  reload: () => void;
  clearError: () => void;
}

/**
 * One loading contract for every screen: a blocking spinner on the first pass, a
 * progress bar on every later pass, and an error that stays dismissible without
 * discarding the rows already on screen. A slow response can never overwrite a
 * newer one because each run carries its own generation number.
 */
export function useAsyncResource<TValue>(
  load: () => Promise<TValue>,
  dependencies: readonly unknown[] = [],
): AsyncResource<TValue> {
  const [data, setData] = useState<TValue | null>(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const generationRef = useRef(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    setIsRefetching(true);

    loadRef
      .current()
      .then((value) => {
        if (generationRef.current !== generation) return;
        setData(value);
        setErrorMessage(null);
      })
      .catch((error: ApiError) => {
        if (generationRef.current !== generation) return;
        setErrorMessage(error.message);
      })
      .finally(() => {
        if (generationRef.current !== generation) return;
        setIsRefetching(false);
        setIsFirstLoad(false);
      });
    // The caller owns the dependency list; `load` is read through a ref so an
    // inline arrow function does not retrigger the effect on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);
  const clearError = useCallback(() => setErrorMessage(null), []);

  return { data, isFirstLoad, isRefetching, errorMessage, reload, clearError };
}
