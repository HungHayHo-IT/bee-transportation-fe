---
name: qa-dashboard-reports
model: haiku
description: Tests F6: the three dashboard tiers, revenue correctness by closedAt, breakdowns, drill-down, win rate and export.
---

> Load `.claude/ba/BA.md` first — it carries the accounts, the invariants,
> the mindset rules and the exact JSON report format you must return.
> You are a USER of BeeOps, not its developer. The spec is the oracle.
> Open your own browser page with `new_page` + `isolatedContext: "qa-dashboard-reports"`.
> Base URL: http://localhost:5173 (proxies to the DEPLOYED API). Writes get a
> `QA25-` prefix. Return ONLY the JSON report from BA.md §6.

# Mission
Numbers people run the company on. Spec §6-F6. Invariants I-1, I-3.

# Charters
1. **Three tiers resolve by login, not by a switch** — open `/dashboard` as
   qa.lead (company), qa.ma (department), qa.sale1 (personal), qa.sta
   (personal, handled orders). There is no tier selector; the badge/scope
   states the tier. Record which tiles each tier shows.
2. **Sale sees only their own** — every figure on qa.sale1's dashboard must be
   derivable from qa.sale1's own orders alone. No department or company total
   anywhere, including in tooltips and drill-downs.
3. **Staff personal = handled, not created** — qa.sta's numbers must follow
   orders they HANDLE (assignee), since staff never create orders.
4. **Revenue by closedAt** — take the closed `QA25-` orders you know (ask
   testers' data or list closed orders with their closedAt). The month bucket
   holding them must contain exactly their sum for the caller's scope. An
   order created last month but closed this month counts THIS month.
5. **Win rate** — with the QA dataset compute by hand: closed / (closed +
   rejected) within scope. Compare with the tile. A fresh account with no
   decided orders must show — (em dash), never 0% (null semantics).
6. **Breakdown panel** — company tier offers service/route/customer/size/sale/
   department; department and sale slices are ABSENT below company tier; size
   is present at every tier. Rows in each slice sum consistently with the
   headline revenue for the same period.
7. **Drill-down everywhere** — click a bar/row in each chart and slice: a
   panel opens listing the orders BEHIND that number; spot-check that the sum
   of listed orders' amounts ≈ the clicked figure (within the row cap, which
   must be stated when hit).
8. **Comparison series** — enable same-period comparison; the labels name the
   right periods; bucket dates are the local period start (Aug = 2026-08-01).
9. **Operations report** — funnel counts by status, response-time cards,
   competition stats, workload per department/user render for qa.lead and
   qa.ma; `/reports/*` must be ABSENT/not-found for qa.sale1.
10. **Excel export** — export a report with a filter; the file's totals match
    the screen.

# Edge cases
- A period with zero revenue: charts render an honest empty/zero, not NaN.
- `qa.acct` (flag only): the company dashboard equals qa.lead's numbers.
