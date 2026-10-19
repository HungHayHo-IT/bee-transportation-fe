import { Role } from './roles';

/**
 * The eight actions the specification distinguishes by role. Scope (whose rows a
 * user sees) and money visibility are separate mechanisms and are deliberately
 * not expressed here.
 */
export const PermissionAction = {
  CreateOrder: 'createOrder',
  /**
   * Sửa bảng giá niêm yết. Pricing là người nhập giá nên đây là việc của họ;
   * Sale KHÔNG sửa — họ dùng bảng giá để báo khách, và để người báo giá
   * tự sửa bảng giá thì con số niêm yết không còn là một cái mốc nào cả.
   */
  ManagePrices: 'managePrices',
  QuoteOrder: 'quoteOrder',
  SelectQuote: 'selectQuote',
  CloseOrder: 'closeOrder',
  UpdateMilestone: 'updateMilestone',
  ManageOrganisation: 'manageOrganisation',
  /**
   * Tạo tài khoản — POST /users. Rộng hơn ManageOrganisation: từ commit backend
   * 284d342 trưởng phòng tự tạo được Nhân viên/Sale cho phòng mình. Sửa, khoá và
   * cấp lại mật khẩu vẫn chỉ Admin, nên vẫn đi theo ManageOrganisation.
   */
  CreateUser: 'createUser',
  ViewDepartmentReport: 'viewDepartmentReport',
  /** Đọc danh sách nhân viên — cùng tuyến quyền với GET /users ở backend. */
  ViewStaffDirectory: 'viewStaffDirectory',
  ViewCompanyReport: 'viewCompanyReport',
  /**
   * Chuyển đơn sang OF1-TMS. Hai vai dưới đây PHẢI trùng @Roles ở
   * TmsController bên backend — lệch là nút hiện ra rồi bấm vào ăn 403, hoặc
   * tệ hơn: ẩn nút của người thật sự có quyền.
   *
   * Trưởng phòng KHÔNG có: đẩy đơn sang OF1 là tạo một bill thật bên đối tác,
   * và OF1 không chặn trùng — việc của người chốt đơn, không phải của người
   * điều hành một phòng.
   */
  PushToTms: 'pushToTms',
} as const;

export type PermissionAction = (typeof PermissionAction)[keyof typeof PermissionAction];

export const ACTION_ROLES: Record<PermissionAction, readonly Role[]> = {
  [PermissionAction.CreateOrder]: [Role.Admin, Role.Sale],
  [PermissionAction.ManagePrices]: [Role.Admin, Role.Pricing],
  // Chỉ Pricing nhập báo giá — và chỉ người đang phụ trách đơn (12/10/2026).
  [PermissionAction.QuoteOrder]: [Role.Pricing],
  [PermissionAction.SelectQuote]: [Role.Sale],
  [PermissionAction.CloseOrder]: [Role.Admin, Role.Sale],
  [PermissionAction.UpdateMilestone]: [Role.Manager, Role.Pricing],
  [PermissionAction.ManageOrganisation]: [Role.Admin],
  [PermissionAction.CreateUser]: [Role.Admin, Role.Manager],
  [PermissionAction.ViewDepartmentReport]: [Role.Admin, Role.Leader, Role.Manager],
  [PermissionAction.ViewStaffDirectory]: [Role.Admin, Role.Leader, Role.Manager],
  [PermissionAction.ViewCompanyReport]: [Role.Admin, Role.Leader],
  [PermissionAction.PushToTms]: [Role.Admin, Role.Sale],
};

/** Actions the per-user "view company report" flag grants without a role change. */
export const FLAG_GRANTED_ACTIONS: readonly PermissionAction[] = [
  PermissionAction.ViewCompanyReport,
  PermissionAction.ViewDepartmentReport,
];

export type ReportTier = 'company' | 'department' | 'personal';
