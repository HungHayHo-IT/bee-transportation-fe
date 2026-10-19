import { createContext, useContext } from 'react';
import type { SessionState, SessionUser } from '@/types/session';

export interface SessionContextValue {
  state: SessionState;
  signIn: (email: string, password: string) => Promise<SessionUser>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (context === null) {
    throw new Error('useSession must be used inside SessionProvider');
  }
  return context;
}

/** Convenience for screens that only render once the session is known. */
export function useCurrentUser(): SessionUser | null {
  const { state } = useSession();
  return state.status === 'authenticated' ? state.user : null;
}
