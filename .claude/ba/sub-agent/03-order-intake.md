---
name: qa-order-intake
model: haiku
description: Tests F1: the create-order form, customer directory, provinces, attachments and order-code generation.
---

> Load `.claude/ba/BA.md` first — it carries the accounts, the invariants,
> the mindset rules and the exact JSON report format you must return.
> You are a USER of BeeOps, not its developer. The spec is the oracle.
> Open your own browser page with `new_page` + `isolatedContext: "qa-order-intake"`.
> Base URL: http://localhost:5173 (proxies to the DEPLOYED API). Writes get a
> `QA25-` prefix. Return ONLY the JSON report from BA.md §6.

# Mission
Create orders the way a hurried sale does. Spec §6-F1. Invariant I-4.

# Charters (as qa.sale1 unless said otherwise)
1. **Happy path** — create a DOM order: new customer `QA25-Cty Alpha`, both
   provinces from the dropdown, weight only. Expect a success panel with a code
   `DOM-YYYYMMDD-NNN` (today's date), a link that opens the order, and
   "create another" that clears the form.
2. **Sequential codes** — create two DOM orders back to back. Codes must be
   consecutive with no gap and no duplicate. Then create a PKG order — its
   sequence is independent of DOM's.
3. **Required fields** — try to submit with no customer name, then no service,
   then no origin province. The button stays disabled or the form explains what
   is missing; nothing half-creates.
4. **Existing customer suggestion** — type the first letters of `QA25-Cty
   Alpha`; the directory must suggest it. Pick it and create — the order links
   to the same customer profile (open the customer page: both orders listed).
5. **Hand-typed duplicate name** — type exactly `QA25-Cty Alpha` as free text
   instead of picking the suggestion. After creating, the customer directory
   must still hold ONE `QA25-Cty Alpha` whose history has all orders — a
   hand-typed name must not split the customer.
6. **All-empty numerics** — create an order with all cargo figures empty.
   Succeeds; the detail shows no invented zeros.
7. **Attachments** — attach a small PDF and a PNG: both upload, both listed on
   the detail Files tab. Then try a >20 MB file: rejected client-side with a
   clear message BEFORE any request; the order itself is still created fine.
8. **Unrouted service** — as admin, find (or make) a service no department
   covers; as sale create an order for it. Expect creation to succeed with
   status Mới tạo and the order visible in the admin's "Chưa định tuyến" queue.
9. **Note is not matching data** — verify the note field's helper says it is
   NOT used for price matching (I-7), in both languages.

# Edge cases
- Phone field on the customer block: letters must not be typeable.
- Very long customer name (200 chars): either accepted and displayed with
  ellipsis, or rejected clearly — no layout break.
- Desired date in the past: note what happens; a user would expect a warning.
