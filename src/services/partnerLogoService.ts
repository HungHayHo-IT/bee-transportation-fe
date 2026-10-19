import apiClient from './apiClient';
import { CMS_ENDPOINTS } from './apiEndpoints';

/** Một logo trong hai dải đối tác của trang chủ landing. */
export interface PartnerLogo {
  id: number;
  group: 'customer' | 'membership';
  name: string;
  /** '/img/logos/...' (có sẵn trong landing) hoặc URL S3 (tải lên từ CMS). */
  imageUrl: string;
  /** Rộng/cao của ảnh — landing chia kích thước theo diện tích nhờ nó. */
  ratio: number;
  sortOrder: number;
  isActive: boolean;
}

export async function fetchPartnerLogos(): Promise<PartnerLogo[]> {
  const res = await apiClient.get<PartnerLogo[]>(CMS_ENDPOINTS.PARTNER_LOGOS);
  return res.data;
}

export async function createPartnerLogo(body: {
  group: PartnerLogo['group'];
  name: string;
  imageUrl: string;
  ratio: number;
}): Promise<PartnerLogo> {
  const res = await apiClient.post<PartnerLogo>(CMS_ENDPOINTS.PARTNER_LOGOS, body);
  return res.data;
}

export async function updatePartnerLogo(
  id: number,
  body: { name?: string; isActive?: boolean },
): Promise<PartnerLogo> {
  const res = await apiClient.patch<PartnerLogo>(CMS_ENDPOINTS.PARTNER_LOGO(id), body);
  return res.data;
}

/** Đặt lại thứ tự CẢ NHÓM — `ids` phải đủ mọi logo của nhóm, đầu mảng là đầu dải. */
export async function reorderPartnerLogos(
  group: PartnerLogo['group'],
  ids: number[],
): Promise<PartnerLogo[]> {
  const res = await apiClient.put<PartnerLogo[]>(CMS_ENDPOINTS.PARTNER_LOGOS_ORDER, { group, ids });
  return res.data;
}

export async function deletePartnerLogo(id: number): Promise<void> {
  await apiClient.delete(CMS_ENDPOINTS.PARTNER_LOGO(id));
}

/**
 * Đo rộng/cao của một ảnh NGAY TRÊN TRÌNH DUYỆT, trước khi tải lên.
 *
 * Landing cần tỉ lệ này để logo dài thấp xuống, logo vuông cao lên — cả dải
 * trông đều. Đo ở đây vì trình duyệt đọc được cả SVG lẫn ảnh raster mà không
 * phải thêm thư viện xử lý ảnh nào ở backend.
 */
export function doTiLe(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (!img.naturalWidth || !img.naturalHeight) reject(new Error('Không đọc được kích thước ảnh'));
      else resolve(img.naturalWidth / img.naturalHeight);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('File này không phải ảnh đọc được'));
    };
    img.src = url;
  });
}
