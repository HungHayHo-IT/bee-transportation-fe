import apiClient from './apiClient';
import { AUTH_ENDPOINTS } from './apiEndpoints';
import { isMockMode } from '@/mocks/mockClient';
import {
  mockChangePassword,
  mockFetchSession,
  mockLogin,
  mockLogout,
} from '@/mocks/mockSession';
import { findRoles } from '@/constants/roles';
import type { SessionUser } from '@/types/session';

interface ApiSessionUser {
  id: number;
  fullName: string;
  email: string;
  roles: string[];
  departmentId: number | null;
  departmentName: string | null;
  canViewCompanyReport: boolean;
  mustChangePassword: boolean;
}

function adaptSessionUser(api: ApiSessionUser): SessionUser {
  return {
    id: api.id,
    fullName: api.fullName,
    email: api.email,
    roles: findRoles(api.roles),
    departmentId: api.departmentId,
    departmentName: api.departmentName,
    canViewCompanyReport: api.canViewCompanyReport,
    mustChangePassword: api.mustChangePassword,
  };
}

export async function login(email: string, password: string): Promise<SessionUser> {
  if (isMockMode) return mockLogin(email, password);

  // The endpoint answers with the session user itself; the temporary-password
  // flag rides on that object rather than sitting beside it.
  const response = await apiClient.post<ApiSessionUser>(AUTH_ENDPOINTS.LOGIN, {
    email,
    password,
  });
  return adaptSessionUser(response.data);
}

export async function fetchCurrentSession(): Promise<SessionUser> {
  if (isMockMode) return mockFetchSession();

  const response = await apiClient.get<ApiSessionUser>(AUTH_ENDPOINTS.ME);
  return adaptSessionUser(response.data);
}

export async function logout(): Promise<void> {
  if (isMockMode) return mockLogout();

  await apiClient.post(AUTH_ENDPOINTS.LOGOUT);
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (isMockMode) return mockChangePassword(currentPassword);

  await apiClient.post(AUTH_ENDPOINTS.CHANGE_PASSWORD, { currentPassword, newPassword });
}

/* ── Đối tác Bee Logistics tự mở tài khoản ────────────────────────────────── */

/** Bước 1 — gửi mã 6 số tới hộp thư. Trả số giây phải chờ trước khi xin lại. */
export async function guiMaDoiTac(email: string): Promise<number> {
  const res = await apiClient.post<{ resendAfter: number }>(
    AUTH_ENDPOINTS.PARTNER_SEND_CODE,
    { email },
  );
  return res.data.resendAfter;
}

/** Bước 2 — nhập mã, nhận vé sống 10 phút cho bước cuối. */
export async function kiemMaDoiTac(email: string, code: string): Promise<string> {
  const res = await apiClient.post<{ ticket: string }>(
    AUTH_ENDPOINTS.PARTNER_CHECK_CODE,
    { email, code },
  );
  return res.data.ticket;
}

/**
 * Bước 3 — đổi vé lấy tài khoản. KHÔNG gửi email lên: máy chủ lấy email từ
 * chính tấm vé, nên xác thực hộp thư này rồi mở tài khoản cho hộp thư khác là
 * không thể.
 */
export async function taoTaiKhoanDoiTac(
  ticket: string,
  fullName: string,
  password: string,
): Promise<string> {
  const res = await apiClient.post<{ email: string }>(
    AUTH_ENDPOINTS.PARTNER_CREATE,
    { ticket, fullName, password },
  );
  return res.data.email;
}
