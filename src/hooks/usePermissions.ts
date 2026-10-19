import { useMemo } from 'react';
import { ACTION_ROLES, FLAG_GRANTED_ACTIONS } from '@/constants/permissions';
import type { PermissionAction, ReportTier } from '@/constants/permissions';
import { Role } from '@/constants/roles';
import { useCurrentUser } from '@/store/sessionContext';
import type { SessionUser } from '@/types/session';

export interface Permissions {
  can: (action: PermissionAction) => boolean;
  hasRole: (role: Role) => boolean;
  reportTier: ReportTier;
}

/**
 * Permissions are the union of the user's roles: a person holding both manager
 * and sale may do everything either role may do.
 */
function canPerform(user: SessionUser | null, action: PermissionAction): boolean {
  if (user === null) return false;
  if (user.canViewCompanyReport && FLAG_GRANTED_ACTIONS.includes(action)) return true;
  return ACTION_ROLES[action].some((role) => user.roles.includes(role));
}

/** Mirrors the backend's report scope so the front-end labels the right tier. */
function resolveReportTier(user: SessionUser | null): ReportTier {
  if (user === null) return 'personal';
  if (
    user.roles.includes(Role.Admin) ||
    user.roles.includes(Role.Leader) ||
    user.canViewCompanyReport
  ) {
    return 'company';
  }
  if (user.roles.includes(Role.Manager) && user.departmentId !== null) return 'department';
  return 'personal';
}

export function usePermissions(): Permissions {
  const user = useCurrentUser();

  return useMemo<Permissions>(
    () => ({
      can: (action) => canPerform(user, action),
      hasRole: (role) => user?.roles.includes(role) ?? false,
      reportTier: resolveReportTier(user),
    }),
    [user],
  );
}
