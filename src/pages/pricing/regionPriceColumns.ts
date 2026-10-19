import type { RegionRoute } from '@/types/pricing';

/** Một cột giá trên bảng rộng: một đơn vị tính. */
export interface CotDonVi {
  code: string;
  label: string;
}

/** Các đơn vị tính có mặt trong tập tuyến này, giữ nguyên thứ tự backend trả về. */
export function cotDonVi(routes: readonly RegionRoute[]): CotDonVi[] {
  const ra = new Map<string, string>();
  for (const r of routes)
    for (const s of r.services)
      for (const p of s.prices)
        if (!ra.has(p.unitCode)) ra.set(p.unitCode, p.unitLabel ?? p.unitCode);
  return [...ra].map(([code, label]) => ({ code, label }));
}

/**
 * Giá HAI CHIỀU = giá một chiều × 1,5 — tức là cộng thêm 50%.
 *
 * Bảng giá của Bee ghi MỘT con số cho mỗi loại xe, và con số đó là cước một
 * chiều; chiều về tính thêm nửa giá. Nhập Excel áp đúng luật này (backend), và
 * form cũng điền sẵn theo nó để hai đường vào ra cùng một con số.
 *
 * Điền SẴN chứ không khoá: tuyến nào có thoả thuận riêng thì gõ đè lên, và con
 * số đang lưu chính là con số đã báo cho khách.
 */
export const HE_SO_HAI_CHIEU = 1.5;

/** Giá hai chiều gợi ý từ giá một chiều. VND nên làm tròn về số nguyên. */
export const giaHaiChieu = (motChieu: number): number =>
  Math.round(motChieu * HE_SO_HAI_CHIEU);

/** Cước chành theo khối / tấn / pallet không có chiều về — giống backend. */
export const coChieuVe = (unitCode: string): boolean => !/^(CBM|TON)$|^PALLET_/.test(unitCode);
