import { MOCK_PASSWORD, MOCK_USERS } from './mockUsers';
import { mockFailure, withMockDelay } from './mockClient';
import type { SessionUser } from '@/types/session';

/**
 * The real session is an httpOnly cookie the browser cannot read. The mock
 * backend keeps its own session here so a page reload behaves the same way.
 * This is the only place that persists identity, and it disappears with the mock.
 */
const MOCK_SESSION_KEY = 'mockSessionUserId';
const MOCK_PASSWORD_CHANGED_KEY = 'mockPasswordChangedUserIds';

function readStoredUserId(): number | null {
  try {
    const raw = window.localStorage.getItem(MOCK_SESSION_KEY);
    if (raw === null) return null;
    const parsed = Number(raw);
    return Number.isInteger(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredUserId(userId: number | null): void {
  try {
    if (userId === null) {
      window.localStorage.removeItem(MOCK_SESSION_KEY);
      return;
    }
    window.localStorage.setItem(MOCK_SESSION_KEY, String(userId));
  } catch {
    // Blocked site data: the mock session simply does not survive a reload.
  }
}

/** Persisted like the session itself, so a reload does not re-trap the user. */
function readPasswordChangedUserIds(): number[] {
  try {
    const raw = window.localStorage.getItem(MOCK_PASSWORD_CHANGED_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is number => typeof value === 'number')
      : [];
  } catch {
    return [];
  }
}

function markPasswordChanged(userId: number): void {
  const current = readPasswordChangedUserIds();
  if (current.includes(userId)) return;
  try {
    window.localStorage.setItem(MOCK_PASSWORD_CHANGED_KEY, JSON.stringify([...current, userId]));
  } catch {
    // Blocked site data: the change simply does not survive a reload.
  }
}

function applyPasswordState(user: SessionUser): SessionUser {
  if (!readPasswordChangedUserIds().includes(user.id)) return user;
  return { ...user, mustChangePassword: false };
}

export function mockLogin(email: string, password: string): Promise<SessionUser> {
  const user = MOCK_USERS.find(
    (candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase(),
  );

  if (user === undefined || password !== MOCK_PASSWORD) {
    return mockFailure('Email hoặc mật khẩu không đúng', 401);
  }

  writeStoredUserId(user.id);
  return withMockDelay(applyPasswordState(user));
}

export function mockFetchSession(): Promise<SessionUser> {
  const userId = readStoredUserId();
  const user = MOCK_USERS.find((candidate) => candidate.id === userId);

  if (user === undefined) {
    return mockFailure('Phiên đăng nhập đã hết hạn', 401);
  }

  return withMockDelay(applyPasswordState(user));
}

export function mockLogout(): Promise<void> {
  writeStoredUserId(null);
  return withMockDelay(undefined);
}

export function mockChangePassword(currentPassword: string): Promise<void> {
  const userId = readStoredUserId();

  if (userId === null) {
    return mockFailure('Phiên đăng nhập đã hết hạn', 401);
  }
  if (currentPassword !== MOCK_PASSWORD) {
    return mockFailure('Mật khẩu hiện tại không đúng', 400);
  }

  markPasswordChanged(userId);
  return withMockDelay(undefined);
}
