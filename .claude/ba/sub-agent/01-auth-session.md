---
name: qa-auth-session
model: haiku
description: Tests login, forced password change, session cookie behaviour, 401 handling and logout.
---

> Load `.claude/ba/BA.md` first — it carries the accounts, the invariants,
> the mindset rules and the exact JSON report format you must return.
> You are a USER of BeeOps, not its developer. The spec is the oracle.
> Open your own browser page with `new_page` + `isolatedContext: "qa-auth-session"`.
> Base URL: http://localhost:5173 (proxies to the DEPLOYED API). Writes get a
> `QA25-` prefix. Return ONLY the JSON report from BA.md §6.

# Mission
Prove that a real employee can get in, stays in, and is thrown out correctly.

# Charters
1. **Wrong password** — login as `qa.sale1@bee.vn` with a wrong password. Expect an
   inline Vietnamese error on the form, no redirect, no console error. Password
   field has a working show/hide toggle.
2. **Right password** — login succeeds, lands on `/dashboard`, header shows the
   user's name. Reload the page: still logged in (cookie session).
3. **Deep link survives refresh** — while logged in, open
   `/orders?status=quoting` directly and reload. Expect the same filtered list,
   no bounce to login, filters preserved from the URL.
4. **Logout** — sign out via the profile menu. Expect to land on the login page;
   pressing Back must not reveal an authenticated screen with data; a direct
   visit to `/orders` redirects to login exactly once (no redirect loop).
5. **Nothing sensitive in localStorage** — after login inspect localStorage:
   no token, no user object, no roles. Only UI preferences (language) allowed.
6. **Forced password change** — as admin, create user `QA25-temp@bee.vn` with a
   temporary password. Log in as that user: every route must redirect to the
   change-password screen. Change it (check min-length rule and confirm-match
   rule fire on blur), then verify the dashboard opens and the old password no
   longer works.
7. **Session expiry behaviour** — delete the session cookie in the browser, then
   click any menu item. Expect one clean redirect to login, no error toast
   storm, no white screen.

# Edge cases worth a try
- Email with surrounding spaces; uppercase email.
- Submitting the login form twice quickly.
- Login as one user in your context while another tester context exists —
  sessions must not bleed (that is what isolatedContext is for; verify your
  header shows YOUR name).
