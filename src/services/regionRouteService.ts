import apiClient from './apiClient';
import { PRICING_ENDPOINTS } from './apiEndpoints';
import { adaptPage } from './pageAdapter';
import type { ApiPage } from './pageAdapter';
import type { Page } from '@/types/pagination';
import type {
  ImportResult, PriceRegion, RegionRoute, RegionRouteFilters, RegionRoutePayload,
} from '@/types/pricing';

/*
 * Khu vực → tuyến → giá theo dịch vụ con và trọng tải xe.
 *
 * Khu vực KHÔNG nằm trên tuyến: nó nằm trên ĐỊA ĐIỂM, và khu vực của một tuyến
 * là khu vực của địa điểm nhận (migration 061). Vì thế payload lưu tuyến chỉ có
 * hai id địa điểm — không có khu vực, không có tỉnh. Muốn chuyển một tuyến sang
 * khu vực khác thì đổi khu vực của địa điểm nhận, ngay ở danh mục địa điểm cùng
 * màn này.
 */

/* --------------------------------------------------------------- khu vực */

export async function fetchRegions(sessionId?: number): Promise<PriceRegion[]> {
  const res = await apiClient.get<PriceRegion[]>(PRICING_ENDPOINTS.REGIONS, {
    params: sessionId === undefined ? {} : { sessionId },
  });
  return res.data;
}

export async function createRegion(name: string, managerId: number | null): Promise<void> {
  await apiClient.post(PRICING_ENDPOINTS.REGIONS, { name: name.trim(), managerId });
}

export async function updateRegion(
  regionId: number, name: string, managerId: number | null,
): Promise<void> {
  await apiClient.patch(PRICING_ENDPOINTS.REGION_DETAIL(regionId), { name: name.trim(), managerId });
}

/**
 * Xoá khu vực. Backend trả 409 nếu khu vực còn địa điểm.
 *
 * Không xoá theo địa điểm và cũng không xoá tuyến: địa điểm còn nằm trong đơn
 * cũ và bảng giá cũ. Màn hình nói trước số địa điểm phải dọn.
 */
export async function deleteRegion(regionId: number): Promise<void> {
  await apiClient.delete(PRICING_ENDPOINTS.REGION_DETAIL(regionId));
}

/* ----------------------------------------------------------------- tuyến */

/** Tuyến của MỘT khu vực — bảng bên phải của màn hình, không phân trang. */
export async function fetchRegionRoutes(
  regionId: number, sessionId?: number,
): Promise<RegionRoute[]> {
  const res = await apiClient.get<RegionRoute[]>(PRICING_ENDPOINTS.REGION_ROUTES_OF(regionId), {
    params: sessionId === undefined ? {} : { sessionId },
  });
  return res.data;
}

/** Danh sách tuyến phẳng của mọi khu vực, có lọc và phân trang như mọi list khác. */
export async function fetchRegionRouteList(filters: RegionRouteFilters): Promise<Page<RegionRoute>> {
  const res = await apiClient.get<ApiPage<RegionRoute>>(PRICING_ENDPOINTS.REGION_ROUTES, {
    params: filters,
  });
  return adaptPage(res.data, (x) => x);
}

export async function createRegionRoute(payload: RegionRoutePayload): Promise<void> {
  await apiClient.post(PRICING_ENDPOINTS.REGION_ROUTES, payload);
}

export async function updateRegionRoute(routeId: number, payload: RegionRoutePayload): Promise<void> {
  await apiClient.patch(PRICING_ENDPOINTS.REGION_ROUTE_DETAIL(routeId), payload);
}

export async function deleteRegionRoute(routeId: number): Promise<void> {
  await apiClient.delete(PRICING_ENDPOINTS.REGION_ROUTE_DETAIL(routeId));
}

/* ----------------------------------------------------------------- Excel */

/*
 * Một quy trình, ba lối: tải mẫu → điền → nhập; hoặc xuất → sửa → nhập lại.
 * File xuất ra dùng ĐÚNG cấu trúc file mẫu, nên nhập lại được nguyên trạng —
 * đó là cách sửa hàng loạt duy nhất mà người làm giá thật sự dùng.
 */

export async function downloadRegionRouteTemplate(): Promise<Blob> {
  const res = await apiClient.get<Blob>(PRICING_ENDPOINTS.REGION_ROUTES_TEMPLATE, {
    responseType: 'blob',
  });
  return res.data;
}

export async function downloadRegionRouteExport(sessionId?: number): Promise<Blob> {
  const res = await apiClient.get<Blob>(PRICING_ENDPOINTS.REGION_ROUTES_EXPORT, {
    responseType: 'blob',
    params: sessionId === undefined ? {} : { sessionId },
  });
  return res.data;
}

export async function importRegionRoutes(
  file: File, sessionId?: number,
): Promise<ImportResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await apiClient.post<ImportResult>(PRICING_ENDPOINTS.REGION_ROUTES_IMPORT, form, {
    params: sessionId === undefined ? {} : { sessionId },
  });
  return res.data;
}
