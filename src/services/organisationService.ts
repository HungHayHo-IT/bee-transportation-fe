import apiClient from './apiClient';
import { ORGANISATION_ENDPOINTS } from './apiEndpoints';
import { adaptPage } from './pageAdapter';
import type { ApiPage } from './pageAdapter';
import { ALL_CARGO_FIELDS } from '@/constants/cargoFields';
import { findRoles } from '@/constants/roles';
import type { Role } from '@/constants/roles';
import type { Page } from '@/types/pagination';
import type {
  ActivityEntry,
  ActivityPage,
  CreateDepartmentPayload,
  CreateUserPayload,
  Department,
  DepartmentTreeNode,
  OrganisationUser,
  Service,
  ServiceChild,
  UpdateDepartmentPayload,
  UpdateServicePayload,
  UpdateUserPayload,
} from '@/types/organisation';

interface ApiDepartment {
  id: number;
  name: string;
  managerId: number | null;
  managerName: string | null;
  parentId: number | null;
  serviceIds: number[];
  isActive: boolean;
  isSales?: boolean;
  isQuoting?: boolean;
  memberCount: number;
}

interface ApiUser {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  departmentId: number | null;
  departmentName: string | null;
  roles: string[];
  canViewCompanyReport: boolean;
  /** Thieu khi backend cu chua co migration 072 — coi nhu tat. */
  canViewAllOrders?: boolean;
  mustChangePassword: boolean;
  isActive: boolean;
}

interface ApiService {
  id: number;
  code: string;
  name: string;
  slaHours: number;
  milestones: string[];
  sortOrder: number;
  isActive: boolean;
  departmentIds: number[];
  cargoFields: string[];
  landingKey?: string | null;
}

interface ApiActivityEntry {
  id: number;
  createdAt: string;
  orderId: number | null;
  orderCode: string | null;
  entity: string;
  entityId: string;
  action: string;
  actorId: number | null;
  actorName: string | null;
  detail: Record<string, unknown> | null;
}

function adaptDepartment(api: ApiDepartment): Department {
  return {
    id: api.id,
    name: api.name,
    managerId: api.managerId,
    managerName: api.managerName,
    parentId: api.parentId ?? null,
    serviceIds: api.serviceIds,
    isActive: api.isActive,
    isSales: api.isSales ?? false,
    isQuoting: api.isQuoting ?? false,
    memberCount: api.memberCount,
  };
}

function adaptUser(api: ApiUser): OrganisationUser {
  return {
    id: api.id,
    email: api.email,
    fullName: api.fullName,
    phone: api.phone,
    departmentId: api.departmentId,
    departmentName: api.departmentName,
    roles: findRoles(api.roles),
    canViewCompanyReport: api.canViewCompanyReport,
    canViewAllOrders: api.canViewAllOrders ?? false,
    mustChangePassword: api.mustChangePassword,
    isActive: api.isActive,
  };
}

function adaptService(api: ApiService): Service {
  return {
    id: api.id,
    code: api.code,
    name: api.name,
    slaHours: api.slaHours,
    milestones: api.milestones,
    sortOrder: api.sortOrder,
    isActive: api.isActive,
    departmentIds: api.departmentIds,
    // A backend older than the per-service fields release omits this; showing every
    // figure matches how the form behaved before, which is the safe fallback.
    cargoFields: api.cargoFields ?? [...ALL_CARGO_FIELDS],
    // Backend cũ hơn bản thêm dịch vụ từ màn Nội dung không có trường này.
    landingKey: api.landingKey ?? null,
  };
}

function adaptActivityEntry(api: ApiActivityEntry): ActivityEntry {
  return {
    id: api.id,
    orderId: api.orderId,
    orderCode: api.orderCode,
    entity: api.entity,
    entityId: api.entityId,
    action: api.action,
    actorId: api.actorId,
    actorName: api.actorName,
    detail: api.detail,
    createdAt: api.createdAt,
  };
}

/**
 * A catalogue small enough that the backend answers with one full page, so the
 * screen gets the rows rather than a page it would have to page through.
 */
export async function fetchDepartments(): Promise<Department[]> {
  const response = await apiClient.get<ApiPage<ApiDepartment>>(ORGANISATION_ENDPOINTS.DEPARTMENTS);
  return response.data.items.map(adaptDepartment);
}

export async function createDepartment(payload: CreateDepartmentPayload): Promise<Department> {
  const response = await apiClient.post<ApiDepartment>(ORGANISATION_ENDPOINTS.DEPARTMENTS, payload);
  return adaptDepartment(response.data);
}

export async function updateDepartment(
  departmentId: number,
  payload: UpdateDepartmentPayload,
): Promise<Department> {
  const response = await apiClient.patch<ApiDepartment>(
    ORGANISATION_ENDPOINTS.DEPARTMENT_DETAIL(departmentId),
    payload,
  );
  return adaptDepartment(response.data);
}

/** Replaces the whole routing row; a per-checkbox call would drop concurrent edits. */
export async function setDepartmentServices(
  departmentId: number,
  serviceIds: number[],
  vai: { isSales: boolean; isQuoting: boolean },
): Promise<void> {
  await apiClient.put(ORGANISATION_ENDPOINTS.DEPARTMENT_SERVICES(departmentId), { serviceIds, ...vai });
}

export interface UserFilters {
  q?: string;
  role?: Role;
  departmentId?: number;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Search and the role, department and status filters are applied by the backend.
 * A manager may call this too and receives their own department's members only —
 * `departmentId` from the client cannot widen that.
 */
export async function fetchUsers(filters: UserFilters = {}): Promise<Page<OrganisationUser>> {
  const response = await apiClient.get<ApiPage<ApiUser>>(ORGANISATION_ENDPOINTS.USERS, {
    params: filters,
  });
  return adaptPage(response.data, adaptUser);
}

export interface CreatedUser {
  user: OrganisationUser;
  /**
   * Mật khẩu tạm, trả về đúng một lần. Swagger không khai field này
   * (UserResponseDto) nhưng users.service luôn gửi kèm — kể cả khi người tạo tự
   * gõ, và bắt buộc phải hiện khi để trống, vì khi đó chỉ backend biết nó.
   */
  tempPassword: string | null;
}

export async function createUser(payload: CreateUserPayload): Promise<CreatedUser> {
  const response = await apiClient.post<ApiUser & { tempPassword?: string }>(
    ORGANISATION_ENDPOINTS.USERS,
    payload,
  );
  return { user: adaptUser(response.data), tempPassword: response.data.tempPassword ?? null };
}

export async function updateUser(
  userId: number,
  payload: UpdateUserPayload,
): Promise<OrganisationUser> {
  const response = await apiClient.patch<ApiUser>(
    ORGANISATION_ENDPOINTS.USER_DETAIL(userId),
    payload,
  );
  return adaptUser(response.data);
}

/** The temporary password is shown once and never retrievable again. */
export async function resetUserPassword(userId: number): Promise<string> {
  const response = await apiClient.post<{ tempPassword: string }>(
    ORGANISATION_ENDPOINTS.USER_RESET_PASSWORD(userId),
  );
  return response.data.tempPassword;
}

export async function setUserStatus(userId: number, isActive: boolean): Promise<void> {
  await apiClient.patch(ORGANISATION_ENDPOINTS.USER_STATUS(userId), { isActive });
}

export async function fetchServices(): Promise<Service[]> {
  const response = await apiClient.get<ApiPage<ApiService>>(ORGANISATION_ENDPOINTS.SERVICES);
  return response.data.items.map(adaptService);
}

export interface CreateServicePayload {
  code: string;
  name: string;
  slaHours?: number;
  milestones: string[];
}

/** Dich vu NOI BO: khong len landing. Len landing la cua createLandingService. */
export async function createService(payload: CreateServicePayload): Promise<Service> {
  const response = await apiClient.post<ApiService>(ORGANISATION_ENDPOINTS.SERVICES, payload);
  return adaptService(response.data);
}

export async function updateService(
  serviceId: number,
  payload: UpdateServicePayload,
): Promise<Service> {
  const response = await apiClient.patch<ApiService>(
    ORGANISATION_ENDPOINTS.SERVICE_DETAIL(serviceId),
    payload,
  );
  return adaptService(response.data);
}

/** Replaces the ordered template; array position is the milestone sequence. */
export async function setServiceMilestones(serviceId: number, milestones: string[]): Promise<void> {
  await apiClient.put(ORGANISATION_ENDPOINTS.SERVICE_MILESTONES(serviceId), { milestones });
}

export async function fetchUnroutedServices(): Promise<Service[]> {
  const response = await apiClient.get<ApiPage<ApiService>>(
    ORGANISATION_ENDPOINTS.UNROUTED_SERVICES,
  );
  return response.data.items.map(adaptService);
}

export interface ActivityFilters {
  entity?: string;
  actorId?: number;
  orderId?: number;
  page?: number;
  limit?: number;
}

export async function fetchActivity(filters: ActivityFilters): Promise<ActivityPage> {
  const response = await apiClient.get<ApiPage<ApiActivityEntry>>(ORGANISATION_ENDPOINTS.ACTIVITY, {
    params: filters,
  });
  return adaptPage(response.data, adaptActivityEntry);
}

interface ApiDepartmentTreeNode {
  id: number;
  name: string;
  parentId: number | null;
  managerId: number | null;
  managerName: string | null;
  isActive: boolean;
  members: { id: number; fullName: string; roles: string[] }[];
  children: ApiDepartmentTreeNode[];
}

function adaptTreeNode(api: ApiDepartmentTreeNode): DepartmentTreeNode {
  return {
    id: api.id,
    name: api.name,
    parentId: api.parentId,
    managerId: api.managerId,
    managerName: api.managerName,
    isActive: api.isActive,
    members: api.members.map((m) => ({
      id: m.id,
      fullName: m.fullName,
      roles: findRoles(m.roles),
    })),
    children: api.children.map(adaptTreeNode),
  };
}

/** The org chart arrives already nested; the backend owns the tree shape. */
export async function fetchDepartmentTree(): Promise<DepartmentTreeNode[]> {
  const response = await apiClient.get<ApiPage<ApiDepartmentTreeNode>>(
    ORGANISATION_ENDPOINTS.DEPARTMENT_TREE,
  );
  return response.data.items.map(adaptTreeNode);
}

/**
 * Thêm một dịch vụ HIỆN TRÊN LANDING.
 *
 * Một dòng duy nhất cho cả hai việc: nó vào danh mục dịch vụ của BeeOps (nên
 * khách chọn được khi gửi form báo giá và đơn định tuyến được về phòng ban),
 * đồng thời mọc ra một trang giới thiệu trên landing với đủ khung nội dung.
 *
 * Mã dịch vụ bỏ trống thì backend đoán từ tên — người viết nội dung không có
 * lý do gì phải nghĩ ra một mã ba chữ.
 */
export async function createLandingService(payload: {
  name: string;
  slugVi: string;
  slugEn: string;
  code?: string;
}): Promise<Service> {
  const response = await apiClient.post<ApiService>(
    ORGANISATION_ENDPOINTS.LANDING_SERVICES,
    payload,
  );
  return adaptService(response.data);
}

/* ── Dịch vụ con (mã OF1-TMS) ─────────────────────────────────────────────── */

/**
 * Mặc định lấy CẢ dòng đã tắt — màn quản trị cần id để bật lại. Form tạo đơn
 * truyền activeOnly=true.
 */
export async function fetchServiceChildren(
  serviceId: number,
  activeOnly = false,
): Promise<ServiceChild[]> {
  const response = await apiClient.get<ApiPage<ServiceChild>>(
    ORGANISATION_ENDPOINTS.SERVICE_CHILDREN(serviceId),
    { params: activeOnly ? { activeOnly: 'true' } : undefined },
  );
  return response.data.items;
}

/**
 * 18 mã OF1 cho ô chọn. Lấy từ backend chứ không chép sang đây: danh sách này
 * là một phần hợp đồng với OF1 và CHECK trong CSDL đọc cùng một nguồn — chép
 * ra là mời hai bên lệch nhau, mà lúc lệch thì người dùng chọn được một mã rồi
 * bị cơ sở dữ liệu từ chối.
 */
export async function fetchTmsModes(): Promise<string[]> {
  const response = await apiClient.get<{ data: string[] }>(ORGANISATION_ENDPOINTS.TMS_MODES);
  return response.data.data;
}

export interface ServiceChildPayload {
  name?: string;
  tmsMode?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export async function createServiceChild(
  serviceId: number,
  payload: ServiceChildPayload,
): Promise<ServiceChild> {
  const response = await apiClient.post<ServiceChild>(
    ORGANISATION_ENDPOINTS.SERVICE_CHILDREN(serviceId),
    payload,
  );
  return response.data;
}

export async function updateServiceChild(
  serviceId: number,
  childId: number,
  payload: ServiceChildPayload,
): Promise<ServiceChild> {
  const response = await apiClient.patch<ServiceChild>(
    ORGANISATION_ENDPOINTS.SERVICE_CHILD_DETAIL(serviceId, childId),
    payload,
  );
  return response.data;
}

export async function deleteServiceChild(serviceId: number, childId: number): Promise<void> {
  await apiClient.delete(ORGANISATION_ENDPOINTS.SERVICE_CHILD_DETAIL(serviceId, childId));
}
