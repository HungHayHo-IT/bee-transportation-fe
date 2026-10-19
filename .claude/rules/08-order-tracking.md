# 08 · F5 — Tracking, milestones, collaboration

**Goal**: one place that answers "where is this order, who holds it, what happened last".
Replaces the per-person spreadsheets entirely.

**Depends on**: `07-order-close`.

---

## Screens

| Route | Screen |
|---|---|
| `/orders` | Scoped list with the full filter set and Excel export |
| `/orders/kanban` | Same filters, grouped by status, 50 rows per column |
| `/orders/:id` | Detail: summary, departments, quotes, milestones, comments, files, timeline |

## Endpoints

`GET /orders`, `GET /orders/kanban`, `GET /orders/:id`, `GET /orders/:id/timeline`,
`GET /orders/export`, `GET/PATCH /orders/:id/milestones[/:milestoneId]`,
`GET/POST /orders/:id/comments`, `POST /orders/:id/files`, `GET /files/:orderId/:fileId`.

Filter set: `status`, `serviceId`, `departmentId`, `assigneeId`, `customerId`, `createdBy`,
`originProvince`, `destinationProvince`, `fromDate`, `toDate`,
`dateField=created|closed|completed`, `q`, pagination and sorting.

---

## Steps

1. **List**: server-side paging through `DataTableShell`. Debounced search 350 ms; any filter
   change resets to page 1; filter state is mirrored into the URL query string so a filtered
   view can be shared and survives a refresh.
2. **Columns**: code, service chip, customer, route (origin → destination, ellipsis + tooltip),
   status chip, responsible department, assignee, created date, value. The value column renders
   an em dash when the backend sends `null` — that is the amount-visibility rule at work, not
   missing data.
3. **Kanban**: columns follow the lifecycle order. Cards show code, customer, service, age and
   the department holding the card. Drag-and-drop is **phase two** — do not build it now; status
   changes have their own guarded endpoints.
4. **Detail layout**: a summary header (code, status, customer, service, route, value, sale,
   department) over a tab set — Overview, Departments and quotes, Milestones, Discussion,
   Files, Timeline. The tab set is the same component for every role; tabs the user cannot see
   are removed, not disabled.
5. **Milestones**: an ordered vertical stepper generated at close time. Only the responsible
   department may update. Rules to enforce in the UI: sequential completion (a step cannot be
   completed while an earlier one is pending), and skipping requires a note. Each step accepts
   a note and attachments (handover reports, proof-of-delivery photos). Completing the last
   step moves the order to completed — reflect it without a manual refresh.
6. **Discussion**: threads split by department. A sale sees every thread plus the general one;
   a department sees only its own thread and the general one. Mentions are phase two but the
   data shape already carries them.
7. **Files**: uploaded through the API and downloaded through the authenticated stream
   endpoint. Never render a direct static URL — customer documents must not be reachable by
   link alone.
8. **Timeline**: rendered from the activity log — creation, distribution, claims, quote
   versions, selection, closing, each milestone. Group by day, newest first.
9. **Export**: sends the current filter set and streams an Excel file. Show a progress
   indicator on the button and handle a failure with a toast.

---

## Acceptance

- Two users with different roles opening the same order see the same tabs minus the ones they
  lack, and never a broken or empty tab.
- The list URL can be copied into another session and reproduces the same filtered view.
- A milestone cannot be completed out of order, and skipping without a note is impossible.
- Exporting with filters applied produces exactly the rows on screen, subject to scope.

## Gotchas

- The Kanban endpoint caps each column at 50 rows. Display the cap; never present a truncated
  column as complete.
- Timeline entries and audit entries come from the same table; the order timeline is the subset
  carrying an order id. Do not build a second endpoint for it.
