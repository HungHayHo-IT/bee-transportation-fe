import type { DepartmentState, MilestoneStatus, OrderStatus } from '@/constants/orderStatus';
import type { ContainerType, OrderSource } from '@/constants/provinces';
import type { Page } from '@/types/pagination';
import type { ServiceDataValues } from '@/types/serviceField';

export interface OrderFile {
  id: string;
  name: string;
  mime: string;
  size: number;
  uploadedById: number;
  uploadedByName: string | null;
  /** Set when the file was attached to a milestone rather than to the order itself. */
  milestoneId: number | null;
  createdAt: string;
}

export interface OrderSummary {
  id: number;
  code: string;
  status: OrderStatus;
  statusLabel: string;
  serviceCode: string;
  serviceName: string;
  customerName: string | null;
  originProvince: string | null;
  destinationProvince: string | null;
  /** null = đơn khách tự gửi từ landing, chưa Sale nào bấm "Nhận đơn". */
  saleName: string | null;
  /**
   * Chưa có sale nào đứng tên đơn này — đơn từ landing/app, hoặc đơn Quản trị
   * viên nhập hộ. Mọi Sale đều thấy đơn như vậy và nhận được nó; nhận xong là
   * các Sale khác thôi thấy. Backend tính, FE không đoán theo `saleName` —
   * xem don-chua-co-sale.ts.
   */
  chuaCoSale: boolean;
  /** Nguồn đơn — 'website' là khách tự gửi từ form trên landing. */
  source: OrderSource | null;
  departmentName: string | null;
  /** Null means the caller may not see the amount, never zero revenue. */
  finalAmount: number | null;
  latestMilestone: string | null;
  createdAt: string;
  closedAt: string | null;
}

/**
 * A customer the directory does not hold yet. The backend creates it in the same
 * transaction as the order, and reuses the existing profile when the name already
 * matches one — so a hand-typed name can no longer split a customer's history.
 */
export interface NewCustomerPayload {
  companyName: string;
  contactName?: string;
  phone?: string;
  email?: string;
}

export interface CreateOrderPayload {
  serviceId: number;
  /**
   * Dịch vụ con — mang mã phương thức vận chuyển gửi sang OF1-TMS.
   * BẮT BUỘC nếu dịch vụ đã chọn có dịch vụ con đang dùng.
   */
  serviceChildId?: number;
  /** Mutually exclusive with `newCustomer`. */
  customerId?: number;
  newCustomer?: NewCustomerPayload;
  originProvince?: string;
  originAddress?: string;
  /** Địa điểm đầu tuyến — khoá để tra giá niêm yết. Bỏ trống thì đơn vẫn tạo được. */
  originLocationId?: number;
  destinationLocationId?: number;
  destinationProvince?: string;
  destinationAddress?: string;
  desiredDate?: string;
  weightKg?: number;
  volumeCbm?: number;
  packageCount?: number;
  quantityUnit?: string;
  containerType?: ContainerType;
  dimLM?: number;
  dimWM?: number;
  dimHM?: number;
  goodsName?: string;
  note?: string;
  source?: OrderSource;
  /** Values for the service's own input boxes; keys come from its form schema. */
  serviceData?: ServiceDataValues;
}

/**
 * Every field is optional: the endpoint patches what it receives. `changeNote` is
 * mandatory once the order is closed, so the amount history stays explainable.
 */
export interface UpdateOrderPayload {
  /**
   * Dịch vụ con — mang mã phương thức vận chuyển gửi sang OF1-TMS. Backend
   * nhận sửa (PATCH không bắt buộc), và mã đơn KHÔNG sinh lại: mã chốt một lần
   * lúc tạo và đã in trên hợp đồng.
   */
  serviceChildId?: number;
  originProvince?: string;
  originAddress?: string;
  /** Địa điểm đầu tuyến — khoá để tra giá niêm yết. Bỏ trống thì đơn vẫn tạo được. */
  originLocationId?: number;
  destinationLocationId?: number;
  destinationProvince?: string;
  destinationAddress?: string;
  desiredDate?: string;
  weightKg?: number;
  volumeCbm?: number;
  packageCount?: number;
  quantityUnit?: string;
  containerType?: ContainerType;
  dimLM?: number;
  dimWM?: number;
  dimHM?: number;
  goodsName?: string;
  note?: string;
  source?: OrderSource;
  /** Sending this replaces the WHOLE set; omitting it leaves the stored one alone. */
  serviceData?: ServiceDataValues;
  changeNote?: string;
}

export interface OrderDepartment {
  departmentId: number;
  departmentName: string;
  state: DepartmentState;
  assigneeName: string | null;
  /** Người phụ trách nhập báo giá — chỉ người này gửi được báo giá. */
  assigneeId?: number | null;
  passReason: string | null;
  /** Null when the sealed-quote rule hides it, never zero. */
  amount: number | null;
  scopeNote: string | null;
  leadTime: string | null;
  validUntil: string | null;
  quoteVersion: number;
  distributedAt: string | null;
  claimedAt: string | null;
  lastQuotedAt: string | null;
}

export interface OrderMilestone {
  id: number;
  seq: number;
  name: string;
  status: MilestoneStatus;
  note: string | null;
  doneAt: string | null;
  doneByName: string | null;
}

export interface OrderDetail extends OrderSummary {
  /** Needed to read the service's own field schema; the list rows do not carry it. */
  serviceId: number;
  serviceChildId: number | null;
  serviceChildName: string | null;
  /** Mã OF1-TMS của dịch vụ con. null = đơn này KHÔNG đẩy sang TMS được. */
  serviceChildTmsMode: string | null;
  /** Mã THỰC SỰ gửi sang OF1: của dịch vụ con nếu có, không thì của dịch vụ cha. */
  tmsMode: string | null;
  orderDay: string;
  dailyNo: number;
  customerId: number | null;
  originAddress: string | null;
  destinationAddress: string | null;
  /** Địa điểm đầu tuyến — khoá để tra giá niêm yết. null = đơn chưa khai. */
  originLocationId: number | null;
  originLocationName: string | null;
  destinationLocationId: number | null;
  destinationLocationName: string | null;
  desiredDate: string | null;
  weightKg: number | null;
  volumeCbm: number | null;
  packageCount: number | null;
  quantityUnit: string | null;
  containerType: ContainerType | null;
  dimLM: number | null;
  dimWM: number | null;
  dimHM: number | null;
  goodsName: string | null;
  note: string | null;
  source: OrderSource | null;
  rejectReason: string | null;
  /** Đơn landing: giá Sale chốt với khách. null = chưa nhập hoặc không được xem. */
  salePrice: number | null;
  /** Three separate notes since 23/08/2026; before that one column carried all three. */
  closeNote: string | null;
  rejectNote: string | null;
  cancelReason: string | null;
  /** Values of the service's own fields. Labels come from its form schema. */
  serviceData: Record<string, unknown>;
  /**
   * Labels of what this order still lacks, decided by the backend and only ever
   * non-empty while the status is awaiting_info. The banner prints it verbatim:
   * a second opinion computed here drifted from the backend's within one release
   * and left orders missing only a phone number showing an empty list.
   */
  missingInfo: string[];
  completedAt: string | null;
  /**
   * Đã đẩy sang OF1-TMS hay chưa.
   * null = chưa · dang_gui · nhan · tu_choi · khong_ro.
   *
   * `khong_ro` KHÔNG phải là "hỏng": mạng đứt giữa chừng, đơn có thể đã vào
   * OF1 rồi. Phải đối soát theo mã đơn trước khi gửi lại.
   */
  tmsStatus: string | null;
  tmsError: string | null;
  updatedAt: string;
  departments: OrderDepartment[];
  milestones: OrderMilestone[];
}

/** A person the current user may @mention on this order. */
export interface MentionableUser {
  id: number;
  fullName: string;
  roles: string[];
  departmentName: string | null;
}

export interface OrderComment {
  id: number;
  kind: string;
  body: string;
  departmentId: number | null;
  departmentName: string | null;
  authorId: number;
  authorName: string;
  mentions: number[];
  createdAt: string;
}

export interface TimelineItem {
  createdAt: string;
  action: string;
  actorName: string | null;
  detail: Record<string, unknown> | null;
}

export interface OrderFilters {
  status?: OrderStatus;
  serviceId?: number;
  departmentId?: number;
  assigneeId?: number;
  customerId?: number;
  /** Người TẠO đơn. Backend nhận đúng tên này (order-filter.dto.ts). */
  createdBy?: number;
  originProvince?: string;
  destinationProvince?: string;
  fromDate?: string;
  toDate?: string;
  dateField?: 'created' | 'closed' | 'completed';
  q?: string;
  /** One of the service's own fields, as `fieldKey:value`. Needs `serviceId` too. */
  sf?: string;
  sortBy?: OrderSortColumn;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/** The columns the order list lets a user sort by; the API accepts a few more. */
export const ORDER_SORT_COLUMNS = ['status', 'createdAt'] as const;

export type OrderSortColumn = (typeof ORDER_SORT_COLUMNS)[number];

export type OrderPage = Page<OrderSummary>;

/** The Kanban endpoint groups by status and omits statuses with no orders. */
export type OrderKanban = Partial<Record<OrderStatus, OrderSummary[]>>;
