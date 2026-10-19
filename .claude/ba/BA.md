# BA.md — Business context for the QA tester fleet

> This file is the shared context loaded by every tester agent in
> `.claude/ba/sub-agent/`. It distils the approved specification
> ("Đề xuất BeeOps", final 21/08/2026) into what a tester needs: what the
> system promises, who the users are, how to drive it, and how to report.
> The specification is the oracle. The source code is NOT.

---

## 1. What is being tested

**BeeOps** — the internal operations web app of Bee Transportation Corporation.
It replaces an email-and-spreadsheet process with one flow:

1. A sale creates a standardised order → the system generates a meaningful code
   `[SERVICE]-[YYYYMMDD]-[NNN]` (sequence resets daily, per service) and
   distributes the order to **every** department configured for that service.
2. Departments quote **in parallel and sealed** (no department sees another's
   price), supported by up to 5 reference prices from past won orders.
3. The sale compares all quotes on one screen, talks to the customer off-system,
   selects the winning quote, then **closes** — the closed amount is locked as
   the order's revenue. There is no cost or margin anywhere.
4. The winning department updates progress through the **milestone set of that
   service** until the final milestone (always "Nghiệm thu") completes the order.
5. Revenue and operating metrics aggregate into a **three-tier dashboard**
   (company / department / personal) resolved by the viewer's permissions.

The admin configures the whole organisation (departments, users, services,
routing matrix, milestone templates, per-service input boxes) with no developer.

## 2. Non-negotiable invariants (a violation of any of these is a Blocker)

| # | Invariant |
|---|---|
| I-1 | **Three axes never merge.** Role decides what you may DO; server-side scope decides whose ROWS you see; money visibility decides whether an AMOUNT is populated. A sale never sees department revenue. `finalAmount: null` means "not allowed to see", rendered as an em dash "—", never 0. |
| I-2 | **Sealed quotes.** A manager or staff member sees only their own department's quote — before, during and after selection, in every screen, panel, export and API response. Only the owning sale and company-level roles (admin, leader, `canViewCompanyReport`) see them side by side. |
| I-3 | **Revenue = the closed amount, measured by `closedAt`.** Editing the winning quote after closing must NOT change the displayed revenue. Dashboard revenue never comes from client-side summing of a paginated list. |
| I-4 | **Order code comes from the backend.** The UI never composes it. Sequence per service per day, no gaps, no duplicates, `PKG-20260825-001` style. |
| I-5 | **Out-of-scope = 404, worded "not found"**, never "forbidden". Opening another sale's order by URL shows the not-found page, not an error toast. |
| I-6 | **Permissions are a union across roles.** A manager-and-sale sees the union of both menus with no duplicates. |
| I-7 | **Reference-price matching uses only** the fixed numeric fields + service + route. The free-text note deliberately never affects matching, and the UI must never claim otherwise. |
| I-8 | **`rejected` and `cancelled` are different.** Rejection is a customer decision with a reason from a fixed list and counts in the win-rate denominator. Cancellation is internal, needs a free-text reason, and stays out of win rate. |
| I-9 | Milestones run **sequentially**; skipping needs a note; completing the last milestone moves the order to Hoàn thành without a manual refresh. Closed orders keep the milestone **snapshot** — editing a template afterwards must not touch them. |
| I-10 | The UI is Vietnamese by default, English secondary, and every visible label switches with the language. No raw i18n keys, no mixed-language screens. |

## 3. Roles and accounts

All testing runs against the **deployed** backend (`http://167.254.68.111`) —
user decision of 25/08/2026. Writes there are sanctioned for this run; prefix
every entity you create with `QA25-` so it can be cleaned afterwards. The
front-end dev server runs at `http://localhost:5173` and proxies `/api` to the
deployed API, so the session cookie stays first-party — always drive the app
through `http://localhost:5173`, never the IP directly.

The organisation was seeded for this run: department **QA Phòng A** (covers
DOM, CUS, RNT, PKG; manager qa.ma; staff qa.sta) and **QA Phòng B** (covers
DOM, CBT, LIF; manager qa.mb; staff qa.stb). DOM is covered by BOTH — that is
the competitive-quoting service. CON, BRK, MMT and PRJ have no department on
purpose: orders for them go to the unrouted queue.

| Account | Password | Role(s) | What they may do |
|---|---|---|---|
| `admin@beetransportation.vn` | `adminpassword` | admin | Everything organisational; create orders; close/cancel |
| `qa.sale1@bee.vn` | `BeeOps@2026!x` | sale | Create orders, compare quotes, select, close/reject/cancel — own orders only |
| `qa.sale2@bee.vn` | `BeeOps@2026!x` | sale | Same, a second sale for cross-scope checks |
| `qa.ma@bee.vn` | `BeeOps@2026!x` | manager (QA Phòng A) | Assign within own department, quote, queue |
| `qa.mb@bee.vn` | `BeeOps@2026!x` | manager (QA Phòng B) | Same, the competing department |
| `qa.sta@bee.vn` | `BeeOps@2026!x` | staff (QA Phòng A) | Claim, quote, update milestones |
| `qa.stb@bee.vn` | `BeeOps@2026!x` | staff (QA Phòng B) | Same, on the competing side |
| `qa.lead@bee.vn` | `BeeOps@2026!x` | leader | Read-only oversight, company dashboard |
| `qa.acct@bee.vn` | `BeeOps@2026!x` | sale + `canViewCompanyReport` | Company dashboard via the flag, no leadership role |

Verify an account's actual roles at `GET /api/auth/me` before relying on them.

## 4. Domain reference

**10 services** (code = order-code prefix): CON tư vấn · CUS hải quan ·
DOM nội địa · PRJ hàng dự án/siêu trường siêu trọng · LIF nâng hạ ·
MMT đa phương thức · PKG đóng gói · CBT xuyên biên giới · BRK môi giới hàng hải ·
RNT cho thuê thiết bị.

**Lifecycle** (Vietnamese labels as the UI shows them):
`Mới tạo → Đã phân phối → Đang báo giá → Chờ chọn báo giá → Chờ khách xác nhận →
Đã chốt → Đang thực hiện → Hoàn thành`, plus terminal `Từ chối` (customer said
no) and `Hủy` (internal, from any non-terminal state). "Chờ khách xác nhận" can
return to "Đang báo giá" on a revision request (quote version +1). An order for
a service with no responsible department stays `Mới tạo` in the "Chưa định
tuyến" queue for the admin.

**Status moves itself**: the first quote takes the order to Đang báo giá; once
every non-passing department has quoted it reaches Chờ chọn báo giá; selecting a
winner moves it to Chờ khách xác nhận (selection is NOT closing); closing locks
revenue; completing the last milestone reaches Hoàn thành.

**Per-service input boxes**: each service declares which of the 7 shared cargo
figures it shows (`GET /api/services/:id/form-schema` → `cargoFields`, empty
hides the whole block) and its own boxes (`fields[]`: text/number/select/date/
boolean, required flag, unit, options). CON and RNT show no cargo block at all;
CUS has "Loại hình tờ khai" required; RNT has "Thuê từ ngày"/"Thuê đến ngày"
required. Answers live in `serviceData`; an unknown key is a 400, not silently
dropped.

**Milestone sets** (final milestone always Nghiệm thu) — e.g. DOM: Đã điều xe →
Đã lấy hàng → Đang vận chuyển → Đã giao → Nghiệm thu (POD). The full ten sets
are in the spec §7; read them from `/admin/services` at run time.

## 5. Tester mindset — binding rules

1. **You are a user, not the developer.** Judge what you see against the spec
   and against what a reasonable logistics employee would expect. Do not read
   the front-end source code to explain away behaviour — if the screen confuses
   you, that is a finding, whatever the code says.
2. **No confirmation bias.** Your job is to find where the system is wrong, not
   to prove it right. Every charter you run, first ask "how would this break for
   a real person on a normal Tuesday?".
3. UX failures are real findings: a dead button, a mislabelled field, an amount
   that reads 0 instead of —, a Vietnamese screen with an English fragment, a
   truncated list presented as complete, an action with no feedback.
4. **Evidence or it did not happen.** Every finding carries reproduction steps
   and what you actually observed (response body, screen text, status code).
5. Stay in your lane: your charter file names your scope. Note out-of-scope
   observations in `notes`, do not chase them.
6. **Prefix every entity you create with `QA25-`** in its name/note so it can
   be found and cleaned later. The deployed backend is the target for this
   run; do not be shy about writing, but never touch rows without the prefix
   except where a charter says so.
7. Drive the app the way a user does — through the browser UI first
   (chrome-devtools MCP; open your own page with `new_page` using
   `isolatedContext: "<your-agent-id>"` so your session cookie never collides
   with another tester's). Use direct `curl` calls only to verify what the UI
   showed you, never as a substitute for using the UI.

## 6. Reporting protocol — what you return to the parent

Your final message is data for aggregation, not prose. Return exactly this
structure (JSON, no surrounding commentary):

```json
{
  "agent": "<file name without extension>",
  "charters_run": 12,
  "charters_passed": 10,
  "findings": [
    {
      "id": "T03-01",
      "severity": "blocker | high | medium | low | ux",
      "persona": "qa.sale1",
      "title": "one line, user language",
      "steps": ["step 1", "step 2"],
      "expected": "what the spec (§ reference) or a reasonable user expects",
      "actual": "what happened, with the exact message/status observed",
      "evidence": "response fragment, screen text, or console line"
    }
  ],
  "notes": ["out-of-scope observations, environment problems, data left behind"]
}
```

Severity guide: **blocker** = an invariant in §2 violated or a core flow
impossible; **high** = wrong result or data loss on a normal path; **medium** =
wrong on an edge path or misleading output; **low** = cosmetic wrongness;
**ux** = correct but confusing for a real user.

An empty `findings` array with all charters passed is a valid, welcome answer.
Do not invent findings to look thorough, and do not soften real ones.

## 7. The fleet — 14 testers

| # | File | Scope | Primary personas |
|---|---|---|---|
| 01 | `01-auth-session.md` | Login, forced password change, session cookie, 401 handling, logout | all |
| 02 | `02-permissions-scope.md` | Role matrix, menu gating, 404-not-forbidden, money visibility, role union, `canViewCompanyReport` | every account |
| 03 | `03-order-intake.md` | F1: create-order form, customer directory, provinces, attachments, order code, source | qa.sale1 |
| 04 | `04-service-fields.md` | Per-service input boxes on create/edit/detail + the admin catalogue behind them | qa.sale1, admin |
| 05 | `05-distribution-queue.md` | F2: queue, claim/assign/pass, claim races, unrouted queue, SLA display | qa.ma, qa.sta, admin |
| 06 | `06-quoting.md` | F3: quote submit/update/versions, reference prices, sealed quotes, comparison, revision requests | qa.ma, qa.mb, qa.sale1 |
| 07 | `07-closing.md` | F4: select winner, close, reject, cancel, post-close edit, confirmation PDF | qa.sale1, admin |
| 08 | `08-lifecycle.md` | The state machine end to end: every legal and illegal transition, auto-moves, 409 wording | qa.sale1, qa.ma, qa.sta |
| 09 | `09-tracking-list.md` | F5: order list filters (all of them), URL sharing, Kanban and its 50-row cap, Excel export | qa.lead, qa.sale1 |
| 10 | `10-order-detail-collab.md` | F5: detail tabs per role, timeline, files (20 MB limit, auth-only download), per-department discussion | qa.sale1, qa.sta, qa.mb |
| 11 | `11-milestones.md` | Milestones: generation at close, sequential rule, skip-with-note, attachments, completion, template snapshot | qa.sta, qa.ma, admin |
| 12 | `12-dashboard-reports.md` | F6: three tiers, tiles, revenue by closedAt, breakdowns incl. size, drill-down, win rate, export | qa.lead, qa.ma, qa.sale1, qa.acct |
| 13 | `13-org-admin.md` | F7: departments, users, services & SLA, milestone templates, routing matrix, activity log | admin |
| 14 | `14-monkey.md` | Chaos: garbage input, hostile strings, double actions, URL tampering, language flips, mobile viewport, back/forward | qa.sale1, qa.sta |

Every tester runs on the cheap model (haiku) — the charters are deliberately
concrete so no expensive reasoning is needed. The parent spawns them, collects
the 14 JSON reports, deduplicates, verifies anything surprising itself, and
writes the consolidated result.
