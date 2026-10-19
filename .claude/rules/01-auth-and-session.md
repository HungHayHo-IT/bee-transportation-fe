# 01 · Authentication and session

**Goal**: log in, bootstrap the session, force a password change when the account still holds a
temporary password, log out.

**Depends on**: `00-foundation`, `11-api-wiring`.

---

## Screens

| Route | Screen |
|---|---|
| `/authentication/login` | Email + password, remembers nothing, shows API error inline |
| `/authentication/change-password` | Current + new + confirm, reachable only while `mustChangePassword` is set |

## Endpoints

| Call | Endpoint | Notes |
|---|---|---|
| Login | `POST /auth/login` | Body `{ email, password }`; sets an httpOnly cookie; returns `{ user, mustChangePassword }` |
| Session | `GET /auth/me` | Roles, department, `canViewCompanyReport` |
| Change password | `POST /auth/change-password` | `{ currentPassword, newPassword }` |
| Logout | `POST /auth/logout` | Clears the cookie |

---

## Steps

1. **Axios credentials**: `apiClient` is created with `withCredentials: true`. No
   `Authorization` header, no token in `localStorage`, no refresh-token flow — the backend
   issues a 12-hour cookie and expects a fresh login afterwards.
2. **`authService.ts`**: `login`, `logout`, `fetchCurrentSession`, `changePassword`.
   `ApiSessionUser → adaptSessionUser() → SessionUser { id, fullName, email, roles,
   departmentId, departmentName, canViewCompanyReport, mustChangePassword }`.
3. **`SessionContext`** (`src/store/SessionContext.tsx`): holds
   `{ status: "loading" | "authenticated" | "anonymous", user }`. On mount it calls
   `GET /auth/me`; a `401` means anonymous, anything else surfaces an error screen with a retry.
   Expose `useSession()`; components never call `authService` directly.
4. **Login page**: `AuthLayout`, MUI form, client-side validation only for "required" and
   email shape. On success, refresh the session and navigate to `/dashboard`, or to
   `/authentication/change-password` when `mustChangePassword` is true.
5. **Forced password change**: the backend rejects every other route with `403` while the flag
   is set. Mirror that on the front-end with a redirect from `DashboardLayout`, so the user
   never sees a screen full of errors. The new password field enforces the backend's minimum
   length and a confirmation match.
6. **Global 401 handling**: the response interceptor clears the session context and redirects
   to the login route once, without a redirect loop (skip when the failing request is already
   an auth endpoint).
7. **Logout**: call the endpoint, clear context, navigate to login. Do not clear the whole of
   `localStorage` — the language preference survives.

---

## Acceptance

- Refreshing any deep link keeps the user logged in (the cookie carries the session) and lands
  back on that same route.
- With an expired cookie, any screen redirects to login exactly once, with no console errors.
- An account created by an admin cannot reach any screen except the password-change page.
- No token, user object, or permission list is written to `localStorage`.

## Gotchas

- The cookie is `SameSite=Lax`; the dev server must proxy `/api` to the backend origin, or the
  cookie is dropped. Configure the Vite proxy rather than enabling CORS wildcards.
- `GET /auth/me` is the only source of roles. Never cache roles in storage — an admin can
  change them at any moment and the JWT payload can be up to 12 hours stale.
