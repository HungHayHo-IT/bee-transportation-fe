# 11 · API wiring, service layer and the mock switch

**Goal**: screens are written once against view types and keep working when the backend
appears. The backend does not exist yet, so this layer is what makes the front-end buildable
today.

**Applies to**: every feature file.

---

## Layer shape

```
component  →  hook (useOrders)  →  service (orderService.ts)  →  apiClient  →  backend
                                        ↑
                                   adapters: ApiOrder → adaptOrder() → Order
```

- Components import view types only. They never see an `Api*` shape.
- A backend field rename touches one adapter, never a component.
- Endpoint strings live only in `apiEndpoints.ts`, grouped per resource, with functions for
  parameterised paths: `DETAIL: (orderId: number) => \`${ORDERS}/${orderId}\``.

---

## `apiClient.ts`

1. `axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL, withCredentials: true,
   timeout: 20000 })`. No `Authorization` header — the session is an httpOnly cookie.
2. Response interceptor unwraps the success envelope: when the payload has
   `success === true` and a `data` key, replace the payload with `data`.
3. Error interceptor produces `Error & { status?: number; details?: unknown }`, taking the
   message from `error.response.data.error.message`, then `data.message`, then the axios
   message, and carrying `error.details` through when the backend attaches data (for example
   `existingCustomerId` on a duplicate customer name). Screens branch on `status`, never on
   message text, and narrow `details` before reading it.
4. `401` clears the session context and redirects to login once — skipped for auth endpoints
   so a wrong password does not trigger a redirect loop.
5. `403` when the session still requires a password change routes to the change-password page.
6. Nothing else is handled centrally. `404`, `409` and `413` are meaningful to the caller and
   must reach it.

## Adapters

```ts
interface ApiOrder { id: number; code: string; finalAmount: string | null; /* … */ }

export interface Order { id: number; code: string; finalAmount: string | null; /* … */ }

function adaptOrder(api: ApiOrder): Order { /* explicit field-by-field mapping */ }
```

- Never spread an API object into a view object. Map every field explicitly, exactly as the
  backend maps its own DTOs, and for the same reason: an accidental extra field leaks data.
- `null` is preserved, never coerced to `0` or `""`. A `null` amount means "you may not see
  this", and the UI renders an em dash. Coercing it to zero invents revenue that is not there.
- Money is a **JSON number** of whole dong on the wire. Keep it a number, never do currency
  arithmetic in a component, and format only through `formatCurrencyVnd`.
- Catalogues the backend validates against (provinces, order statuses, reject reasons, order
  sources) are served from `/reference/*`. Fetch them rather than shipping a second copy; a
  bundled list is a fallback, not a source of truth.

## Mock switch

- `VITE_USE_MOCK=true` makes each service resolve from `src/mocks/<resource>.ts` behind a
  200 ms delay, returning the **same view types** the real adapters produce.
- Mock data is disposable and is not a contract. When wiring a real endpoint, delete the mock
  rather than reshaping the backend response to match it.
- The readiness question for a screen is always "does the endpoint return enough to render and
  operate this screen?" — not "do the field names match the mock?". Naming, casing and nesting
  differences are ordinary adapter work and are never reported as blockers. A genuine gap is a
  missing field, filter, or endpoint with no way to derive it on the front-end; record those in
  `.claude/memory.md` under Open Questions.

## List conventions

Every list endpoint uses the same contract and the same component:

- Request `?page=1&limit=20&sortBy=&sortOrder=`; response `{ items, total, page, limit }` —
  `Page<T>` in `src/types/pagination.ts`, mapped by `adaptPage`. Small catalogues
  (departments, services, the department queue) answer with one full page, so their service
  functions unwrap `.items` and return a list rather than faking pagination.
- Search debounced 350 ms; any filter change resets the page to 1.
- First load `CircularProgress`; refetch `LinearProgress`; failure a dismissible `Alert`;
  no rows an `EmptyState`.
- Filter state mirrored to the URL query string.
- Requests are cancelled on unmount and superseded by newer ones (an `active` flag or an
  `AbortController`) so a slow response cannot overwrite a newer render.

## Verifying against the backend

The backend runs at `http://localhost:8087` (source `~/Desktop/vietmind/bee-transportation-be`).
Check the real contract before writing any service:

```
curl -s http://localhost:8087/api/docs-json | jq '.paths | keys'
curl -s http://localhost:8087/api/docs-json | jq '.components.schemas.OrderDetailDto'
```

`VITE_API_PROXY_TARGET` points at the deployed API, `http://167.254.68.111` (docs at
`/api/docs`); set it to `http://localhost:8087` to work against a local backend. Its admin is
`admin@beetransportation.vn` / `BeeOps@2026!dev`, and its database is otherwise fresh — the QA
accounts below exist only locally. **Order screens answer `500` there** until
`db/migrations/001-qa-fixes.sql` is run on that host (QA-26).

QA accounts for live testing, password `BeeOps@2026!x` for all of them: `qa.sale1@bee.vn`,
`qa.sale2@bee.vn`, `qa.ma@bee.vn`, `qa.mb@bee.vn`, `qa.sta@bee.vn`, `qa.lead@bee.vn`,
`qa.acct@bee.vn`. The seeded `admin@beetransportation.vn` no longer uses its documented
password.

**The live spec outranks `api-docs.md`.** Known drift is listed in `.claude/memory.md` §4d.
When reality differs again, fix the feature file and record it there.
