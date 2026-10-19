---
name: qa-quoting
model: haiku
description: Tests F3: quote submission, versions, reference prices, sealed quoting and revision requests.
---

> Load `.claude/ba/BA.md` first — it carries the accounts, the invariants,
> the mindset rules and the exact JSON report format you must return.
> You are a USER of BeeOps, not its developer. The spec is the oracle.
> Open your own browser page with `new_page` + `isolatedContext: "qa-quoting"`.
> Base URL: http://localhost:5173 (proxies to the DEPLOYED API). Writes get a
> `QA25-` prefix. Return ONLY the JSON report from BA.md §6.

# Mission
Departments quote blind; the sale sees everything; history is never lost.
Spec §6-F3. Invariants I-2, I-7.

# Setup
Create a fresh `QA25-` DOM order as qa.sale1 (both dept A and B receive it).

# Charters
1. **Quote form basics** — as qa.ma (dept A) open the order's quote panel:
   amount input groups thousands while typing but submits an integer; scope
   note, lead time and validity are optional. Submit 25,000,000 ₫.
2. **Status auto-move** — after the first quote the order shows Đang báo giá.
   As qa.mb submit 23,500,000 ₫ — with both departments quoted the order must
   move to Chờ chọn báo giá by itself. No sale action needed.
3. **SEALED — the core check** — as qa.ma look everywhere (order detail,
   departments panel, any list/export): dept B's amount must be invisible.
   Same as qa.mb for dept A's. As qa.sale1 both amounts sit side by side.
   As qa.sta (dept A staff) only dept A's quote is visible.
4. **Reference prices** — on the quote panel, the reference table shows up to
   5 past WON orders of the same service with code, closed date, route, size
   figures and final amount. If empty, an explanatory empty state — not a
   blank box. Confirm the note field of the order is NOT among the matching
   criteria shown.
5. **Update = new version** — as qa.ma submit again with 24,000,000 ₫. The
   form must have prefilled the previous values and say it creates version 2.
   Version 1 stays readable in the quote history (for the department itself
   and for qa.sale1).
6. **Partial update keeps stored fields** — version 3: change only the amount,
   leave scope note untouched. The stored scope note must survive.
7. **Revision request** — as qa.sale1 request a revision from dept A with a
   reason. Order returns to Đang báo giá; dept A is notified; the panel makes
   clear quoting reopened. Dept A quotes again (v4): back to Chờ chọn báo giá.
8. **Lowest highlighted, never auto-picked** — on the comparison panel the
   lowest amount is visually marked but nothing is selected for the sale.
9. **Quote without claiming** — on a new order, as qa.mb quote WITHOUT claiming
   first. It must be accepted (claiming is not a precondition).

# Edge cases
- Amount 0 or negative: refused (minimum 1 VND).
- As qa.sale1 try to quote via the API for a department: expect refusal.
- After selection (see tester 07), a department trying to quote gets the
  "đơn đã qua vòng chọn báo giá" explanation instead of a form.
