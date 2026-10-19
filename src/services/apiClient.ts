import axios from 'axios';
import type { AxiosError, AxiosResponse } from 'axios';
import i18n from '@/locales';
import { AUTH_ENDPOINTS } from './apiEndpoints';

/** Error shape every service and screen can rely on. */
export interface ApiError extends Error {
  status?: number;
  /**
   * Data the backend attaches to an error, e.g. `existingCustomerId` on the 409
   * raised by a duplicate customer name. Unknown until a caller narrows it.
   */
  details?: unknown;
}

/**
 * A screen catches `unknown`. Everything rejected by the interceptor is an Error,
 * so this narrows without an assertion and still copes with a non-Error throw.
 */
export function isApiError(value: unknown): value is ApiError {
  return value instanceof Error;
}

/** The message to show the user; backend messages are Vietnamese and safe to surface. */
export function describeError(error: unknown): string {
  return isApiError(error) ? error.message : i18n.t('common.states.networkError');
}

interface ApiErrorBody {
  error?: { code?: string; message?: string; statusCode?: number; details?: unknown };
  message?: string;
}

interface ApiSuccessEnvelope<TData> {
  success: true;
  data: TData;
}

/**
 * The session is a JWT in an httpOnly cookie, so credentials must ride along and
 * no Authorization header is ever set. In development the Vite proxy keeps the
 * browser on one origin, which is what makes a SameSite=Lax cookie work.
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 20_000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

function isSuccessEnvelope(payload: unknown): payload is ApiSuccessEnvelope<unknown> {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'success' in payload &&
    (payload as { success: unknown }).success === true &&
    'data' in payload
  );
}

/**
 * Gửi file thì BỎ header Content-Type mặc định đi.
 *
 * `Content-Type: application/json` ở trên là mặc định cho mọi request, kể cả
 * request mang FormData. Mà FormData phải đi kèm một chuỗi `boundary` do trình
 * duyệt sinh ra — ghi đè bằng `application/json` thì máy chủ nhận được một thân
 * request nó không đọc nổi, và trả về "Phải gửi dạng multipart/form-data" trong
 * khi FE tin rằng mình đã gửi đúng.
 *
 * Xoá header đi để trình duyệt tự điền, kèm boundary. Làm ở đây chứ không ở
 * từng hàm gọi: mỗi chỗ tải file mới lại phải nhớ một dòng header là một cái
 * bẫy giăng sẵn cho lần sau.
 */
apiClient.interceptors.request.use((config) => {
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    config.headers.delete('Content-Type');
  }
  return config;
});

apiClient.interceptors.response.use((response: AxiosResponse) => {
  if (isSuccessEnvelope(response.data)) {
    response.data = response.data.data;
  }
  return response;
});

let sessionExpiredHandler: (() => void) | null = null;

/** Registered once by the session store so the interceptor stays framework-free. */
export function registerSessionExpiredHandler(handler: () => void): void {
  sessionExpiredHandler = handler;
}

apiClient.interceptors.response.use(undefined, (error: AxiosError<ApiErrorBody>) => {
  const message =
    error.response?.data?.error?.message ??
    error.response?.data?.message ??
    error.message ??
    i18n.t('common.states.networkError');

  const requestUrl = error.config?.url ?? '';
  const isAuthRequest = Object.values(AUTH_ENDPOINTS).some((endpoint) =>
    requestUrl.includes(endpoint),
  );

  if (error.response?.status === 401 && !isAuthRequest) {
    sessionExpiredHandler?.();
  }

  const apiError: ApiError = Object.assign(new Error(message), {
    status: error.response?.status,
    details: error.response?.data?.error?.details,
  });
  return Promise.reject(apiError);
});

export default apiClient;
