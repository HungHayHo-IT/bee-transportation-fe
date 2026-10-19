/**
 * Stand-in for the backend while screens are built ahead of the API.
 * Everything here returns the same view types the real adapters produce, so
 * switching `VITE_USE_MOCK` off changes nothing above the service layer.
 */
const MOCK_LATENCY_MS = 220;

export const isMockMode = import.meta.env.VITE_USE_MOCK === 'true';

export function withMockDelay<TValue>(value: TValue): Promise<TValue> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), MOCK_LATENCY_MS);
  });
}

export function mockFailure(message: string, status: number): Promise<never> {
  return new Promise((_resolve, reject) => {
    window.setTimeout(() => {
      reject(Object.assign(new Error(message), { status }));
    }, MOCK_LATENCY_MS);
  });
}
