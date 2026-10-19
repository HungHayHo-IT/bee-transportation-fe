import apiClient from './apiClient';
import { SETTINGS_ENDPOINTS } from './apiEndpoints';

/** Một tham số hệ thống sửa được — danh sách do backend khai, xem cau-hinh.ts. */
export interface ThamSo {
  key: string;
  label: string;
  moTa: string;
  value: number;
  min: number;
  max: number;
  macDinh: number;
}

export async function fetchSettings(): Promise<ThamSo[]> {
  const res = await apiClient.get<ThamSo[]>(SETTINGS_ENDPOINTS.ROOT);
  return res.data;
}

export async function saveSetting(key: string, value: number): Promise<ThamSo[]> {
  const res = await apiClient.put<ThamSo[]>(SETTINGS_ENDPOINTS.ROOT, { key, value });
  return res.data;
}
