import apiClient from './apiClient';
import { CMS_ENDPOINTS } from './apiEndpoints';

/** Một điều của điều khoản ký. */
export interface DieuKhoan {
  id: number;
  title: string;
  body: string;
  sortOrder: number;
  isActive: boolean;
  updatedAt: string;
  updatedByName: string | null;
}

export interface DieuKhoanPayload {
  title?: string;
  body?: string;
  sortOrder?: number;
  isActive?: boolean;
}

/** KỂ CẢ điều đã tắt — màn quản trị cần thấy để bật lại. */
export async function fetchTerms(): Promise<DieuKhoan[]> {
  const res = await apiClient.get<DieuKhoan[]>(CMS_ENDPOINTS.TERMS);
  return res.data;
}

/** Đúng văn bản khách sẽ đọc — các điều đang bật ghép lại. */
export async function fetchTermsFullText(): Promise<string> {
  const res = await apiClient.get<{ toanVan: string }>(CMS_ENDPOINTS.TERMS_FULL);
  return res.data.toanVan;
}

export async function createTerm(payload: { title: string; body: string }): Promise<DieuKhoan> {
  const res = await apiClient.post<DieuKhoan>(CMS_ENDPOINTS.TERMS, payload);
  return res.data;
}

export async function updateTerm(id: number, payload: DieuKhoanPayload): Promise<DieuKhoan> {
  const res = await apiClient.patch<DieuKhoan>(CMS_ENDPOINTS.TERM_DETAIL(id), payload);
  return res.data;
}

export async function deleteTerm(id: number): Promise<void> {
  await apiClient.delete(CMS_ENDPOINTS.TERM_DETAIL(id));
}
