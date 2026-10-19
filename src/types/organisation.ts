import type { Role } from '@/constants/roles';
import type { Page } from '@/types/pagination';

export interface Department {
  id: number;
  name: string;
  managerId: number | null;
  managerName: string | null;
  parentId: number | null;
  serviceIds: number[];
  isActive: boolean;
  /** Phòng Sale: Sale tạo đơn mọi dịch vụ, phòng KHÔNG tham gia báo giá. */
  isSales: boolean;
  /** Phòng báo giá (079): duy nhất phòng nhận đơn và báo giá. */
  isQuoting: boolean;
  memberCount: number;
}

export interface OrganisationUser {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  departmentId: number | null;
  departmentName: string | null;
  roles: Role[];
  canViewCompanyReport: boolean;
  /** Cờ "Xem toàn bộ đơn (chỉ xem)" — cho người báo giá. */
  canViewAllOrders: boolean;
  mustChangePassword: boolean;
  isActive: boolean;
}

export interface Service {
  id: number;
  code: string;
  name: string;
  slaHours: number;
  milestones: string[];
  sortOrder: number;
  isActive: boolean;
  departmentIds: number[];
  /** Which shared cargo figures this service shows; empty hides the block entirely. */
  cargoFields: string[];
  /**
   * Khoá landing của dịch vụ tự thêm. null = dịch vụ này không hiện trên trang
   * giới thiệu, tức là một trong những dịch vụ có sẵn từ đầu.
   */
  landingKey: string | null;
}

/**
 * Dịch vụ con — một lựa chọn hẹp hơn bên trong một dịch vụ lớn, mang mã phương
 * thức vận chuyển của OF1-TMS.
 */
export interface ServiceChild {
  id: number;
  serviceId: number;
  name: string;
  /** null = chưa có mã. Đơn của dịch vụ con này KHÔNG đẩy sang TMS được. */
  tmsMode: string | null;
  sortOrder: number;
  isActive: boolean;
  /** Số đơn đang dùng. > 0 thì không xoá được, chỉ tắt. */
  orderCount: number;
}

export interface ActivityEntry {
  id: number;
  orderId: number | null;
  orderCode: string | null;
  entity: string;
  entityId: string;
  action: string;
  actorId: number | null;
  actorName: string | null;
  detail: Record<string, unknown> | null;
  createdAt: string;
}

export type ActivityPage = Page<ActivityEntry>;

export interface CreateDepartmentPayload {
  name: string;
  managerId?: number;
  parentId?: number | null;
  serviceIds: number[];
}

export interface UpdateDepartmentPayload {
  name?: string;
  managerId?: number;
  parentId?: number | null;
  isActive?: boolean;
}

export interface CreateUserPayload {
  email: string;
  fullName: string;
  phone?: string;
  departmentId?: number;
  roles: Role[];
  tempPassword?: string;
}

export interface UpdateUserPayload {
  fullName?: string;
  phone?: string;
  departmentId?: number;
  roles?: Role[];
  canViewCompanyReport?: boolean;
  canViewAllOrders?: boolean;
}

export interface UpdateServicePayload {
  name?: string;
  slaHours?: number;
  sortOrder?: number;
  isActive?: boolean;
  cargoFields?: string[];
}

export interface DepartmentMember {
  id: number;
  fullName: string;
  roles: Role[];
}

/** One node of the org chart; `children` nests to any depth. */
export interface DepartmentTreeNode {
  id: number;
  name: string;
  parentId: number | null;
  managerId: number | null;
  managerName: string | null;
  isActive: boolean;
  isSales?: boolean;
  members: DepartmentMember[];
  children: DepartmentTreeNode[];
}
