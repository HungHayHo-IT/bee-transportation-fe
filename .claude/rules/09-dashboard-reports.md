# 09 · F6 — Dashboard and reports

**Goal**: revenue and operating metrics assemble themselves. Three tiers — company, department,
personal — resolved by the caller's scope, not by a tier selector.

**Depends on**: `08-order-tracking`.

---

## Screens

| Route | Screen |
|---|---|
| `/dashboard` | Summary tiles plus the two or three charts that matter for the caller's tier |
| `/reports/revenue` | Revenue over time, breakdowns, average order value, win rate |
| `/reports/operations` | Funnel, response times, competition statistics, workload |

## Endpoints

`GET /dashboard/summary`, `/dashboard/revenue?groupBy=day|month|quarter&compare=true`,
`/dashboard/revenue/by?dimension=service|route|customer|sale|department`, `/dashboard/funnel`,
`/dashboard/win-rate`, `/dashboard/response-time`, `/dashboard/competition`,
`/dashboard/workload`, `/dashboard/drill`, `/dashboard/export`.

---

## Steps

1. **Tier resolution**: `GET /dashboard/summary` returns `scopeLevel` — the backend states the
   tier itself, so the dashboard badge reads that rather than guessing. `usePermissions().reportTier`
   still drives route and menu gating and the report pages, which have no summary call.
   The tier never changes which endpoint is called; it only changes which breakdowns are offered.
   **The operations endpoints are not open below the department tier**: `/dashboard/response-time`,
   `/dashboard/competition` and `/dashboard/workload` answer `403` for a sale, which is why
   `/reports/*` is guarded by `viewDepartmentReport` while `/dashboard` is open to everyone.
2. **Summary tiles**: revenue this month with the same-period comparison, order count by
   status, win rate, orders past SLA. A tile the tier does not include is not rendered.
3. **Revenue chart**: ApexCharts column, grouped by day / month / quarter with a comparison
   series. Currency axis formatted through the shared formatter, compact notation on the axis
   and full value in the tooltip.
   Bucket dates are the local start of the period (`2026-08-01` for August). They arrived one
   day early until 23/08/2026; `src/pages/dashboard/revenuePeriod.ts` still owns the label and
   the drill-down range so a change of that kind stays a one-line fix.
4. **Breakdowns**: one reusable `BreakdownPanel` driven by the `dimension` parameter — service,
   route, customer, sale, department. Five variations of the same component, never five
   components. Department and sale dimensions belong to the company tier: the backend answers
   `403` below it, and the front-end hides them so the control is never dead.
5. **Operations**: funnel from request through quote, close and completion; response time
   (distribution to first claim, distribution to first quote); average number of departments
   per order and win rate per department; workload per department and per user.
6. **Drill-down**: every chart element is clickable and calls `/dashboard/drill` with the same
   filter set, opening the resulting orders in a side panel that links into the order list.
   A chart without a drill-down is incomplete. The panel asks for an explicit `limit` and says
   so when it hits it — a truncated list must never read as a complete one.
7. **Export**: Excel through the export endpoint using the currently applied filters.
8. **Personal tier caveat**: for a staff member, "personal" means the orders they handle, not
   the orders they created — staff never create orders. Verify what the backend actually
   returns before shipping this tier; it is listed in Open Questions.

---

## Acceptance

- A sale sees their own revenue and win rate, and no department or company figure anywhere.
- A manager sees their department's totals and per-member workload, and no other department.
- A user carrying `canViewCompanyReport` without a leadership role sees the company dashboard
  and its drill-downs return rows rather than an empty list.
- Every chart supports drill-down and Excel export.

## Gotchas

- `winRate` is `null`, not `0`, while nothing has been decided. Render an em dash: a 0% win
  rate on a brand-new account is a lie, and `toFixed` on `null` crashes the tile.

- Revenue is measured by `closedAt`, never `createdAt`. An order created in July and closed in
  August is August revenue. Label date filters accordingly.
- The dashboard must never sum amounts client-side from the order list; the list is scoped and
  paginated, and the totals would silently disagree.
