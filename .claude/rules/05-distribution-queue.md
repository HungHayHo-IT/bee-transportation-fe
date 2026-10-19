# 05 · F2 — Automatic distribution and department queue

**Goal**: an order created for a service appears immediately in the queue of every department
responsible for it. Departments claim, get assigned, or pass. The sale watches uptake live.

**Depends on**: `04-order-intake`.

---

## Screens

| Route | Screen |
|---|---|
| `/queue` | My department's queue (manager, staff) |
| `/orders/:id` → "Departments" panel | Uptake status per department, visible to the sale |
| `/orders/unrouted` | Orders with no responsible department (admin) |

## Endpoints

| Call | Endpoint | Roles |
|---|---|---|
| Department queue | `GET /queue` | manager, staff |
| Department members | `GET /users?departmentId=&isActive=true` | manager (rows are scoped server-side) |
| Uptake per order | inside `GET /orders/:id` → `departments[]` (sealed-quote filtered) | all |
| Claim | `POST /orders/:id/departments/:departmentId/claim` | manager, staff |
| Assign | `POST /orders/:id/departments/:departmentId/assign` | manager (and admin) — the member list comes from `GET /users`, which a manager may call for their own department |
| Pass | `POST /orders/:id/departments/:departmentId/pass` | manager, staff |
| Add department manually | `POST /orders/:id/departments` | admin |
| Unrouted orders | `GET /orders/unrouted` | admin |

---

## Steps

1. **Queue screen**: `QueueItemDto` carries `orderId`, `code`, `serviceName`, `customerName`,
   both provinces, `state`, `assigneeName`, `distributedAt` and `slaLate`, which is enough to
   decide whether to claim without opening the order. `slaLate` is computed by the backend;
   never recompute it here. Default sort: oldest pending first. Filters: state, service, date range.
2. **SLA presentation**: compute remaining time from `distributedAt` plus the service SLA hours.
   Past due renders a red chip; within one hour renders amber. This is display only —
   the backend raises the actual alert.
3. **Row actions**: staff and manager both see Claim and Pass; only a manager sees Assign,
   which opens a dialog listing the department's active members. The backend refuses an
   assignee from another department, so the list is never widened by a client parameter.
   Pass opens a `ConfirmDialog` with a **mandatory** reason field — the backend rejects an
   empty reason.
4. **Uptake panel on the order detail**: one row per department with its state, assignee, and
   pass reason where present. Amount and quote details in this panel obey sealed quoting:
   the owning sale and company roles see every row's quote, everyone else sees only their own
   department's row.
5. **Unrouted queue**: admin-only list with a call to action linking to
   `/admin/routing` filtered to the offending service, plus a manual "add department" action
   that flags the row as a manual exception in the audit trail.
6. **Freshness**: this screen is the one place where staleness is costly. Poll
   `GET /queue` every 60 seconds while the tab is visible, and refetch on window focus.
   Do not build a websocket layer — the backend has none.

---

## Acceptance

- An order created by a sale appears in the queue of every responsible department without a
  manual refresh within one polling interval.
- Passing an order requires a reason and immediately shows the pass state to the sale.
- Two staff members claiming the same order at once produce one winner and a clear
  "already claimed" message for the other (backend `409`).
- An admin can rescue an unrouted order in two clicks.

## Gotchas

- A department row can exist without a quote — `quoteVersion === 0` means "not quoted yet",
  which is different from an amount of zero.
- Do not derive "who is responsible" from the order's `departmentId`; that field is only
  populated after closing. Before that, responsibility is the set of rows in this panel.
