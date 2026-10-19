/**
 * Every API path in one place. Nothing outside this file composes a URL.
 * The backend mounts a global `/api` prefix.
 */
const API = '/api';

export const AUTH_ENDPOINTS = {
  LOGIN: `${API}/auth/login`,
  LOGOUT: `${API}/auth/logout`,
  ME: `${API}/auth/me`,
  CHANGE_PASSWORD: `${API}/auth/change-password`,
  /** Doi tac Bee Logistics tu mo tai khoan — ba buoc. */
  PARTNER_SEND_CODE: `${API}/auth/doi-tac/gui-ma`,
  PARTNER_CHECK_CODE: `${API}/auth/doi-tac/kiem-ma`,
  PARTNER_CREATE: `${API}/auth/doi-tac/tao-tai-khoan`,
} as const;

const ORDERS = `${API}/orders`;

/** Ký điện tử — khách ký phiếu xác nhận đơn. */
export const SIGNATURE_ENDPOINTS = {
  GUI: (orderId: number) => `${ORDERS}/${orderId}/signature-request`,
  TRANG_THAI: (orderId: number) => `${ORDERS}/${orderId}/signature`,
} as const;

export const ORDER_ENDPOINTS = {
  LIST: ORDERS,
  CREATE: ORDERS,
  KANBAN: `${ORDERS}/kanban`,
  UNROUTED: `${ORDERS}/unrouted`,
  EXPORT: `${ORDERS}/export`,
  DETAIL: (orderId: number) => `${ORDERS}/${orderId}`,
  TIMELINE: (orderId: number) => `${ORDERS}/${orderId}/timeline`,
  TMS_PUSH: (orderId: number) => `${ORDERS}/${orderId}/tms`,
  TMS_CHECK: (orderId: number) => `${ORDERS}/${orderId}/tms/kiem`,
  NHAN: (orderId: number) => `${ORDERS}/${orderId}/nhan`,
  CLOSE: (orderId: number) => `${ORDERS}/${orderId}/close`,
  REJECT: (orderId: number) => `${ORDERS}/${orderId}/reject`,
  CANCEL: (orderId: number) => `${ORDERS}/${orderId}/cancel`,
  CONFIRMATION_PDF: (orderId: number) => `${ORDERS}/${orderId}/confirmation.pdf`,
} as const;

export const QUOTE_ENDPOINTS = {
  /**
   * Adding a department outside the routing matrix. There is no GET counterpart:
   * the per-department uptake and quotes arrive inside the order detail, already
   * filtered by the sealed-quote rule.
   */
  ADD_DEPARTMENT: (orderId: number) => `${ORDERS}/${orderId}/departments`,
  CLAIM: (orderId: number, departmentId: number) =>
    `${ORDERS}/${orderId}/departments/${departmentId}/claim`,
  ASSIGN: (orderId: number, departmentId: number) =>
    `${ORDERS}/${orderId}/departments/${departmentId}/assign`,
  PASS: (orderId: number, departmentId: number) =>
    `${ORDERS}/${orderId}/departments/${departmentId}/pass`,
  TRANSFER: (orderId: number, departmentId: number) =>
    `${ORDERS}/${orderId}/departments/${departmentId}/transfer`,
  QUOTE: (orderId: number, departmentId: number) =>
    `${ORDERS}/${orderId}/departments/${departmentId}/quote`,
  QUOTE_HISTORY: (orderId: number, departmentId: number) =>
    `${ORDERS}/${orderId}/departments/${departmentId}/quote-history`,
  REFERENCE_PRICES: (orderId: number) => `${ORDERS}/${orderId}/reference-prices`,
  SELECT_QUOTE: (orderId: number) => `${ORDERS}/${orderId}/select-quote`,
  SALE_PRICE: (orderId: number) => `${ORDERS}/${orderId}/sale-price`,
  REQUEST_REVISION: (orderId: number) => `${ORDERS}/${orderId}/request-revision`,
  QUEUE: `${API}/queue`,
} as const;

export const MILESTONE_ENDPOINTS = {
  /** The set is read from the order detail; only the update needs a path of its own. */
  UPDATE: (orderId: number, milestoneId: number) =>
    `${ORDERS}/${orderId}/milestones/${milestoneId}`,
} as const;

export const COLLABORATION_ENDPOINTS = {
  COMMENTS: (orderId: number) => `${ORDERS}/${orderId}/comments`,
  MENTIONABLES: (orderId: number) => `${ORDERS}/${orderId}/mentionables`,
  FILES: (orderId: number) => `${ORDERS}/${orderId}/files`,
  FILE_UPLOAD: (orderId: number) => `${ORDERS}/${orderId}/files`,
  FILE_DOWNLOAD: (orderId: number, fileId: string) => `${API}/files/${orderId}/${fileId}`,
  FILE_DELETE: (orderId: number, fileId: string) => `${ORDERS}/${orderId}/files/${fileId}`,
} as const;

const ORGANISATION = `${API}`;

export const ORGANISATION_ENDPOINTS = {
  DEPARTMENTS: `${ORGANISATION}/departments`,
  DEPARTMENT_DETAIL: (departmentId: number) => `${ORGANISATION}/departments/${departmentId}`,
  DEPARTMENT_SERVICES: (departmentId: number) =>
    `${ORGANISATION}/departments/${departmentId}/services`,
  DEPARTMENT_TREE: `${ORGANISATION}/departments/tree`,
  USERS: `${ORGANISATION}/users`,
  USER_DETAIL: (userId: number) => `${ORGANISATION}/users/${userId}`,
  USER_RESET_PASSWORD: (userId: number) => `${ORGANISATION}/users/${userId}/reset-password`,
  USER_STATUS: (userId: number) => `${ORGANISATION}/users/${userId}/status`,
  SERVICES: `${ORGANISATION}/services`,
  /** Thêm dịch vụ vừa vào danh mục BeeOps vừa hiện trên landing. */
  LANDING_SERVICES: `${ORGANISATION}/services/landing`,
  SERVICE_DETAIL: (serviceId: number) => `${ORGANISATION}/services/${serviceId}`,
  SERVICE_MILESTONES: (serviceId: number) => `${ORGANISATION}/services/${serviceId}/milestones`,
  /** Dich vu con mang ma phuong thuc van chuyen cua OF1-TMS. */
  SERVICE_CHILDREN: (serviceId: number) => `${ORGANISATION}/services/${serviceId}/children`,
  SERVICE_CHILD_DETAIL: (serviceId: number, childId: number) =>
    `${ORGANISATION}/services/${serviceId}/children/${childId}`,
  TMS_MODES: `${ORGANISATION}/services/tms-modes`,
  UNROUTED_SERVICES: `${ORGANISATION}/services/unrouted`,
  ACTIVITY: `${ORGANISATION}/activity`,
  /** Ma trận phân quyền theo trang menu. */
  PERMISSION_MATRIX: `${ORGANISATION}/permissions/matrix`,
  /** Mức quyền của chính tôi, theo từng trang — menu đọc bảng này. */
  MY_PAGE_LEVELS: `${ORGANISATION}/permissions/me`,
} as const;

/**
 * Per-service input boxes. `FORM_SCHEMA` is readable by anyone who can create an
 * order; the rest are admin-only. A field is addressed by its own id rather than
 * nested under its service — two ids in one path can only contradict each other.
 */
export const SERVICE_FIELD_ENDPOINTS = {
  FORM_SCHEMA: (serviceId: number) => `${ORGANISATION}/services/${serviceId}/form-schema`,
  FIELDS: (serviceId: number) => `${ORGANISATION}/services/${serviceId}/fields`,
  FIELD_DETAIL: (fieldId: number) => `${ORGANISATION}/services/fields/${fieldId}`,
} as const;

export const CUSTOMER_ENDPOINTS = {
  LIST: `${API}/customers`,
  CREATE: `${API}/customers`,
  DETAIL: (customerId: number) => `${API}/customers/${customerId}`,
} as const;

export const PRICING_ENDPOINTS = {
  LOCATIONS: `${API}/locations`,
  LOCATION_DETAIL: (id: number) => `${API}/locations/${id}`,
  SESSIONS: `${API}/price-sessions`,
  SESSION_ACTIVE: `${API}/price-sessions/active`,
  SESSION_DETAIL: (id: number) => `${API}/price-sessions/${id}`,
  SESSION_ACTIVATE: (id: number) => `${API}/price-sessions/${id}/activate`,
  SESSION_EXPORT: (id: number) => `${API}/price-sessions/${id}/export`,
  SESSION_IMPORT: (id: number) => `${API}/price-sessions/${id}/import`,
  PRICES: `${API}/route-prices`,
  PRICE_TEMPLATE: `${API}/route-prices/template`,
  /** Gợi ý giá theo tỉnh/thành — xem suggestListedPrice. */
  /* Gia niem yet hoi theo DON, khong theo cap dia diem: backend kiem pham vi
     don truoc nen cau tra loi chi noi ve mot tuyen nguoi goi von da thay. */
  LISTED_PRICE: (orderId: number) => `${API}/orders/${orderId}/listed-price`,
  PRICE_UNITS: `${API}/price-units`,
  LOCATIONS_IMPORT: `${API}/locations/import`,
  PRICE_DETAIL: (id: number) => `${API}/route-prices/${id}`,
  REGIONS: `${API}/price-regions`,
  REGION_DETAIL: (id: number) => `${API}/price-regions/${id}`,
  REGION_ROUTES_OF: (id: number) => `${API}/price-regions/${id}/routes`,
  REGION_ROUTES: `${API}/region-routes`,
  REGION_ROUTE_DETAIL: (id: number) => `${API}/region-routes/${id}`,
  REGION_ROUTES_TEMPLATE: `${API}/region-routes/template`,
  REGION_ROUTES_EXPORT: `${API}/region-routes/export`,
  REGION_ROUTES_IMPORT: `${API}/region-routes/import`,
} as const;

export const NOTIFICATION_ENDPOINTS = {
  LIST: `${API}/notifications`,
  UNREAD_COUNT: `${API}/notifications/unread-count`,
  MARK_READ: `${API}/notifications/read`,
  MY_TASKS: `${API}/notifications/my-tasks`,
  PREFERENCES: `${API}/notifications/preferences`,
  STREAM: `${API}/notifications/stream`,
} as const;

export const REFERENCE_ENDPOINTS = {
  PROVINCES: `${API}/reference/provinces`,
  ORDER_STATUSES: `${API}/reference/order-statuses`,
  REJECT_REASONS: `${API}/reference/reject-reasons`,
  ORDER_SOURCES: `${API}/reference/order-sources`,
  QUANTITY_UNITS: `${API}/reference/quantity-units`,
} as const;

export const NEWS_ENDPOINTS = {
  LIST: `${API}/news`,
  CREATE: `${API}/news`,
  DETAIL: (id: number) => `${API}/news/${id}`,
  UPDATE: (id: number) => `${API}/news/${id}`,
  DELETE: (id: number) => `${API}/news/${id}`,
  PRESIGN_IMAGE: `${API}/news/images/presign`,
} as const;

export const CMS_ENDPOINTS = {
  SCHEMA: `${API}/cms/schema`,
  CONTENT: `${API}/cms/content`,
  PRESIGN_IMAGE: `${API}/cms/images/presign`,
  TERMS: `${API}/cms/dieu-khoan`,
  TERMS_FULL: `${API}/cms/dieu-khoan/toan-van`,
  TERM_DETAIL: (id: number) => `${API}/cms/dieu-khoan/${id}`,
  PARTNER_LOGOS: `${API}/cms/partner-logos`,
  PARTNER_LOGOS_ORDER: `${API}/cms/partner-logos/order`,
  PARTNER_LOGO: (id: number) => `${API}/cms/partner-logos/${id}`,
} as const;

export const SALE_ENDPOINTS = {
  REPRESENTATIVES: `${API}/sale/representatives`,
  TOGGLE_REPRESENTATIVE: (userId: number) => `${API}/sale/representatives/${userId}`,
  PRESIGN_REPRESENTATIVE_IMAGE: `${API}/sale/representatives/images/presign`,
} as const;

export const LANDING_ENDPOINTS = {
  REPRESENTATIVES: `${API}/landing/representatives`,
} as const;

export const DASHBOARD_ENDPOINTS = {
  SUMMARY: `${API}/dashboard/summary`,
  REVENUE: `${API}/dashboard/revenue`,
  REVENUE_BY: `${API}/dashboard/revenue/by`,
  FUNNEL: `${API}/dashboard/funnel`,
  WIN_RATE: `${API}/dashboard/win-rate`,
  RESPONSE_TIME: `${API}/dashboard/response-time`,
  COMPETITION: `${API}/dashboard/competition`,
  COMPETITION_AVG_DEPARTMENTS: `${API}/dashboard/competition/avg-departments`,
  WORKLOAD: `${API}/dashboard/workload`,
  DRILL: `${API}/dashboard/drill`,
  STAFF_SCORECARD: `${API}/dashboard/staff-scorecard`,
  EXPORT: `${API}/dashboard/export`,
} as const;

/** Tham số hệ thống — danh sách khoá sửa được do backend khai. */
export const SETTINGS_ENDPOINTS = {
  ROOT: `${API}/settings`,
} as const;
