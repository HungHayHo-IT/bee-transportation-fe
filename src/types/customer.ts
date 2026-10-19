/** pending = chờ duyệt · approved = dùng được · rejected = bị từ chối. */
export type CustomerStatus = 'pending' | 'approved' | 'rejected';

export interface Customer {
  id: number;
  /** Mã khách bên hệ thống cũ (CL000001..). Trống với khách chưa có mã. */
  code: string | null;
  /** Trống với khách đến từ form website — họ chỉ để lại tên người liên hệ. */
  companyName: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  note: string | null;
  status: CustomerStatus;
  /** Không bắt buộc — khách lẻ và khách từ form website không có. */
  taxCode: string | null;
  businessLicence: string | null;
  /** Chỉ có khi bị từ chối. */
  rejectReason: string | null;
  reviewedByName: string | null;
  /**
   * Khách là người của Bee Logistics, nhận ra qua tên miền email.
   * Backend suy ra từ email chứ không lưu — đổi email thì cờ này đổi theo.
   */
  laBeeLogs: boolean;
}

export interface CustomerDetail extends Customer {
  orderCount: number;
  /** Null means the caller may not see revenue, not that revenue is zero. */
  totalRevenue: number | null;
}

export interface CustomerPayload {
  /** Bỏ trống được: khách từ form website chưa có tên công ty. */
  companyName?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  note?: string;
  taxCode?: string;
  businessLicence?: string;
}
