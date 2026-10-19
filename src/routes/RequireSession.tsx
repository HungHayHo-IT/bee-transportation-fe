import type { ReactNode } from 'react';
import { BeeLoader } from '@/components/BeeLoader';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '@/store/sessionContext';
import { RoutePath } from './routePaths';

export interface RequireSessionProps {
  children: ReactNode;
}

/**
 * Gate for everything behind the dashboard shell. A user still carrying a
 * temporary password is pushed to the change-password screen, because the
 * backend rejects every other route with 403 until the flag clears.
 */
export function RequireSession({ children }: RequireSessionProps): ReactNode {
  const { state } = useSession();
  const { pathname } = useLocation();

  if (state.status === 'loading') {
    return (
      <BeeLoader />
    );
  }

  if (state.status === 'anonymous') {
    return <Navigate to={RoutePath.Login} replace state={{ from: pathname }} />;
  }

  if (state.user.mustChangePassword && pathname !== RoutePath.ChangePassword) {
    return <Navigate to={RoutePath.ChangePassword} replace />;
  }

  return children;
}
