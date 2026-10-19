# 07 · F4 — Closing, rejection, cancellation

**Goal**: one record holds the final agreed number. Closing locks it as revenue and generates
the order's milestone set.

**Depends on**: `06-quotes-competition`.

---

## Screens

Actions on `/orders/:id`, all restricted to the owning sale and admin:
close, customer rejected, cancel, download the confirmation document.

## Endpoints

| Call | Endpoint |
|---|---|
| Close | `POST /orders/:id/close` — `{ note? }` only. The winning department is already fixed by `select-quote`; closing just locks the revenue |
| Customer rejected | `POST /orders/:id/reject` — `{ rejectReason, note }` |
| Cancel | `POST /orders/:id/cancel` — reason mandatory |
| Confirmation document | `GET /orders/:id/confirmation.pdf` |
| Edit, before or after closing | `PATCH /orders/:id` — `changeNote` is mandatory once the order is closed |

---

## Steps

1. **Close dialog**: shows the winning department and the exact amount being locked, plus an
   optional note. The confirmation text must state that the amount becomes the order's revenue
   and can no longer follow later quote edits.
   Closing is reachable **only from `awaiting_customer`** — the backend state machine
   (`orders/order-state.helper.ts`) answers `409` from anywhere else, so the button appears only
   in that state. `src/constants/orderStatus.ts` mirrors that table for close, reject and cancel.
2. **Reject dialog**: a reason picked from the fixed list — price, lead time, chose a
   competitor, customer dropped the requirement, other — plus a free note. This feeds win-rate
   analysis, so the list is a constant shared with the dashboard, never free text.
   **The list is a backend enum of Vietnamese strings** (`RejectOrderDto`), so the values travel
   verbatim and only the label is translated; `src/constants/rejectReasons.ts` holds both.
   Rejection is allowed from `distributed`, `quoting`, `awaiting_selection` and
   `awaiting_customer` — the customer can say no before any quote is selected.
3. **Cancel dialog**: mandatory free-text reason, available from any state except the three
   terminal ones (completed, rejected, cancelled). Visually distinct (error colour) from
   rejection; they are different business events.
4. **Post-close adjustment**: `PATCH /orders/:id` stays available after closing and requires
   `changeNote`. The dialog must enforce the note and the timeline must show it afterwards.
   (This answers what used to be open question Q-07.)
5. **Confirmation document**: opens the PDF in a new tab via the API; it is not a static file
   and must go through the authenticated request.
6. **Illegal transitions**: the backend answers `409` with a Vietnamese message naming both
   states. Surface it verbatim in a toast and refetch the order — the local copy is stale.

---

## Acceptance

- Closing sets the order to the execution state and renders the milestone list generated from
  the service template.
- Editing the winning department's quote afterwards does not change the displayed revenue.
- Rejection and cancellation are distinguishable in the list, in the timeline and in the
  dashboard win-rate breakdown.
- The close action is unavailable when no department has quoted.

## Gotchas

- `closed` is a real, observable state: closing sets it and the order reaches `in_progress`
  only when execution starts. Both appear in the live database.
- `rejected` and `cancelled` are separate terminal states. Rejection carries `rejectReason` and
  belongs in the win-rate denominator; cancellation is internal and stays out of it.
- The rejection reason list lives in the application layer, not a catalogue table: price,
  lead time, chose a competitor, customer dropped the requirement, other.
- The closing note, the rejection note and the cancellation reason are three separate fields
  (`closeNote`, `rejectNote`, `cancelReason`) since 23/08/2026. Render each under its own
  label; do not rename one field after the status.
- The edit dialog deliberately excludes service and customer: changing the service would
  invalidate the generated code and the milestone snapshot the order was closed with.
