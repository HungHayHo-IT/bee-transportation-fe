/**
 * Tên gọi của một khách hàng trên màn hình: tên công ty, hoặc tên người liên hệ
 * nếu chưa có tên công ty.
 *
 * Khách đến từ form báo giá trên website không có tên công ty — form đó chỉ hỏi
 * tên người. Hiện thẳng `companyName` thì đúng những khách mới nhất, đang cần
 * người liên hệ nhất, lại là những dòng trống trơn trên danh bạ.
 *
 * Cùng một luật với `customerDisplayName` ở backend. Hai bên lệch nhau thì danh
 * sách đơn và danh bạ sẽ gọi cùng một khách bằng hai cái tên khác nhau.
 */
export function customerDisplayName(
  customer: { companyName: string | null; contactName: string | null } | null | undefined,
): string | null {
  if (!customer) return null;
  return customer.companyName?.trim() || customer.contactName?.trim() || null;
}
