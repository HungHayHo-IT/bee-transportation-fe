export interface OrderRouteValues {
  originProvince: string;
  originAddress: string;
  destinationProvince: string;
  destinationAddress: string;
  /**
   * Địa điểm đầu tuyến trong danh mục — khoá để tra giá niêm yết.
   *
   * Chuỗi rỗng = chưa khai, và đơn vẫn tạo được: hàng giao tận nơi thì không
   * đi giữa hai kho nào cả. Tỉnh/thành ở trên vẫn giữ nguyên vai trò của nó —
   * đây là THÊM vào để tra giá, không phải thay cách mô tả đơn.
   */
  originLocationId: string;
  destinationLocationId: string;
  desiredDate: string;
}

export const EMPTY_ROUTE: OrderRouteValues = {
  originProvince: '',
  originAddress: '',
  destinationProvince: '',
  destinationAddress: '',
  originLocationId: '',
  destinationLocationId: '',
  desiredDate: '',
};

/**
 * Một đầu tuyến đọc thành một dòng chữ, cho các màn CHỈ XEM.
 *
 * `trongNuoc` sai thì đầu đó không có tỉnh/thành để đọc — danh mục tỉnh/thành
 * là danh mục Việt Nam — nên chỉ còn địa chỉ. Dùng chung giữa thẻ tóm tắt và
 * tab tổng quan để hai chỗ không mô tả cùng một đơn theo hai kiểu.
 */
export function doanTuyen(
  trongNuoc: boolean,
  tinh: string | null,
  diaChi: string | null,
): string {
  if (!trongNuoc) return diaChi ?? '—';
  return `${tinh ?? '—'}${diaChi === null ? '' : ` · ${diaChi}`}`;
}
