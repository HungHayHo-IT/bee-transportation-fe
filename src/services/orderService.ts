import apiClient, { isApiError } from './apiClient';
import { COLLABORATION_ENDPOINTS, ORDER_ENDPOINTS } from './apiEndpoints';
import { adaptPage } from './pageAdapter';
import type { ApiPage } from './pageAdapter';
import { THREAD_PAGE_LIMIT } from '@/constants/pagination';
import type { Page } from '@/types/pagination';
import type { RejectReason } from '@/constants/rejectReasons';
import type {
  CreateOrderPayload,
  OrderDetail,
  OrderFile,
  OrderFilters,
  OrderKanban,
  OrderPage,
  OrderSummary,
  TimelineItem,
  UpdateOrderPayload,
} from '@/types/order';
import type { OrderStatus } from '@/constants/orderStatus';
import { toContainerType, toOrderSource } from '@/constants/provinces';

interface ApiOrderSummary {
  id: number;
  code: string;
  status: string;
  statusLabel: string;
  serviceCode: string;
  serviceName: string;
  customerName: string | null;
  originProvince: string | null;
  destinationProvince: string | null;
  saleName: string | null;
  chuaCoSale?: boolean;
  source?: string | null;
  departmentName: string | null;
  finalAmount: number | null;
  latestMilestone: string | null;
  createdAt: string;
  closedAt: string | null;
}

interface ApiOrderDetail extends ApiOrderSummary {
  serviceId: number;
  // Backend cu hon ban dich vu con khong co ba truong nay — doc bang `??`
  // ben duoi de man chi tiet khong vo khi ghep voi API cu.
  serviceChildId?: number | null;
  serviceChildName?: string | null;
  serviceChildTmsMode?: string | null;
  tmsMode?: string | null;
  orderDay: string;
  dailyNo: number;
  customerId: number | null;
  originAddress: string | null;
  originLocationId: number | null;
  originLocationName: string | null;
  destinationLocationId: number | null;
  destinationLocationName: string | null;
  destinationAddress: string | null;
  desiredDate: string | null;
  weightKg: number | null;
  volumeCbm: number | null;
  packageCount: number | null;
  quantityUnit: string | null;
  containerType: string | null;
  dimLM: number | null;
  dimWM: number | null;
  dimHM: number | null;
  goodsName: string | null;
  note: string | null;
  source: string | null;
  rejectReason: string | null;
  /** Đơn landing: giá Sale chốt với khách. Backend cũ không trả trường này. */
  salePrice?: number | null;
  closeNote: string | null;
  rejectNote: string | null;
  cancelReason: string | null;
  serviceData: Record<string, unknown> | null;
  missingInfo: string[] | null;
  completedAt: string | null;
  /** Backend cũ hơn bản tích hợp OF1-TMS không có hai trường này. */
  tmsStatus?: string | null;
  tmsError?: string | null;
  updatedAt: string;
  departments: OrderDetail['departments'];
  milestones: OrderDetail['milestones'];
}

interface ApiOrderFile {
  id: string;
  name: string;
  mime: string;
  size: number;
  uploadedById: number;
  uploadedByName: string | null;
  createdAt: string;
  milestoneId: number | null;
}

interface ApiTimelineItem {
  createdAt: string;
  action: string;
  actorName: string | null;
  detail: Record<string, unknown> | null;
}

export function adaptOrderFile(api: ApiOrderFile): OrderFile {
  return {
    id: api.id,
    name: api.name,
    mime: api.mime,
    size: api.size,
    uploadedById: api.uploadedById,
    uploadedByName: api.uploadedByName,
    milestoneId: api.milestoneId,
    createdAt: api.createdAt,
  };
}

export function adaptOrderSummary(api: ApiOrderSummary): OrderSummary {
  return {
    id: api.id,
    code: api.code,
    status: api.status as OrderStatus,
    statusLabel: api.statusLabel,
    serviceCode: api.serviceCode,
    serviceName: api.serviceName,
    customerName: api.customerName,
    originProvince: api.originProvince,
    destinationProvince: api.destinationProvince,
    saleName: api.saleName,
    // Backend cu chua tra co nay thi coi nhu don DA co sale: thieu nut con hon
    // moi moi Sale nhan mot don khong phai cua ho.
    chuaCoSale: api.chuaCoSale ?? false,
    source: api.source ? (toOrderSource(api.source) ?? null) : null,
    departmentName: api.departmentName,
    finalAmount: api.finalAmount,
    latestMilestone: api.latestMilestone,
    createdAt: api.createdAt,
    closedAt: api.closedAt,
  };
}

/** The backend generates the code and distributes the order in the same transaction. */
export async function createOrder(payload: CreateOrderPayload): Promise<OrderSummary> {
  const response = await apiClient.post<ApiOrderSummary>(ORDER_ENDPOINTS.CREATE, payload);
  return adaptOrderSummary(response.data);
}

/**
 * Attachments belong to an order, so they can only be uploaded once it exists.
 * The endpoint takes the first file part of the request, one file per call.
 */
export async function uploadOrderFile(
  orderId: number,
  file: File,
  /** Gắn file vào một mốc tiến độ (ảnh giao hàng, biên bản nghiệm thu) thay vì vào đơn. */
  milestoneId?: number,
): Promise<OrderFile> {
  const form = new FormData();
  form.append('file', file);
  const response = await apiClient.post<ApiOrderFile>(
    COLLABORATION_ENDPOINTS.FILES(orderId),
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      ...(milestoneId === undefined ? {} : { params: { milestoneId } }),
    },
  );
  return adaptOrderFile(response.data);
}

export async function fetchOrders(filters: OrderFilters): Promise<OrderPage> {
  const response = await apiClient.get<ApiPage<ApiOrderSummary>>(ORDER_ENDPOINTS.LIST, {
    params: filters,
  });
  return adaptPage(response.data, adaptOrderSummary);
}

/** Grouped by status; statuses with no orders are simply absent from the object. */
export async function fetchOrderKanban(filters: OrderFilters): Promise<OrderKanban> {
  const response = await apiClient.get<Record<string, ApiOrderSummary[]>>(ORDER_ENDPOINTS.KANBAN, {
    params: filters,
  });
  const kanban: OrderKanban = {};
  for (const [status, rows] of Object.entries(response.data)) {
    kanban[status as OrderStatus] = rows.map(adaptOrderSummary);
  }
  return kanban;
}

export async function fetchOrderDetail(orderId: number): Promise<OrderDetail> {
  const response = await apiClient.get<ApiOrderDetail>(ORDER_ENDPOINTS.DETAIL(orderId));
  const api = response.data;
  return {
    ...adaptOrderSummary(api),
    serviceId: api.serviceId,
    serviceChildId: api.serviceChildId ?? null,
    serviceChildName: api.serviceChildName ?? null,
    serviceChildTmsMode: api.serviceChildTmsMode ?? null,
    tmsMode: api.tmsMode ?? null,
    orderDay: api.orderDay,
    dailyNo: api.dailyNo,
    customerId: api.customerId,
    originAddress: api.originAddress,
    originLocationId: api.originLocationId,
    originLocationName: api.originLocationName,
    destinationLocationId: api.destinationLocationId,
    destinationLocationName: api.destinationLocationName,
    destinationAddress: api.destinationAddress,
    desiredDate: api.desiredDate,
    weightKg: api.weightKg,
    volumeCbm: api.volumeCbm,
    packageCount: api.packageCount,
    quantityUnit: api.quantityUnit ?? null,
    containerType: api.containerType === null ? null : (toContainerType(api.containerType) ?? null),
    dimLM: api.dimLM,
    dimWM: api.dimWM,
    dimHM: api.dimHM,
    goodsName: api.goodsName,
    note: api.note,
    source: api.source === null ? null : (toOrderSource(api.source) ?? null),
    rejectReason: api.rejectReason,
    salePrice: api.salePrice ?? null,
    closeNote: api.closeNote,
    rejectNote: api.rejectNote,
    cancelReason: api.cancelReason,
    // An order created before per-service fields has none; an empty object keeps
    // every reader from having to null-check the same thing.
    serviceData: api.serviceData ?? {},
    // Tolerate an API deployed before this field existed: an empty list reads as
    // "nothing outstanding", which is what every non-awaiting_info order means.
    missingInfo: api.missingInfo ?? [],
    completedAt: api.completedAt,
    tmsStatus: api.tmsStatus ?? null,
    tmsError: api.tmsError ?? null,
    updatedAt: api.updatedAt,
    departments: api.departments,
    milestones: api.milestones,
  };
}

/**
 * Paginated like the comment thread: page 1 is the oldest entry, which is the
 * order this tab already renders in. Ask for the backend's cap in one request and
 * carry `total` back so a longer history can say what is missing.
 */
export async function fetchOrderTimeline(orderId: number): Promise<Page<TimelineItem>> {
  const response = await apiClient.get<ApiPage<ApiTimelineItem>>(
    ORDER_ENDPOINTS.TIMELINE(orderId),
    { params: { limit: THREAD_PAGE_LIMIT } },
  );
  return adaptPage(response.data, (api) => ({
    createdAt: api.createdAt,
    action: api.action,
    actorName: api.actorName,
    detail: api.detail,
  }));
}

/** Streams an Excel file built from exactly the filters on screen. */
export async function downloadOrdersExport(filters: OrderFilters): Promise<Blob> {
  const response = await apiClient.get<Blob>(ORDER_ENDPOINTS.EXPORT, {
    params: filters,
    responseType: 'blob',
  });
  return response.data;
}

/** Closing locks the amount as revenue and generates the milestone set. */
/**
 * Sale đứng tên một đơn chưa có ai nhận. Chỉ đổi người phụ trách, không đổi
 * trạng thái — 409 nếu có người nhận trước mất rồi.
 */
export async function nhanDon(orderId: number): Promise<void> {
  await apiClient.post(ORDER_ENDPOINTS.NHAN(orderId));
}

export async function closeOrder(orderId: number, note: string): Promise<void> {
  await apiClient.post(ORDER_ENDPOINTS.CLOSE(orderId), note === '' ? {} : { note });
}

/**
 * A rejection is the customer's decision and counts in the win-rate denominator,
 * which is why the reason comes from a fixed list rather than free text.
 */
export async function rejectOrder(
  orderId: number,
  rejectReason: RejectReason,
  note: string,
): Promise<void> {
  await apiClient.post(ORDER_ENDPOINTS.REJECT(orderId), {
    rejectReason,
    ...(note === '' ? {} : { note }),
  });
}

/** Cancellation is an internal event and stays out of the win-rate denominator. */
export async function cancelOrder(orderId: number, reason: string): Promise<void> {
  await apiClient.post(ORDER_ENDPOINTS.CANCEL(orderId), { reason });
}

export async function downloadConfirmationPdf(orderId: number): Promise<Blob> {
  const response = await apiClient.get<Blob>(ORDER_ENDPOINTS.CONFIRMATION_PDF(orderId), {
    responseType: 'blob',
  });
  return response.data;
}

/** `changeNote` is mandatory once the order is closed — the backend rejects it otherwise. */
export async function updateOrder(orderId: number, payload: UpdateOrderPayload): Promise<void> {
  await apiClient.patch(ORDER_ENDPOINTS.DETAIL(orderId), payload);
}

/* ----------------------------------------------------------------- OF1-TMS */

/** Một ô bắt buộc mà đơn còn thiếu, kèm chỗ sửa. */
export interface OThieuTms {
  truong: string;
  nhan: string;
  suaODau: string;
}

export interface KetQuaDayTms {
  /** `khong_ro` KHÔNG phải là hỏng — xem ghi chú ở `OrderDetail.tmsStatus`. */
  ketQua: 'nhan' | 'tu_choi' | 'khong_ro';
  loi: string | null;
  /** Cảnh báo của OF1 (của hồ sơ khách và của đơn). Có thể có cả khi `nhan`. */
  canhBao?: string[];
}

/** Đơn còn thiếu ô bắt buộc nào. Mảng rỗng = chuyển được. KHÔNG gửi gì sang OF1. */
export async function kiemDonTms(orderId: number): Promise<OThieuTms[]> {
  const response = await apiClient.get<{ thieu: OThieuTms[] }>(ORDER_ENDPOINTS.TMS_CHECK(orderId));
  return response.data.thieu;
}

/**
 * Chuyển đơn sang OF1-TMS.
 *
 * Ném lỗi 422 kèm `thieu` khi đơn chưa đủ thông tin — chỗ gọi bắt lấy để hiện
 * danh sách thay vì chỉ hiện một câu chung chung.
 */
export async function chuyenDonSangTms(orderId: number): Promise<KetQuaDayTms> {
  const response = await apiClient.post<KetQuaDayTms>(ORDER_ENDPOINTS.TMS_PUSH(orderId));
  return response.data;
}

/**
 * Danh sách ô thiếu của lỗi 422; mọi lỗi khác trả mảng rỗng.
 *
 * Đọc ở `error.details` chứ KHÔNG ở `error.response`: interceptor của
 * apiClient nâng `details` của backend lên thẳng đó rồi ném một Error thường,
 * nên `error.response` của axios không còn tồn tại ở chỗ người gọi.
 */
export function docOThieu(error: unknown): OThieuTms[] {
  if (!isApiError(error)) return [];
  const than = (error.details as { thieu?: unknown } | undefined)?.thieu;
  return Array.isArray(than) ? (than as OThieuTms[]) : [];
}
