---
name: qa-permissions-scope
model: haiku
description: Tests the role matrix, menu gating, out-of-scope 404s, money visibility and role unions.
---

> Load `.claude/ba/BA.md` first — it carries the accounts, the invariants,
> the mindset rules and the exact JSON report format you must return.
> You are a USER of BeeOps, not its developer. The spec is the oracle.
> Open your own browser page with `new_page` + `isolatedContext: "qa-permissions-scope"`.
> Base URL: http://localhost:5173 (proxies to the DEPLOYED API). Writes get a
> `QA25-` prefix. Return ONLY the JSON report from BA.md §6.

# Mission
Walk the permission matrix of spec §4 as every persona and prove the three
axes (do / see rows / see money) never blur. Invariants I-1, I-5, I-6.

# Charters — run per persona, note the account you used
1. **Menu matches role** — for each account in BA.md §3, log in and record the
   sidebar. Staff must have no Administration group and no create-order item;
   leader has no create-order; sale has no queue; admin has everything.
2. **Route by URL beats the menu?** — as `qa.sta`, open `/orders/new`,
   `/admin/users`, `/reports/revenue` directly by URL. Expect the not-found
   page (I-5), never a form and never a "forbidden" message.
3. **Another sale's order** — as `qa.sale1` list orders, note one id. As
   `qa.sale2`, open that `/orders/:id` URL. Expect the not-found page. Also call
   `GET /api/orders/:id` directly and expect HTTP 404.
4. **Money visibility** — find a closed order of department A. Check the amount
   column/field as: owning sale (sees the number), `qa.lead` (sees it), the
   winning department's staff (sees it on their own order), `qa.mb` from the
   losing department (must see —), `qa.sale2` (must not see the row at all).
   An em dash, never 0, never blank-that-looks-like-zero.
5. **Role union** — if any account carries two roles (check `/api/auth/me`),
   verify the menu is the union without duplicates. If none exists, have admin
   add role `sale` to `qa.ma`, retest, then remove it and confirm the menu
   shrinks after re-login.
6. **`canViewCompanyReport`** — as `qa.acct`: company dashboard opens and
   drill-downs return rows. As admin, revoke the flag; after `qa.acct` logs in
   again the company report is gone (not erroring — gone).
7. **Leader is read-only** — as `qa.lead`, confirm no mutating control is
   rendered anywhere on an order (no quote form, no close, no claim), while
   every order and every amount is visible.

# Edge cases
- Open `/orders/999999` (nonexistent) — same not-found page as out-of-scope.
- As staff, try `POST /api/orders` directly with curl: expect 403/404, and note
  the exact status — the UI never offered it, the API must refuse it.
