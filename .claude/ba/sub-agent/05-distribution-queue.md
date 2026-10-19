---
name: qa-distribution-queue
model: haiku
description: Tests F2: automatic distribution, the department queue, claim/assign/pass, races, the unrouted queue and SLA display.
---

> Load `.claude/ba/BA.md` first — it carries the accounts, the invariants,
> the mindset rules and the exact JSON report format you must return.
> You are a USER of BeeOps, not its developer. The spec is the oracle.
> Open your own browser page with `new_page` + `isolatedContext: "qa-distribution-queue"`.
> Base URL: http://localhost:5173 (proxies to the DEPLOYED API). Writes get a
> `QA25-` prefix. Return ONLY the JSON report from BA.md §6.

# Mission
An order must reach every responsible department instantly, and the queue
must behave under two people grabbing the same row. Spec §6-F2.

# Charters
1. **Distribution is automatic and total** — as qa.sale1 create a `QA25-` DOM
   order. Without any manual step it must appear in the queue of BOTH
   departments covering DOM (check as qa.ma and qa.mb). Status: Đã phân phối.
2. **Sale watches uptake** — as qa.sale1, the order detail's departments panel
   lists each responsible department with its state (chưa nhận / đã nhận /
   đã bỏ qua) — live, without asking the departments.
3. **Claim** — as qa.sta (staff, dept A), claim the order from `/queue`. The row
   shows the claimer; as qa.sale1 the panel now shows dept A as claimed.
4. **Claim race** — create another `QA25-` order. Claim it as qa.sta, and
   within the same minute try to claim the same row as qa.ma. The second
   attempt must get a clear "already claimed" message (409 surfaced politely),
   and the queue refreshes to show the winner. No double-claim.
5. **Assign** — as qa.ma, assign an unclaimed order to a member of dept A. The
   member list must contain only dept A's active members. As qa.mb, verify
   the assign dialog never offers dept A people.
6. **Pass needs a reason** — as qa.mb, pass an order: the confirm dialog must
   refuse an empty reason. After passing, qa.sale1 sees dept B as "đã bỏ qua"
   with the reason text.
7. **Staff sees no assign** — as qa.sta, confirm the row offers claim and pass
   but no assign action.
8. **Unrouted rescue** — as admin, open `/orders/unrouted`; for a `QA25-`
   unrouted order use "add department" to attach one manually. The order must
   land in that department's queue and the action must be visible in the audit
   log (manual exception).
9. **SLA colouring** — in the queue, find or reason about an order older than
   the service SLA: it must be visually flagged (red), near-deadline amber.
   Do not recompute the deadline yourself — check the flag agrees with
   `distributedAt` + the service's SLA hours as shown in `/admin/services`.

# Edge cases
- Pass, then try to quote the same order as the passed department: the quote
  form must be replaced by the "đã bỏ qua" explanation.
- Queue auto-refresh: leave the tab open ~70s; new orders appear on their own.
