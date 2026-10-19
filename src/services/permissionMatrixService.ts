import apiClient from './apiClient';
import { ORGANISATION_ENDPOINTS } from './apiEndpoints';

/** Ba mức, khớp đúng backend. Không có "phòng mình" — xem ghi chú ở màn ma trận. */
export type MucQuyen = 'none' | 'view' | 'edit' | 'full';

export interface TrangQuyen {
  key: string;
  group: string;
  /** 'scoped' = dữ liệu tự cắt theo phòng ban của người xem, bất kể ô ghi gì. */
  scope: 'all' | 'scoped';
}

export interface ODat {
  role: string;
  pageKey: string;
  level: MucQuyen;
}

export interface MaTranQuyen {
  pages: TrangQuyen[];
  roles: string[];
  cells: ODat[];
  /** Trang không được bỏ quyền của Quản trị viên. */
  lockedPage: string;
}

export async function fetchPermissionMatrix(): Promise<MaTranQuyen> {
  const res = await apiClient.get<MaTranQuyen>(ORGANISATION_ENDPOINTS.PERMISSION_MATRIX);
  return res.data;
}

/** Chỉ gửi những ô đã đổi. Một ô sai thì backend từ chối cả mẻ. */
export async function savePermissionMatrix(cells: ODat[]): Promise<{ saved: number }> {
  const res = await apiClient.put<{ saved: number }>(
    ORGANISATION_ENDPOINTS.PERMISSION_MATRIX,
    { cells },
  );
  return res.data;
}

/**
 * Mức quyền của chính người đang đăng nhập, theo từng trang.
 *
 * Menu bên quản trị dùng đúng bảng này để biết hiện mục nào — không phải một
 * bảng hằng số thứ hai. Hai nguồn cho cùng một câu hỏi thì sớm muộn chúng nói
 * hai thứ khác nhau, và người dùng thấy một mục menu mở ra là 403.
 */
export async function fetchMyPageLevels(): Promise<Record<string, MucQuyen>> {
  const res = await apiClient.get<{ levels: Record<string, MucQuyen> }>(
    ORGANISATION_ENDPOINTS.MY_PAGE_LEVELS,
  );
  return res.data.levels;
}
