import { useEffect, useState } from 'react';
import { PROVINCES } from '@/constants/provinces';
import { fetchProvinces } from '@/services/referenceService';

/**
 * The catalogue changes about once a decade, so it is fetched once per session
 * and shared. The bundled list stands in while the request is in flight and if it
 * fails — an empty province select would block order creation outright.
 */
let cached: Promise<string[]> | null = null;

function loadProvinces(): Promise<string[]> {
  cached ??= fetchProvinces().catch(() => {
    cached = null;
    return [...PROVINCES];
  });
  return cached;
}

export function useProvinces(): string[] {
  const [provinces, setProvinces] = useState<string[]>([...PROVINCES]);

  useEffect(() => {
    let isActive = true;
    void loadProvinces().then((list) => {
      if (isActive && list.length > 0) setProvinces(list);
    });
    return () => {
      isActive = false;
    };
  }, []);

  return provinces;
}
