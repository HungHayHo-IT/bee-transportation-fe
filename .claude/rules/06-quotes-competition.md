# 06 · F3 — Competitive quoting

**Goal**: every responsible department submits one number — the order value — supported by
reference prices from past won orders. The sale compares them on one screen. Quotes are sealed
between departments.

**Depends on**: `05-distribution-queue`.

---

## Screens

| Route | Screen |
|---|---|
| `/orders/:id` → "Quote" panel (department view) | Submit or update our quote, with reference prices |
| `/orders/:id` → "Comparison" panel (sale view) | All quotes side by side, request revision, select winner |

## Endpoints

| Call | Endpoint | Roles |
|---|---|---|
| Submit / update quote | `POST /orders/:id/departments/:departmentId/quote` | manager, staff |
| Reference prices | `GET /orders/:id/reference-prices` | manager, staff |
| Quote rows | none — they arrive inside `GET /orders/:id` as `departments[]`, already filtered by the sealed-quote rule | all |
| Superseded versions | `GET /orders/:id/departments/:departmentId/quote-history` | own department, owning sale, company roles |
| Request revision | `POST /orders/:id/request-revision` | sale |
| Select winner | `POST /orders/:id/select-quote` | sale |

Quote body: `{ amount, scopeNote?, leadTime?, validUntil? }` — amount is an integer in VND,
minimum 1.

---

## Steps

1. **Department quote form**: amount field with grouped-thousands formatting while typing and a
   plain integer on submit; scope note ("includes / excludes"); expected lead time; validity
   date. Submitting when a quote already exists is an update that increments the version — the
   form says so and names the version it is about to create.
   **Previous versions are readable** through the quote-history endpoint: the current values
   live on the department row and the superseded ones come back from history, newest first.
   A field left out of the request now keeps its stored value, but the form still prefills
   every field — the department is editing its quote, not patching it.
   The form is rendered only when the department may actually quote: not after it passed
   (`400 Phòng bạn đã bỏ qua đơn này`), not after it lost, and not once the order is past
   selection (`400 Đơn đã qua vòng chọn báo giá`). Each case renders the reason instead.
2. **Reference prices**: a compact table above the amount field — the five closest matching won
   orders with their code, closed date, route, size and final amount. Label it clearly as
   historical support, and show the matching criteria: same service, route similarity and
   comparable size, where size means weight, volume, package count and container type.
   When the response is empty, render an explanatory empty state, not a blank box.
3. **Sale comparison panel**: one column per quoting department showing amount, scope note,
   lead time, validity, quote version and time since submission. Lowest amount is highlighted
   but never auto-selected — the specification requires the sale to decide after talking to the
   customer. Departments that passed appear greyed with their reason; departments still pending
   appear as awaiting.
4. **Request revision**: multi-select departments plus a mandatory reason. This posts a comment
   of kind `revision_request`, returns the order to `quoting`, and notifies those departments.
   The panel must make clear that requesting a revision reopens quoting for everyone selected.
5. **Select winner**: `ConfirmDialog` naming the department and amount, optional reason.
   Selecting does **not** record revenue — it moves the order to "awaiting customer".
   The UI must not call this "closing"; that is a separate action in `07-order-close`.
   Selection is offered only in `distributed`, `quoting` and `awaiting_selection`: a second
   selection while awaiting the customer is answered `409`. Changing the winner means
   requesting a revision first, which returns the order to `quoting` and undoes the choice.
6. **Sealed quoting**: never fetch or render another department's amount for a
   manager or staff user. The backend filters the rows; the front-end must not attempt to
   reconstruct totals from any other endpoint either.

---

## Acceptance

- A manager viewing an order their department quoted sees exactly one quote row: their own —
  even after their department wins.
- Submitting a second quote produces version 2 and keeps version 1 readable under
  "earlier versions", for the department itself and for the owning sale.
- The comparison screen updates when a new quote arrives (refetch on focus and on a 60-second
  interval while the order is in a quoting state).
- Selecting a winner leaves `finalAmount` unset until the order is closed.

## Gotchas

- `firstQuotedAt` versus `lastQuotedAt`: the response-time metric uses the first, but
  `OrderDeptDto` carries only `lastQuotedAt`. Label the card "quote updated", never
  "responded in"; the response-time figure comes from the dashboard endpoint instead.
- Amount arrives as a JSON number of whole dong, not the string `api-docs.md` promises.
  Format it through `formatCurrencyVnd`; never run arithmetic on it in a component.
- The status moves itself: quoting takes the order to `quoting`, and it reaches
  `awaiting_selection` once every department that has not passed has quoted. No sale action
  opens the comparison — this answers what used to be open question Q-04.
- A department may quote without claiming first. Do not gate the quote form on `claimed`.
