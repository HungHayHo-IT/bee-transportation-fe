import apiClient from './apiClient';
import { SIGNATURE_ENDPOINTS } from './apiEndpoints';

/** Trạng thái ký của một đơn. `null` = chưa gửi ký lần nào. */
export interface TrangThaiKy {
  id: number;
  /** cho_ky | da_ky | tu_choi | het_han */
  trangThai: string;
  hetHanLuc: string;
  kyLuc: string | null;
  kyTen: string | null;
  lyDoTuChoi: string | null;
  createdAt: string;
}

export async function guiKhachKy(orderId: number): Promise<{ id: number }> {
  const res = await apiClient.post<{ id: number }>(SIGNATURE_ENDPOINTS.GUI(orderId));
  return res.data;
}

export async function layTrangThaiKy(orderId: number): Promise<TrangThaiKy | null> {
  const res = await apiClient.get<TrangThaiKy | null>(SIGNATURE_ENDPOINTS.TRANG_THAI(orderId));
  return res.data;
}
