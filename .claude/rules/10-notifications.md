# 10 · F8 — Notifications and reminders

**Goal**: in-app notification is the primary channel; email is only a nudge. "My Tasks" answers
"what is waiting for me right now".

**Depends on**: `08-order-tracking`.

---

## Screens

| Route / place | Screen |
|---|---|
| Header bell | Unread badge plus a dropdown of the latest ten |
| `/notifications` | Full inbox with a read/unread filter and bulk mark-as-read |
| `/my-tasks` | Items awaiting my action, ordered by urgency |
| `/profile` | Per-event-type email toggles |

## Endpoints

`GET /notifications/stream` (SSE), `GET /notifications?isRead=&page=&limit=`, `GET /notifications/unread-count`,
`POST /notifications/read` (`{ ids[] }` or `{ all: true }`), `GET /notifications/my-tasks`,
`GET/PUT /notifications/preferences`.

Event types — the live `NotifType` enum carries **fourteen**, four more than the design listed:
`new_order`, `assigned`, `quote_received`, `all_passed`, `revision_requested`, `quote_won`,
`quote_lost`, `order_closed`, `order_rejected`, `order_cancelled`, `milestone_updated`,
`sla_late`, `quote_expired`, `mention`. Swagger types the field as a plain string (QA-24), so
`src/constants/notificationTypes.ts` holds the list and falls back gracefully for a new one.

---

## Steps

1. **Type registry**: one constant mapping each event type to an icon, a colour intent and an
   i18n label key. Every screen touching notifications reads from it — no per-screen switch.
2. **Badge**: delivery is a live **SSE stream** (`GET /notifications/stream`) with a polling
   fallback — the design lives in the backend's `2026-08-25-realtime-notifications-design.md` and
   is implemented in `src/services/notificationStream.ts` + `NotificationProvider`. `EventSource`
   carries the httpOnly cookie itself; a real notification arrives as the default `message` event
   (refetch the truth, never trust the payload), the 25-second heartbeat as a named `ping` event
   (ignored). After three consecutive drops the stream closes and the badge falls back to polling
   `unread-count` every 5 seconds, retrying the stream every 60; while the stream is live the same
   poll runs every 5 minutes as a safety net. Also refetch on window focus and after any action
   that plausibly generates a notification. **Caveat (backend):** the event bus is in-memory and
   single-instance — correct only while one API container runs; multiple replicas silently lose
   realtime (the mailbox stays correct, the 5-minute safety poll still catches up).
2b. **Arrival toast**: a live SSE event also raises a notistack toast (title, colour by
   the type registry's intent, a "Xem" action opening the order on its target tab) so an
   arrival is *seen*, not only counted. The `message` frame is parsed to `{type, title,
   orderId}` for this; a frame that fails to parse still bumps the badge but skips the toast.
   The toast never marks anything read — the SSE payload carries no id — the bell and inbox
   own read state.
3. **Dropdown**: latest ten with type icon, title, relative time and unread marker. Clicking an
   item marks it read and navigates to its order **on the tab the notification is about** —
   the order detail reads its tab from `?tab=`, and the type registry maps each event type to
   one. Ask the endpoint for `limit=10`; never fetch everything and slice.
4. **Inbox**: unread filter, "mark all as read", grouped by day, paginated through
   `?page=&limit=` like every other list. Changing the filter or marking everything read
   returns to page 1.
5. **My Tasks**: the backend already words one `reason` per task for the caller's role, so the
   page groups on it rather than re-deriving buckets: a sale gets "Chờ bạn chọn báo giá" and
   "Chờ khách xác nhận", a manager and staff get "Đơn mới chờ tiếp nhận" and "Đã nhận, chưa báo
   giá". Sections the user's roles do not produce are absent, not empty. There is no
   milestone-due bucket in the API.
6. **Email preferences**: a switch per event type on the profile page, saved as the `emailOff`
   array. In-app notifications cannot be switched off — state that in the helper text.

---

## Acceptance

- The badge count matches the inbox and clears correctly after "mark all as read".
- Clicking any notification lands on the relevant order with the relevant tab open.
- My Tasks is empty with an encouraging empty state when there is genuinely nothing to do.
- Turning off an email type stops the email without affecting in-app delivery.

## Gotchas

- The unread badge is shared state: `NotificationProvider` owns it so the inbox marking
  everything read updates the bell at once instead of a polling interval later.

- Notification writes are best-effort on the backend; a missing notification is not a failed
  action. Never block a user flow on a notification response.
- Emails deliberately omit the order value. Do not add it to any link preview or title the
  front-end generates.
