import apiClient, { isApiError } from './apiClient';
import { CUSTOMER_ENDPOINTS } from './apiEndpoints';
import { adaptPage } from './pageAdapter';
import type { ApiPage } from './pageAdapter';
import type { Page } from '@/types/pagination';
import type {
  Customer, CustomerDetail, CustomerPayload, CustomerStatus,
} from '@/types/customer';

interface ApiCustomer {
  id: number;
  /** Backend cũ hơn bản này không có trường — khách hiện ra không mã. */
  code?: string | null;
  companyName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  note: string | null;
  status: CustomerStatus;
  taxCode: string | null;
  businessLicence: string | null;
  rejectReason: string | null;
  reviewedByName: string | null;
  laBeeLogs?: boolean;
}

interface ApiCustomerDetail extends ApiCustomer {
  orderCount: number;
  totalRevenue: number | null;
}

function adaptCustomer(api: ApiCustomer): Customer {
  return {
    id: api.id,
    code: api.code ?? null,
    companyName: api.companyName,
    contactName: api.contactName,
    phone: api.phone,
    email: api.email,
    note: api.note,
    status: api.status,
    taxCode: api.taxCode,
    businessLicence: api.businessLicence,
    rejectReason: api.rejectReason,
    reviewedByName: api.reviewedByName,
    // Backend cũ hơn bản này không có trường — coi như khách thường.
    laBeeLogs: api.laBeeLogs ?? false,
  };
}

function adaptCustomerDetail(api: ApiCustomerDetail): CustomerDetail {
  return {
    ...adaptCustomer(api),
    orderCount: api.orderCount,
    totalRevenue: api.totalRevenue,
  };
}

export interface CustomerFilters {
  q?: string;
  page?: number;
  limit?: number;
  /**
   * Bỏ trống = CHỈ hồ sơ đã duyệt — cùng mặc định với backend.
   *
   * Ô chọn khách lúc tạo đơn dùng đúng đường này và không truyền gì, nên hồ sơ
   * đang chờ không bao giờ lọt vào đó. 'all' là để màn danh sách xem hết.
   */
  status?: CustomerStatus | 'all';
}

export async function fetchCustomers(filters: CustomerFilters): Promise<Page<Customer>> {
  const response = await apiClient.get<ApiPage<ApiCustomer>>(CUSTOMER_ENDPOINTS.LIST, {
    params: filters,
  });
  return adaptPage(response.data, adaptCustomer);
}

/**
 * Gợi ý cho ô chọn khách lúc tạo đơn.
 *
 * Lấy 100 — mức trần của backend — chứ không phải 20 mặc định: hệ thống đang
 * có hơn bảy trăm hồ sơ, và một danh sách 20 dòng trông như đã liệt kê hết
 * trong khi nó mới là 3%. Trả kèm `total` để màn hình nói ra còn bao nhiêu
 * chưa hiện, thay vì im lặng cắt.
 *
 * Vẫn tìm ở MÁY CHỦ theo từng chữ gõ vào: tải cả bảy trăm hồ sơ về rồi lọc
 * trong trình duyệt là gửi thừa dữ liệu khách hàng cho mọi lần mở form, và tới
 * khi danh mục gấp đôi thì nó hỏng lần nữa.
 */
const SO_GOI_Y = 100;

export async function searchCustomers(
  query: string,
): Promise<{ items: Customer[]; total: number }> {
  const page = await fetchCustomers(
    query.trim() === '' ? { limit: SO_GOI_Y } : { q: query.trim(), limit: SO_GOI_Y },
  );
  return { items: page.items, total: page.total };
}

/** Duyệt hoặc từ chối. Từ chối bắt buộc có lý do — backend chặn lại nếu thiếu. */
export async function fetchCustomerDetail(customerId: number): Promise<CustomerDetail> {
  const response = await apiClient.get<ApiCustomerDetail>(CUSTOMER_ENDPOINTS.DETAIL(customerId));
  return adaptCustomerDetail(response.data);
}

/**
 * A duplicate company name is answered with a 409 naming the profile that already
 * holds it, so the screen can offer that profile instead of creating a second one.
 */
export function findExistingCustomerId(error: unknown): number | undefined {
  if (!isApiError(error) || error.status !== 409) return undefined;
  const details = error.details;
  if (typeof details !== 'object' || details === null) return undefined;
  if (!('existingCustomerId' in details)) return undefined;
  const value = details.existingCustomerId;
  return typeof value === 'number' ? value : undefined;
}

export async function createCustomer(payload: CustomerPayload): Promise<Customer> {
  const response = await apiClient.post<ApiCustomer>(CUSTOMER_ENDPOINTS.CREATE, payload);
  return adaptCustomer(response.data);
}

export async function updateCustomer(
  customerId: number,
  payload: CustomerPayload,
): Promise<Customer> {
  const response = await apiClient.patch<ApiCustomer>(
    CUSTOMER_ENDPOINTS.DETAIL(customerId),
    payload,
  );
  return adaptCustomer(response.data);
}

/** Xoá hồ sơ khách. Backend trả 409 kèm số đơn nếu khách đang có đơn. */
export async function deleteCustomer(customerId: number): Promise<void> {
  await apiClient.delete(CUSTOMER_ENDPOINTS.DETAIL(customerId));
}
