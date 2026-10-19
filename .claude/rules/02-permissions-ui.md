# 02 · Permission-aware UI

**Goal**: one place that answers "may this user see this route / menu item / button", derived
from the same three axes the backend uses. The front-end never enforces — it only avoids
rendering dead controls.

**Depends on**: `01-auth-and-session`.

---

## Model

```ts
export const Role = {
  Admin: "admin", Leader: "leader", Manager: "manager", Sale: "sale", Staff: "staff",
} as const;
export type Role = (typeof Role)[keyof typeof Role];
```

Three separate questions, three separate helpers — never merged:

| Question | Helper | Source of truth |
|---|---|---|
| May I perform this action? | `canPerform(user, action)` | role union |
| Whose rows do I see? | backend scope | server-side, front-end shows what arrives |
| Do I see the amount? | nothing on the front-end | the backend sends `null`; the UI renders an em dash |

---

## Steps

1. **`src/constants/permissions.ts`**: an `Action` union covering the eight distinguishable
   actions from the specification — `createOrder`, `quoteOrder`, `selectQuote`, `closeOrder`,
   `updateMilestone`, `manageOrganisation`, `viewDepartmentReport`, `viewCompanyReport` — and
   a map from action to the roles that may perform it. `viewCompanyReport` additionally
   accepts `user.canViewCompanyReport`.
2. **`src/hooks/usePermissions.ts`**: returns `{ can(action), hasRole(role), reportTier }`
   where `reportTier` is `"company" | "department" | "personal"`, resolved exactly as the
   backend's `reportScope`.
3. **`ProtectedRoute`**: wraps a route with a required action. Failing it renders the
   not-found page, not a "forbidden" page — consistent with the backend returning `404` for
   out-of-scope rows.
4. **Menu filtering**: `useMenuItems()` drops entries whose action the user cannot perform.
   A group heading with no surviving children disappears too.
5. **Amount visibility**: **no front-end helper.** The rule — company roles always, the
   creating sale for their own order, the **winning** department for its own order — is applied
   by the backend, which sends `finalAmount: null` to everyone else (verified per role on the
   live API). A mirror helper existed and was deleted in the review of 23/08/2026 because
   nothing could call it without second-guessing the server. All the UI does is render an em
   dash for `null`, through `formatCurrencyVnd`, and never `0`.
6. **Sealed quotes in the UI**: the quote comparison table is rendered only for the owning sale
   and company roles. A manager or staff member sees a single row: their own department's quote.

---

## Acceptance

- A sale opening another sale's order id sees the not-found page, not an error toast.
- A staff member sees no administration group in the sidebar and no create-order button.
- A user holding both `manager` and `sale` sees the union of both menus, with no duplicates.
- Revoking `canViewCompanyReport` removes the company report the next time
  `GET /auth/me` resolves.

## Gotchas

- Permissions are a union across roles. Any helper written as `if/else if` on a single role is
  wrong — always test membership.
- Never hide a control by CSS. Do not render it.
- `reportTier` must not be derived from the menu, and the menu must not be derived from routes.
  Both derive from `usePermissions`.
