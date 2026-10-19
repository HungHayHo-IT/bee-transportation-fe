import apiClient from './apiClient';
import { REFERENCE_ENDPOINTS } from './apiEndpoints';
import type { ApiPage } from './pageAdapter';

/**
 * The catalogues the backend validates against. Province names in particular are
 * checked on write — an unlisted one is rejected with a 400 — so the select must
 * offer the server's list rather than a copy that can drift.
 */
export async function fetchProvinces(): Promise<string[]> {
  const response = await apiClient.get<ApiPage<string>>(REFERENCE_ENDPOINTS.PROVINCES);
  return response.data.items;
}

/** Một mục của danh mục có nhãn: mã để gửi đi, nhãn để người đọc. */
export interface LabeledOption {
  value: string;
  label: string;
}

/**
 * Đơn vị tính của số kiện khi đẩy đơn sang OF1-TMS — 171 mã do Bee cấp.
 *
 * Lấy từ máy chủ chứ không chép vào đây: backend kiểm giá trị khi ghi, mã lạ
 * bị 400, nên một bản sao trong front-end sớm muộn lệch với thứ được chấp nhận.
 */
export async function fetchQuantityUnits(): Promise<LabeledOption[]> {
  const response = await apiClient.get<ApiPage<LabeledOption>>(REFERENCE_ENDPOINTS.QUANTITY_UNITS);
  return response.data.items;
}
