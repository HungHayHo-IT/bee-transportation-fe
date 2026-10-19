import type { Role } from '@/constants/roles';

export interface SessionUser {
  id: number;
  fullName: string;
  email: string;
  roles: Role[];
  departmentId: number | null;
  departmentName: string | null;
  canViewCompanyReport: boolean;
  mustChangePassword: boolean;
}

export type SessionState =
  | { status: 'loading' }
  | { status: 'authenticated'; user: SessionUser }
  | { status: 'anonymous' };
