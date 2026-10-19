import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import * as authService from '@/services/authService';
import { registerSessionExpiredHandler } from '@/services/apiClient';
import { SessionContext } from './sessionContext';
import type { SessionContextValue } from './sessionContext';
import type { SessionState, SessionUser } from '@/types/session';

export interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps): ReactNode {
  const [state, setState] = useState<SessionState>({ status: 'loading' });

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const user = await authService.fetchCurrentSession();
      setState({ status: 'authenticated', user });
    } catch {
      // Any failure to resolve the session means "not signed in". The reason is
      // shown on the login screen when the user tries to sign in again.
      setState({ status: 'anonymous' });
    }
  }, []);

  useEffect(() => {
    registerSessionExpiredHandler(() => setState({ status: 'anonymous' }));
    void refresh();
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string): Promise<SessionUser> => {
    const user = await authService.login(email, password);
    setState({ status: 'authenticated', user });
    return user;
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    await authService.logout();
    setState({ status: 'anonymous' });
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({ state, signIn, signOut, refresh }),
    [state, signIn, signOut, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
