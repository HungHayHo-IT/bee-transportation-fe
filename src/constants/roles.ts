/**
 * Sáu vai trò nội bộ. Giá trị PHẢI trùng enum Role ở backend (src/common/enums) — nó
 * là chuỗi lưu trong DB, không phải một nhãn.
 *
 * TÊN KHOÁ VÀ GIÁ TRỊ LỆCH NHAU Ở MỘT VAI, và đó là cố ý: 'staff' hiển thị là
 * "Pricing" vì cái tên cũ nói sai việc họ làm (pricing NHẬP GIÁ cho từng đơn),
 * nhưng chuỗi lưu trong DB vẫn là 'staff'.
 *
 * Vai 'sale' từng hiển thị là "Admin sale"; từ 07/10/2026 gọi thẳng là "Sale",
 * nên tên khoá, nhãn và chuỗi trong DB giờ trùng nhau cả ba.
 *
 * Vai 'leader' cũng vậy: từ 29/09/2026 hiển thị là "Giám đốc" (bản tiếng Anh:
 * "Director"), chuỗi trong DB giữ nguyên 'leader'. Chỉ nhãn đổi — xem
 * ROLE_LABEL_KEY.
 *
 * Giữ nguyên chuỗi cũ vì đổi nó là một migration chạm vào mọi tài khoản đang
 * dùng, và app mobile cũng đọc chuỗi này. Tên khoá ở đây đặt theo tên MỚI để
 * mã nguồn đọc ra đúng việc; chỉ dòng `Pricing` dưới đây còn biết tên cũ.
 */
export const Role = {
  Admin: 'admin',
  Leader: 'leader',
  Manager: 'manager',
  Sale: 'sale',
  Pricing: 'staff',
  /** Điều vận (079): chỉ xem đơn khu vực phòng mình quản lý, không báo giá. */
  Dispatcher: 'dispatcher',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ROLE_LABEL_KEY: Record<Role, string> = {
  [Role.Admin]: 'roles.admin',
  [Role.Leader]: 'roles.leader',
  [Role.Manager]: 'roles.manager',
  [Role.Sale]: 'roles.sale',
  [Role.Pricing]: 'roles.pricing',
  [Role.Dispatcher]: 'roles.dispatcher',
};

export const ALL_ROLES: readonly Role[] = Object.values(Role);

/**
 * Vai trò một trưởng phòng được cấp khi tạo tài khoản — soi đúng
 * MANAGER_GRANTABLE_ROLES ở backend (users/create-scope.helper.ts). Hai vai trò
 * còn lại là đường leo thang: Manager nhân bản quyền của chính họ, Leader mở báo
 * cáo toàn công ty.
 */
export const MANAGER_GRANTABLE_ROLES: readonly Role[] = [Role.Pricing, Role.Sale, Role.Dispatcher];

/** Narrows a select value or a stored string without an assertion. */
export function findRole(value: string): Role | undefined {
  return ALL_ROLES.find((role) => role === value);
}

export function findRoles(values: readonly string[]): Role[] {
  return values.map(findRole).filter((role): role is Role => role !== undefined);
}
