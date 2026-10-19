# Coding Rules — BeeOps Admin

Binding for every file in this repository. These rules override personal habit, override
examples copied from other projects, and override the legacy patterns in `btn-admin`
(that project contains Vietnamese comments, `any`, and dead code — do not carry them over).

A change that violates any rule below is not done, however well it works.

---

## 1. Language

**All code artefacts are English**: identifiers, comments, file and folder names, commit
messages, type names, test names, log messages, documentation in `.claude/`.

**Vietnamese exists in exactly one place**: `src/locales/vi.json`. Nowhere else.

```ts
// WRONG — Vietnamese comment, Vietnamese literal in code
// Lấy danh sách đơn hàng theo phòng ban
const title = "Danh sách đơn hàng";

// RIGHT — English comment, copy resolved through i18n
const title = t("orders.list.title");
```

Backend error messages arrive in Vietnamese and are displayed as received. That is data,
not source code, and it is allowed.

---

## 2. No abbreviations

Names are spelled out. The reader must not have to guess.

| Wrong | Right |
|---|---|
| `deptId` | `departmentId` |
| `qty`, `amt` | `quantity`, `amount` |
| `usr`, `cust` | `user`, `customer` |
| `btnCfg` | `buttonConfig` |
| `hdl`, `cb` | `handleSubmit`, `onQuoteSelected` |
| `tmp`, `data2`, `res` | `pendingOrder`, `filteredOrders`, `response` |
| `fmtCur` | `formatCurrency` |

The only accepted short forms are industry-standard ones: `id`, `url`, `uri`, `api`, `http`,
`dto`, `pdf`, `csv`, `vat`, `sla`, `jwt`, plus the ten service codes (`DOM`, `CUS`, …).
Loop indices may be `index`; never `i`, `j` in anything longer than three lines.

---

## 3. Naming

| Kind | Convention | Example |
|---|---|---|
| Component file and symbol | `PascalCase` | `OrderQuoteComparison.tsx` |
| Hook | `useXxx`, camelCase file | `useOrderFilters.ts` |
| Service function | verb first | `fetchOrders`, `createQuote`, `selectWinningQuote` |
| Event handler | `handleXxx` (own) / `onXxx` (prop) | `handleQuoteSubmit`, `onOrderSelected` |
| Boolean | `is` / `has` / `can` / `should` prefix | `isSealedQuoteMode`, `canCloseOrder` |
| Constant | `SCREAMING_SNAKE_CASE` | `DEFAULT_PAGE_SIZE`, `ORDER_STATUS_LABEL_KEY` |
| Type / interface | `PascalCase`, no `I` prefix | `OrderSummary`, not `IOrderSummary` |
| API-shaped type | `ApiXxx` prefix | `ApiOrderDetail` |
| Enum-like union | `PascalCase` type + `as const` object | `OrderStatus` |

Names state intent, not mechanics: `departmentsAwaitingQuote`, not `filteredList2`.
A function name containing "and" is a function doing two things — split it.

---

## 4. TypeScript

- `strict: true`. Never weaken a compiler flag to make code compile.
- **`any` is forbidden** — `@typescript-eslint/no-explicit-any` is an error. Use `unknown`
  plus a narrowing guard when a shape is genuinely unknown.
- No `as` type assertions except: `as const`, narrowing an `unknown` after a real runtime
  check, and **one documented case in the service adapters** — mapping a wire string onto a
  closed enum (`status`, department `state`) where every fallback would invent data. Everything
  else narrows through a `findXxx(value): X | undefined` helper that lives beside the constant.
  Never `as SomeType` to silence the compiler, and never in a component.
- No non-null assertion `!`. If a value can be absent, handle the absent branch.
- No `@ts-ignore` / `@ts-expect-error`. If it seems necessary, the model is wrong.
- Prefer `satisfies` over annotation when you want inference plus checking.
- Every exported function has an explicit return type. Local arrow functions may infer.
- Discriminated unions over optional-field soup:

```ts
// WRONG
interface QuoteState { loading: boolean; data?: Quote[]; error?: string }

// RIGHT
type QuoteState =
  | { status: "loading" }
  | { status: "ready"; quotes: Quote[] }
  | { status: "failed"; message: string };
```

- Money is a JSON number of whole dong on the wire. Keep it a number until formatting, and
  format only through `formatCurrencyVnd`; never coerce it implicitly.

---

## 5. Comments

Comments explain **why**, never **what**. The code already says what.

```ts
// WRONG — restates the code, adds nothing
// Loop through departments and push the quoted ones
// WRONG — decorative noise
// ────────────── QUOTES ──────────────
// ============ END OF SECTION ============

// RIGHT — explains a decision the reader cannot deduce
// The backend returns 404 (not 403) for out-of-scope orders so a sale cannot probe
// another sale's order ids. Render "not found", never "forbidden".
```

- No commented-out code. Delete it; git remembers.
- No `TODO` without an owner and a tracked item: `// TODO(orisrm, GAP-004): …`.
- No banner comments, no ASCII dividers, no file headers listing the author or date.
- A component that needs a paragraph of explanation is too big — split it instead.

---

## 6. Reuse and duplication

- Second occurrence of the same logic: extract it. Third occurrence means the extraction
  was skipped and is now a bug source.
- Shared, business-free UI lives in `src/components/`. Feature-bound UI lives beside its
  feature. Never import from one feature into another; go through `src/components/`,
  `src/hooks/`, `src/utils/`, or the service layer.
- One formatter per concept, in `src/utils/formatters.ts`: `formatCurrencyVnd`, `formatDate`,
  `formatDateTime`, `formatOrderCode`. Never format inline in JSX.
- Labels for enum-like values (order status, department state, milestone status, roles)
  live in one map per concept in `src/constants/`, keyed to i18n. Never a switch in a component.
- Do not build abstractions for a single call site. Extract on the second, not in anticipation.

---

## 7. React components

- One component per file; the file is named after it.
- Hard ceiling ~200 lines. Past that, extract sub-components or a logic hook.
- Props typed with an exported interface; no inline object types longer than two fields.
- Data fetching never happens inline in a component body — always through a hook that wraps a
  service function.
- No nested ternaries in JSX. Use an early return, a lookup map, or a small sub-component.
- Loading, empty, and error states are mandatory for every screen that fetches.
- No inline `style={{...}}`; use MUI `sx` or a styled component. No magic colours — theme
  tokens only. Component-wide look (card radius, table head, input shape, row hover) belongs
  in `src/theme/components.ts`, not repeated per screen.
- An identifier (order code) never wraps and never truncates; a name that can be long gets
  `EllipsisCell` with a tooltip. A row that grows to three lines because a column wrapped is
  a layout defect.
- `key` must be a stable domain id. Array index as key is forbidden.
- `useMemo` / `useCallback` only where a measurable render cost or a dependency identity
  requires it. Wrapping everything is noise.
- No business logic in components: permission decisions, derived totals, and status
  transitions belong in hooks or utils where they can be unit-tested.

### Form fields

- Every input goes through the shared field in `src/components/form/`: `NumberField`,
  `PhoneField`, `EmailField`, `PasswordField`, `DateField` (money keeps its own
  `CurrencyAmountField`). A raw `type="number"`, `type="date"` or `type="password"` in a
  screen is a defect — that is how a phone field ends up accepting letters and a date field
  ends up showing `mm/dd/yyyy` on an English system.
- A numeric field answers `number | null`, never a string. `null` means "left blank" and must
  reach the API as an absent key, never `0`.
- Validation rules live in `src/utils/validation.ts` and return an i18n key, never a sentence.
  Field-level messages appear on blur, not on the first keystroke.

---

## 8. Data layer

- Every network call goes through `src/services/*Service.ts` using the shared `apiClient`.
  A component importing `axios` is a defect.
- Endpoint strings live only in `src/services/apiEndpoints.ts`.
- Shape translation is explicit: `ApiOrder` (wire shape) → `adaptOrder()` → `Order`
  (view shape). Components consume only view shapes, so a backend rename touches one file.
- `localStorage` is never read or written in a component. Use a typed helper in
  `src/utils/storage.ts`. Auth state is not stored at all — the session lives in an httpOnly
  cookie.
- Never trust the front-end for authorisation. Hiding a button is a usability measure; the
  backend is the enforcement point. Never send `userId`, `role`, or `departmentId` in a body
  to influence permission.

---

## 9. Errors and feedback

- Never swallow an error. No empty `catch {}`, no `catch { return null }`.
- `apiClient` normalises failures into `Error & { status?: number }`. Screens branch on
  `status`, not on message text.
- User-facing failure surfaces as an `Alert` in place, or a `notistack` toast for an action.
  `console.log` is not error handling and must not ship.
- Optimistic updates must revert on failure and show a toast — see the status-toggle pattern.

---

## 10. Formatting and imports

- Prettier: single quotes off (double quotes), semicolons on, trailing comma `all`,
  print width 100.
- Import order: React → third-party → `@/` internal → relative → styles. One blank line
  between groups.
- Always import via the `@/` alias across folders. `../../..` is forbidden.
- No default export except React components and the Vite/ESLint config files.

---

## 11. Definition of done

A task is complete only when all of the following hold:

1. `npm run lint` clean, zero warnings.
2. `npm run build` passes (`tsc` included).
3. No `any`, no `as` cast, no `!`, no `@ts-ignore` introduced.
4. No Vietnamese outside `src/locales/vi.json`; both `vi.json` and `en.json` have every new key.
5. Loading, empty, and error states implemented for every new fetching screen.
6. No commented-out code, no leftover `console.log`, no unused import.
7. `.claude/memory.md` updated: module status row and a change-log entry.

## 11b. UI copy

Every label, title, button and message states exactly what the thing is or does — nothing more.

- No explanatory descriptions, hints, examples or parentheticals that nobody asked for:
  `Số điện thoại`, not `Số điện thoại riêng (trống = hotline chung)`; `Hiển thị`, not
  `Đang hiện trên web`. A helper text is added only when the product owner asks for it.
- Wording must match the real behaviour. A label that promises something the screen does
  not do is a bug.
- Short beats clever: the noun or verb the user would say themselves.

---

## 12. Quick reference — forbidden

| Forbidden | Instead |
|---|---|
| `any`, `as X`, `!`, `@ts-ignore` | `unknown` + guard, discriminated union, explicit branch |
| Vietnamese in code or comments | English code, `vi.json` for copy |
| Abbreviated identifiers | Full words |
| `axios` imported in a component | `src/services/*Service.ts` |
| `localStorage` in a component | `src/utils/storage.ts` |
| Hard-coded endpoint string | `apiEndpoints.ts` |
| Hard-coded colour or spacing | Theme token, `sx` |
| Nested ternary in JSX | Early return or lookup map |
| Array index as `key` | Domain id |
| Empty `catch` | Surface through `Alert` or toast |
| Commented-out code, banner comments | Delete |
| Copy-pasted block appearing twice | Extract |
