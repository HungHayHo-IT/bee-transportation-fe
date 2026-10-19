# CLAUDE.md — BeeOps Admin Front-End

Internal operations web app for **Bee Transportation Corporation** (CTCP Van Chuyen Con Ong,
tax code 0318823069). This repository holds the **admin front-end**.

> Read `.claude/memory.md` FIRST on every session. It carries the running context
> (decisions, module status, open questions) so nothing has to be re-asked.

---

## 1. Sources of truth

| Document | Path | What it settles |
|---|---|---|
| Business specification | Artifact "De xuat BeeOps" (final, 21/08/2026) | Roles, workflow, F1–F8 feature scope, 10 services, milestone sets |
| Backend design | `.claude/api-docs.md` | Endpoint list, request/response shape, auth, permission model |
| Database schema | `.claude/schema.sql` | Tables, columns, constraints, generated order code |
| ERD | `.claude/beeops-erd.html` | Visual map of the 10 tables + column dictionary |
| Coding rules | `.claude/rules.md` | Non-negotiable coding standards |
| Feature plans | `.claude/rules/*.md` | Step-by-step implementation per feature |
| QA register | `.claude/qa.html` | Backend defects and open questions found while wiring; keep adding to it |

When a document disagrees with another, the order of authority is:
**business specification → the live OpenAPI spec at `/api/docs-json` → api-docs.md →
schema.sql → this file**. Never silently pick one;
record the conflict in `.claude/memory.md` section "Open Questions".

---

## 2. Current state

- Backend: **implemented and running.** The dev proxy points at the deployed API
  `http://167.254.68.111`; `http://localhost:8087` from `~/Desktop/vietmind/bee-transportation-be`
  is the local fallback and carries the QA dataset. Live OpenAPI at `/api/docs`, JSON at `/api/docs-json`. **The live
  spec outranks `api-docs.md`, which is design intent and has already drifted** — verify
  against the spec before writing any service.
- Front-end: **F1–F8 complete and wired to the live API.** `VITE_USE_MOCK` is off; the mock
  layer covers authentication only and exists for offline work.
- The QA register in `.claude/qa.html` was answered in full by the backend on 23/08/2026;
  its breaking contract changes are absorbed and listed in `.claude/memory.md` §4d. One new
  item is open, QA-26: the deployed host runs the new code over a database that never got
  migration 001, so every endpoint returning order rows answers `500` there.
- The dev server proxies `/api` to the backend, so the session cookie works without CORS.
  See `.claude/rules/11-api-wiring.md`.
- Deployed on Vercel at https://bee-transportation-fe.vercel.app (team `vietmind-solution`).
  `vercel.json` reproduces the dev proxy in production — `/api/*` is rewritten to the backend so the
  session cookie stays first-party — plus a catch-all to `/index.html` for the router. CI/CD is GitHub
  Actions driving the Vercel CLI: preview per pull request, production on `main`; Vercel's own Git
  integration is disabled so nothing deploys twice.

---

## 3. Target stack

Mirrors `~/Desktop/vietmind/btn-admin` so the layout can be reused directly.

| Concern | Choice |
|---|---|
| Framework | React 19 + TypeScript 5.9 (strict) |
| Build | Vite 6, path alias `@/*` → `src/*` |
| UI | MUI 7 (`@mui/material`, `@mui/x-date-pickers`, `@mui/lab`) + Emotion |
| Utility CSS | Tailwind 4 via `@tailwindcss/vite` (layout helpers only, MUI owns components) |
| Icons | `@tabler/icons-react` |
| Routing | React Router DOM 7 |
| HTTP | Axios with a single shared client (`src/services/apiClient.ts`) |
| i18n | i18next + react-i18next, `vi` default, `en` secondary |
| Charts | ApexCharts + react-apexcharts |
| Dates | Day.js |
| Notifications | notistack |
| Lint | ESLint 9 flat config + `@typescript-eslint`, `no-explicit-any` as error |

---

## 4. Layout contract (cloned from btn-admin)

```
MainWrapper (flex, min-height 100vh)
├── Sidebar        dark rail #0F1319, permanent on lg+, temporary drawer below lg
│                  expanded 270px / collapsed 80px, hover-expand when collapsed
└── PageWrapper    flex column, minWidth: 0  (prevents wide tables breaking the shell)
    ├── Header     sticky, sidebar toggle + language switcher + notification bell + profile menu
    └── Container  maxWidth={false}, paddingTop 20px
        └── Box    minHeight calc(100vh - 170px) → route content
```

Page composition inside a route:

```
PageContainer (title + description)
└── Card (filters: search + selects + date range + primary action)
└── Card
    ├── LinearProgress while refetching
    ├── TableContainer / Kanban board / chart grid
    └── Pagination
```

First load renders `CircularProgress`; refetches render `LinearProgress`; failures render an
`Alert severity="error"` that can be dismissed. This is the single list pattern — do not invent
a second one.

---

## 5. Domain model in brief

**10 services** (order-code prefix): `CON` consulting · `CUS` customs · `DOM` domestic ·
`PRJ` project/oversized · `LIF` lifting · `MMT` multimodal · `PKG` packing · `CBT` cross-border ·
`BRK` shipbroking · `RNT` equipment rental.

**Order code**: `[SERVICE]-[YYYYMMDD]-[NNN]`, sequence resets daily per service —
generated by the backend, never composed on the front-end.

**Lifecycle**: `new → distributed → quoting → awaiting_selection → awaiting_customer →
closed → in_progress → completed`, plus `cancelled` from any state.
`awaiting_customer` can return to `quoting` (customer asked for a revision, quote version + 1).

**5 roles** (`users.roles` is an array — a person may hold several, permissions are the union):

| Role | Does | Order visibility | Revenue visibility |
|---|---|---|---|
| `admin` | Organisation, catalogue, routing matrix | All | Company |
| `leader` | Read-only oversight | Own department¹ | Company reports¹ |
| `manager` | Assigns work in own department, quotes | Orders their department joined | Own department |
| `sale` | Creates orders, compares quotes, closes | Orders they created | Own orders only |
| `staff` | Claims orders, quotes, updates milestones | Own assignments + department queue | Per-order value only |

Plus a per-user flag `canViewCompanyReport` that grants the company dashboard without a role change.

¹ Since backend commit `9ac7246` (25/08/2026), reading the *order list* of every department
is **admin-only** (`canReadAllOrders`). A leader — and anyone with `canViewCompanyReport` — still
sees company-wide **report figures**, but the order list, sealed quotes and each department's
amounts are scoped to their own department. Company-level report visibility and all-orders
visibility are two different permissions; do not conflate them. The front-end mirrors this only by
rendering whatever the backend returns.

**Three axes must never be mixed**: role decides *what you may do*, scope decides *whose rows
you see*, money visibility decides *whether the amount column is populated*. The backend is the
authority on all three; the front-end mirrors them only to avoid rendering dead controls.

**Sealed quotes**: when several departments quote the same order, each department sees only its
own quote. Only the owning sale and company-level roles see them all.

---

## 6. Backend contract essentials

- Base URL from `VITE_API_BASE_URL`, global prefix `/api`, Swagger at `/api/docs`.
- Auth: **JWT in an httpOnly cookie**. Axios must use `withCredentials: true`.
  There is no bearer token and nothing auth-related in `localStorage`.
- Success envelope `{ success: true, data, meta }` — unwrapped by the response interceptor.
- Error envelope `{ success: false, error: { code, message, statusCode, details? }, meta }` —
  the message is Vietnamese and safe to surface to the user; `details` carries data such as
  `existingCustomerId` on a duplicate customer name.
- Every list endpoint answers `{ items, total, page, limit }` and takes `?page=&limit=`.
  Catalogues the backend validates against are served from `/reference/*`.
- Status codes: `400` validation · `401` unauthenticated · `403` wrong role or
  `mustChangePassword` still set · `404` missing **or out of scope** · `409` illegal state
  transition · `413` file over 20 MB.
- `404` is deliberately returned for rows outside the caller's scope. Never render
  "you do not have permission" for a 404 — render "not found".
- Money arrives as a **JSON number** of whole Vietnamese dong (`finalAmount: 28000000`),
  despite `api-docs.md` §16 promising a string. `numeric(15,0)` tops out below 2^53, so this is
  safe — but never do currency arithmetic in a component; format through `formatCurrencyVnd`.
- `finalAmount: null` means "you may not see this amount", not zero. Render an em dash.
- `409` also answers a unique-constraint violation (duplicate department name, e-mail or
  customer name), not only an illegal state transition.

---

## 7. Feature plans

Implement in this order. Each file is self-contained: goal, screens, endpoints, ordered steps,
acceptance criteria, gotchas.

| File | Feature | Covers |
|---|---|---|
| `.claude/rules/00-foundation.md` | — | Project scaffold, theme, layout shell, routing, i18n |
| `.claude/rules/01-auth-and-session.md` | — | Login, forced password change, session bootstrap |
| `.claude/rules/02-permissions-ui.md` | — | Role/scope gating of routes, menu, controls |
| `.claude/rules/03-org-admin.md` | F7 | Departments, users, services, milestones, routing matrix |
| `.claude/rules/04-order-intake.md` | F1 | Order creation form, customer directory |
| `.claude/rules/05-distribution-queue.md` | F2 | Department queue, claim/assign/pass, unrouted queue |
| `.claude/rules/06-quotes-competition.md` | F3 | Quote submission, reference prices, comparison screen |
| `.claude/rules/07-order-close.md` | F4 | Select quote, close, reject, cancel, confirmation PDF |
| `.claude/rules/08-order-tracking.md` | F5 | List, Kanban, detail, timeline, milestones, files, comments |
| `.claude/rules/09-dashboard-reports.md` | F6 | Three-tier dashboard, revenue and operations metrics |
| `.claude/rules/10-notifications.md` | F8 | Inbox, badge, My Tasks, email preferences |
| `.claude/rules/11-api-wiring.md` | — | Service layer, adapters, mock switch, error handling |

---

## 8. Route map

| Route | Screen | Roles |
|---|---|---|
| `/authentication/login` | Login | public |
| `/authentication/change-password` | Forced password change | authenticated |
| `/dashboard` | Dashboard, tier resolved by scope | all |
| `/my-tasks` | Items awaiting my action | all |
| `/orders` | Order list | all (scoped) |
| `/orders/kanban` | Kanban by status | all (scoped) |
| `/orders/new` | Create order | admin, sale |
| `/orders/:id` | Order detail | all (scoped) |
| `/orders/unrouted` | Orders with no responsible department | admin |
| `/queue` | My department queue | manager, staff |
| `/customers`, `/customers/:id` | Customer directory | all |
| `/reports/revenue` | Revenue breakdowns | company / department tier |
| `/reports/operations` | Response time, competition, workload | company / department tier |
| `/admin/departments` | Departments | admin |
| `/admin/users` | Users | admin |
| `/admin/services` | Services, SLA, milestone templates | admin |
| `/admin/routing` | Department × service matrix | admin |
| `/admin/activity` | Audit log | admin |
| `/notifications` | Notification inbox | all |
| `/profile` | Own profile, email preferences | all |

---

## 9. Working agreement

1. Read `.claude/memory.md`, then the feature file you are about to touch.
2. Follow `.claude/rules.md` without exception. It overrides habit and overrides btn-admin's
   own legacy code, which contains Vietnamese comments and `any` — do not copy those parts.
3. One feature file per task. Do not start the next before the acceptance criteria of the
   current one pass.
4. After finishing, update `.claude/memory.md`: module status row + change-log entry, and move
   any resolved item out of "Open Questions".
5. Never invent an endpoint. If `api-docs.md` lacks what a screen needs, add it to
   "Open Questions" in memory and stub the service function with a documented mock.
