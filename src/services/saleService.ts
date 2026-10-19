import apiClient from './apiClient';
import { LANDING_ENDPOINTS, SALE_ENDPOINTS } from './apiEndpoints';
import type { ApiPage } from './pageAdapter';
import { findRoles } from '@/constants/roles';
import type { Role } from '@/constants/roles';

/**
 * Both representative endpoints answer with the standard list envelope
 * `{ items, total, page, limit }`, not the plain array `api-docs.md` suggested.
 * They are small catalogues — one full page — so the service unwraps `.items`
 * and hands the screens a list, the same way departments and services do.
 *
 * `roles` is typed as a plain `string[]` on the wire, so it is narrowed through
 * `findRoles` here; an unknown role is dropped rather than reaching `t()` as an
 * undefined label key.
 */

interface ApiRepresentativeUser {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  roles: string[];
  isLandingRepresentative: boolean;
  landingDescription: string | null;
  landingAvatarUrl: string | null;
}

interface ApiDepartmentRepresentativeGroup {
  departmentId: number | null;
  departmentName: string;
  users: ApiRepresentativeUser[];
}

interface ApiLandingRepresentative {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  departmentName: string | null;
  roles: string[];
  avatarUrl: string | null;
}

export interface RepresentativeUser {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  roles: Role[];
  isLandingRepresentative: boolean;
  /** Mô tả ngắn hiện dưới tên trên landing. null = chưa viết. */
  landingDescription: string | null;
  /** URL ảnh đại diện. null = chưa có ảnh, màn hình vẽ chữ cái đầu tên. */
  landingAvatarUrl: string | null;
}

export interface DepartmentRepresentativeGroup {
  departmentId: number | null;
  departmentName: string;
  users: RepresentativeUser[];
}

export interface LandingRepresentative {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  departmentName: string | null;
  roles: Role[];
  avatarUrl: string | null;
}

function adaptRepresentativeUser(api: ApiRepresentativeUser): RepresentativeUser {
  return {
    id: api.id,
    fullName: api.fullName,
    email: api.email,
    phone: api.phone,
    roles: findRoles(api.roles),
    isLandingRepresentative: api.isLandingRepresentative,
    landingDescription: api.landingDescription,
    landingAvatarUrl: api.landingAvatarUrl,
  };
}

function adaptRepresentativeGroup(
  api: ApiDepartmentRepresentativeGroup,
): DepartmentRepresentativeGroup {
  return {
    departmentId: api.departmentId,
    departmentName: api.departmentName,
    users: api.users.map(adaptRepresentativeUser),
  };
}

function adaptLandingRepresentative(api: ApiLandingRepresentative): LandingRepresentative {
  return {
    id: api.id,
    fullName: api.fullName,
    email: api.email,
    phone: api.phone,
    departmentName: api.departmentName,
    roles: findRoles(api.roles),
    avatarUrl: api.avatarUrl,
  };
}

export async function fetchRepresentativeGroups(): Promise<DepartmentRepresentativeGroup[]> {
  const response = await apiClient.get<ApiPage<ApiDepartmentRepresentativeGroup>>(
    SALE_ENDPOINTS.REPRESENTATIVES,
  );
  return response.data.items.map(adaptRepresentativeGroup);
}

/**
 * Bật/tắt hiển thị, và/hoặc sửa mô tả.
 *
 * Trường nào không truyền thì backend GIỮ NGUYÊN — lưu mô tả mà vô tình tắt
 * luôn người đó khỏi landing là kiểu hỏng không ai ngờ tới.
 */
export async function updateRepresentative(
  userId: number,
  thayDoi: {
    isLandingRepresentative?: boolean;
    landingDescription?: string;
    /** Chuỗi rỗng = gỡ ảnh. Không truyền = giữ nguyên ảnh đang có. */
    landingAvatarUrl?: string;
  },
): Promise<RepresentativeUser> {
  const response = await apiClient.patch<ApiRepresentativeUser>(
    SALE_ENDPOINTS.TOGGLE_REPRESENTATIVE(userId),
    thayDoi,
  );
  return adaptRepresentativeUser(response.data);
}

export async function toggleRepresentative(
  userId: number,
  isLandingRepresentative: boolean,
): Promise<RepresentativeUser> {
  return updateRepresentative(userId, { isLandingRepresentative });
}

export async function fetchLandingRepresentatives(): Promise<LandingRepresentative[]> {
  const response = await apiClient.get<ApiPage<ApiLandingRepresentative>>(
    LANDING_ENDPOINTS.REPRESENTATIVES,
  );
  return response.data.items.map(adaptLandingRepresentative);
}

/** Vỏ của một URL ký sẵn — giống hệt bên tin tức và CMS. */
interface PresignedUpload {
  uploadUrl: string;
  publicUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
}

/**
 * Tải ảnh người đại diện thẳng lên S3 bằng URL vừa xin, trả URL công khai.
 *
 * Không đi qua backend: file ảnh không có lý do gì phải chạy qua máy chủ ứng
 * dụng rồi mới sang kho. Dùng `fetch` chứ không dùng apiClient vì đây là
 * request sang S3 — presigned URL đã là giấy phép rồi, gắn thêm Authorization
 * là S3 từ chối.
 */
export async function uploadRepresentativePhoto(file: File): Promise<string> {
  const ky = await apiClient.post<PresignedUpload>(
    SALE_ENDPOINTS.PRESIGN_REPRESENTATIVE_IMAGE,
    { filename: file.name, contentType: file.type },
  );
  const res = await fetch(ky.data.uploadUrl, {
    method: ky.data.method,
    headers: { ...ky.data.headers, 'Content-Type': file.type },
    body: file,
  });
  if (!res.ok) throw new Error(`Tải ảnh lên thất bại (HTTP ${res.status})`);
  return ky.data.publicUrl;
}
