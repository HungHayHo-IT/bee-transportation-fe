import { useEffect, useState } from 'react';
import { describeError } from '@/services/apiClient';
import { fetchServiceFormSchema } from '@/services/serviceFieldService';
import type { ServiceFormSchema } from '@/types/serviceField';

export interface ServiceSchemaState {
  /** Null until a service is chosen and its schema has arrived. */
  schema: ServiceFormSchema | null;
  isLoading: boolean;
  errorMessage: string | null;
}

/**
 * Loads the input boxes a service declares. Kept out of `useAsyncResource` because
 * the resource has no "no service chosen yet" state — and a stale schema on screen
 * while a new one loads would render boxes belonging to the previous service.
 */
export function useServiceSchema(
  serviceId: number | null,
  /* Đổi dịch vụ con là đổi HÌNH DẠNG form: hai cờ điểm đi/đến và bộ ô riêng
     đều tính theo nó. Nằm trong deps nên đổi là hỏi lại. */
  serviceChildId?: number | null,
): ServiceSchemaState {
  const [schema, setSchema] = useState<ServiceFormSchema | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (serviceId === null) {
      setSchema(null);
      setErrorMessage(null);
      return;
    }

    // A slow answer for a service the user has already moved off must not land.
    let isCurrent = true;
    setIsLoading(true);
    setSchema(null);
    setErrorMessage(null);

    fetchServiceFormSchema(serviceId, serviceChildId ?? undefined)
      .then((next) => {
        if (isCurrent) setSchema(next);
      })
      .catch((error: unknown) => {
        if (isCurrent) setErrorMessage(describeError(error));
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [serviceId, serviceChildId]);

  return { schema, isLoading, errorMessage };
}
