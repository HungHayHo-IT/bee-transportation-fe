import { Role } from '@/constants/roles';
import type { SessionUser } from '@/types/session';

/**
 * Demo accounts covering every role combination the permission rules must handle,
 * including a user who holds two roles and one who carries the company-report flag
 * without a leadership role. These rows stand in for database content.
 */
export const MOCK_USERS: readonly SessionUser[] = [
  {
    id: 1,
    fullName: 'Trần Quốc Admin',
    email: 'admin@beetransportation.vn',
    roles: [Role.Admin],
    departmentId: null,
    departmentName: null,
    canViewCompanyReport: true,
    mustChangePassword: false,
  },
  {
    id: 2,
    fullName: 'Lê Thị Lãnh Đạo',
    email: 'leader@beetransportation.vn',
    roles: [Role.Leader],
    departmentId: null,
    departmentName: null,
    canViewCompanyReport: true,
    mustChangePassword: false,
  },
  {
    id: 3,
    fullName: 'Phạm Văn Trưởng',
    email: 'manager.dom@beetransportation.vn',
    roles: [Role.Manager],
    departmentId: 10,
    departmentName: 'Phòng Vận chuyển nội địa',
    canViewCompanyReport: false,
    mustChangePassword: false,
  },
  {
    id: 4,
    fullName: 'Nguyễn Thị Sale',
    email: 'sale@beetransportation.vn',
    roles: [Role.Sale],
    departmentId: 20,
    departmentName: 'Phòng Kinh doanh',
    canViewCompanyReport: false,
    mustChangePassword: false,
  },
  {
    id: 5,
    fullName: 'Đỗ Văn Nhân Viên',
    email: 'staff.dom@beetransportation.vn',
    roles: [Role.Pricing],
    departmentId: 10,
    departmentName: 'Phòng Vận chuyển nội địa',
    canViewCompanyReport: false,
    mustChangePassword: false,
  },
  {
    id: 6,
    fullName: 'Hoàng Thị Kiêm Nhiệm',
    email: 'manager.sale@beetransportation.vn',
    roles: [Role.Manager, Role.Sale],
    departmentId: 30,
    departmentName: 'Phòng Hải quan',
    canViewCompanyReport: false,
    mustChangePassword: false,
  },
  {
    id: 7,
    fullName: 'Vũ Thị Kế Toán',
    email: 'accounting@beetransportation.vn',
    roles: [Role.Pricing],
    departmentId: 40,
    departmentName: 'Phòng Kế toán',
    canViewCompanyReport: true,
    mustChangePassword: false,
  },
  {
    id: 8,
    fullName: 'Ngô Văn Mới',
    email: 'newcomer@beetransportation.vn',
    roles: [Role.Pricing],
    departmentId: 10,
    departmentName: 'Phòng Vận chuyển nội địa',
    canViewCompanyReport: false,
    mustChangePassword: true,
  },
];

export const MOCK_PASSWORD = 'beeops2026';
