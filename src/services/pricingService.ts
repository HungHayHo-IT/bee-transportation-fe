import apiClient from './apiClient';
import { PRICING_ENDPOINTS } from './apiEndpoints';
import { adaptPage } from './pageAdapter';
import type { ApiPage } from './pageAdapter';
import type { Page } from '@/types/pagination';
import type {
  ImportResult, Location, LocationPayload, PriceSession, PriceSessionPayload, PriceUnit,
  RoutePrice, RoutePricePayload,
} from '@/types/pricing';

/* ------------------------------------------------------------------ địa điểm */

export async function fetchLocations(params: {
  q?: string;
  includeInactive?: boolean;
  /** Lọc theo tỉnh/thành. Backend nhận cả tên cũ trước sáp nhập 2025. */
  province?: string;
  /** Lọc theo khu vực bảng giá — danh mục địa điểm trong màn Khu vực & tuyến. */
  regionId?: number;
} = {}): Promise<Page<Location>> {
  const res = await apiClient.get<ApiPage<Location>>(PRICING_ENDPOINTS.LOCATIONS, { params });
  return adaptPage(res.data, (x) => x);
}

export async function createLocation(payload: LocationPayload): Promise<Location> {
  const res = await apiClient.post<Location>(PRICING_ENDPOINTS.LOCATIONS, payload);
  return res.data;
}

export async function updateLocation(
  id: number,
  payload: Partial<LocationPayload> & { isActive?: boolean },
): Promise<Location> {
  const res = await apiClient.patch<Location>(PRICING_ENDPOINTS.LOCATION_DETAIL(id), payload);
  return res.data;
}

/* ------------------------------------------------------------------ phiên giá */

export async function fetchPriceSessions(): Promise<Page<PriceSession>> {
  const res = await apiClient.get<ApiPage<PriceSession>>(PRICING_ENDPOINTS.SESSIONS);
  return adaptPage(res.data, (x) => x);
}

/** Phiên đang áp dụng, hoặc null khi chưa ai công bố phiên nào. */
export async function fetchActiveSession(): Promise<PriceSession | null> {
  const res = await apiClient.get<PriceSession | null>(PRICING_ENDPOINTS.SESSION_ACTIVE);
  return res.data;
}

/* ------------------------------------------------------------------ giá tuyến */

export interface RoutePriceFilters {
  /** Bỏ trống = phiên ĐANG ÁP DỤNG — cùng mặc định với backend. */
  sessionId?: number;
  q?: string;
  /** Lọc theo đơn vị tính — bảng trở về một dòng một tuyến. */
  unitCode?: string;
  page?: number;
  limit?: number;
}

export async function fetchRoutePrices(f: RoutePriceFilters): Promise<Page<RoutePrice>> {
  const res = await apiClient.get<ApiPage<RoutePrice>>(PRICING_ENDPOINTS.PRICES, { params: f });
  return adaptPage(res.data, (x) => x);
}

/** Danh mục đơn vị tính. `sessionId`: chỉ đơn vị CÓ giá trong phiên đó. */
export async function fetchPriceUnits(sessionId?: number): Promise<PriceUnit[]> {
  const res = await apiClient.get<PriceUnit[]>(PRICING_ENDPOINTS.PRICE_UNITS, {
    params: sessionId === undefined ? {} : { sessionId },
  });
  return res.data;
}

export async function createRoutePrice(payload: RoutePricePayload): Promise<RoutePrice> {
  const res = await apiClient.post<RoutePrice>(PRICING_ENDPOINTS.PRICES, payload);
  return res.data;
}

export async function updateRoutePrice(
  id: number,
  payload: { price?: number; note?: string },
): Promise<RoutePrice> {
  const res = await apiClient.patch<RoutePrice>(PRICING_ENDPOINTS.PRICE_DETAIL(id), payload);
  return res.data;
}

export async function deleteRoutePrice(id: number): Promise<void> {
  await apiClient.delete(PRICING_ENDPOINTS.PRICE_DETAIL(id));
}

/* ------------------------------------------------------------------ nhập/xuất */

/**
 * File Excel của một phiên.
 *
 * Đi qua apiClient chứ không mở thẳng URL trong tab mới: phiên đăng nhập nằm
 * trong cookie httpOnly cùng origin, mà một tab mới tới địa chỉ API sẽ hiện
 * file JSON lỗi nếu cookie không đi kèm — và người dùng chỉ thấy một tab trắng.
 * Trả về Blob như mọi file xuất khác; màn gọi `downloadBlobAsFile` để lưu.
 */
export async function createPriceSession(payload: PriceSessionPayload): Promise<PriceSession> {
  const res = await apiClient.post<PriceSession>(PRICING_ENDPOINTS.SESSIONS, payload);
  return res.data;
}

export async function updatePriceSession(
  id: number,
  payload: Partial<PriceSessionPayload>,
): Promise<PriceSession> {
  const res = await apiClient.patch<PriceSession>(PRICING_ENDPOINTS.SESSION_DETAIL(id), payload);
  return res.data;
}

export async function activatePriceSession(id: number): Promise<PriceSession> {
  const res = await apiClient.post<PriceSession>(PRICING_ENDPOINTS.SESSION_ACTIVATE(id));
  return res.data;
}

export async function deletePriceSession(id: number): Promise<void> {
  await apiClient.delete(PRICING_ENDPOINTS.SESSION_DETAIL(id));
}

export async function downloadPriceSessionExport(id: number): Promise<Blob> {
  const res = await apiClient.get<Blob>(PRICING_ENDPOINTS.SESSION_EXPORT(id), {
    responseType: 'blob',
  });
  return res.data;
}

/**
 * Nhập danh mục địa điểm từ Excel.
 *
 * Tên ĐÃ CÓ thì bỏ qua, không ghi đè — nhập lại cả danh mục là chuyện thường,
 * và ghi đè sẽ xoá mất địa chỉ, mã OF1 mà người ta bổ sung bằng tay.
 */
export async function importLocations(file: File): Promise<ImportResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await apiClient.post<ImportResult>(PRICING_ENDPOINTS.LOCATIONS_IMPORT, form);
  return res.data;
}

/**
 * Một mức giá niêm yết của tuyến, theo một ĐƠN VỊ TÍNH.
 *
 * Một tuyến có nhiều mức — 8 với container, 6 với xe tải, 11 với đường dài —
 * nên đây là một DÒNG, không phải cả câu trả lời.
 */
export interface MucGiaNiemYet {
  unitCode: string;
  unitLabel: string;
  /** FCL | LCL. Suy từ loại xe: DC -> FCL, tính theo tấn -> LCL. */
  unitKind: string;
  price: number;
}

/**
 * Giá niêm yết của một tuyến, theo phiên ĐANG ÁP DỤNG.
 *
 * `units` rỗng = bảng giá không nói gì về tuyến này. Khác hẳn giá bằng 0, và
 * màn báo giá phải im lặng chứ không hiện con số nào.
 */
export interface GiaNiemYetTuyen {
  units: MucGiaNiemYet[];
  sessionName: string | null;
}

/**
 * Tra giá theo CẶP ĐỊA ĐIỂM — đủ cả hai đầu mới hỏi. KHÔNG xét dịch vụ: cước
 * một chặng là tiền của chặng đường và loại xe, nó không đổi vì đơn được xếp
 * vào dịch vụ nào.
 *
 * Thay cho cách tra theo cặp TỈNH trước đây. Từ sáp nhập 2025, Quảng Nam đã
 * nhập vào Đà Nẵng, nên những tuyến như "Đà Nẵng → Tam Kỳ" trở thành tuyến nội
 * tỉnh — tra theo cặp tỉnh trả về một khoảng gộp cả miền Trung, tức là một con
 * số không dùng được. Bảng giá vốn khoá theo địa điểm; giờ hỏi đúng như vậy.
 *
 * Thiếu một đầu thì KHÔNG gọi API: không có tuyến nào để nói tới.
 */
/**
 * Giá niêm yết của tuyến mà MỘT ĐƠN đang đi.
 *
 * Hỏi theo `orderId` chứ không gửi cặp địa điểm: backend kiểm phạm vi đơn
 * trước, nên câu trả lời chỉ nói về một tuyến mà người gọi vốn đã nhìn thấy.
 * Nhờ vậy nó đi theo quyền ĐƠN HÀNG — đơn đã phân phối thì phòng ban nào xử lý
 * cũng thấy giá — mà không mở đường dò cả bảng giá bằng cách thử từng cặp.
 */
export async function lookupRoutePrice(orderId: number): Promise<GiaNiemYetTuyen> {
  const res = await apiClient.get<GiaNiemYetTuyen>(PRICING_ENDPOINTS.LISTED_PRICE(orderId));
  return res.data;
}
