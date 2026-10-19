# 03 · F7 — Organisation administration

**Goal**: the admin builds the whole organisation without a developer — departments, users,
services with their SLA and milestone templates, and the routing matrix that drives automatic
distribution.

**Why first among business features**: nothing can be routed before the matrix exists.

**Depends on**: `02-permissions-ui`. Every route here is admin-only.

---

## Screens

| Route | Screen |
|---|---|
| `/admin/departments` | Department list, create/edit drawer, manager assignment, deactivate |
| `/admin/users` | User list with filters, create dialog, edit, role assignment, reset password, lock |
| `/admin/services` | The ten services: code, name, SLA hours, milestone template editor |
| `/admin/routing` | Department × service checkbox matrix with an unrouted-service warning |
| `/admin/activity` | Audit log with entity / actor / date filters |

## Endpoints

| Call | Endpoint |
|---|---|
| Departments | `GET/POST /departments`, `GET/PATCH /departments/:id` |
| Routing matrix | `PUT /departments/:id/services` — replaces the whole array |
| Users | `GET/POST /users`, `GET/PATCH /users/:id` |
| Temporary password | `POST /users/:id/reset-password` |
| Lock / unlock | `PATCH /users/:id/status` |
| Services | `GET/POST /services`, `PATCH /services/:id` |
| Milestone template | `PUT /services/:id/milestones` — replaces the whole ordered array |
| Unrouted services | `GET /services/unrouted` |
| Audit log | `GET /activity` — paginated like every other list; the row timestamp is `createdAt` |

---

## Steps

1. **`organisationService.ts`** with adapters for `Department`, `User`, `Service`,
   `ActivityEntry`. One file; these four resources share filters and shapes.
2. **Departments**: list with name, manager, service count, active state. `UpdateDepartmentDto`
   has no `serviceIds`, so the edit dialog offers services on creation only; afterwards routing
   is changed on the matrix screen. Create/edit in a
   right-hand drawer. Deactivation uses `ConfirmDialog` and explains that history is preserved
   — deletion is not offered, matching the "deactivate, never delete" rule.
3. **Users**: `GET /users` is paginated and applies `q`, `role`, `departmentId` and `isActive`
   itself, so the screen sends the filters (search debounced 350 ms) and renders the page it
   gets back. Create dialog collects full name,
   email, phone, department, roles (multi-select) and a temporary password. Role chips render
   through the shared role label map. Row actions: edit, reset password, lock/unlock.
   `canViewCompanyReport` is a switch on the edit form with an explanatory helper text.
4. **Services**: ten rows, each expandable. Editing SLA hours is inline. The milestone editor
   is an ordered list with add / rename / reorder / remove; saving sends the full array via
   `PUT`. The form displays a permanent notice: changes apply only to orders closed after the
   save, because closed orders keep a snapshot.
5. **Routing matrix**: a sticky-header table, departments as rows, the ten services as columns,
   checkboxes at the intersections. Changes are staged locally and saved per department row via
   `PUT /departments/:id/services` — never a per-checkbox request. A column with no checked box
   renders a warning banner listing those services, driven by `GET /services/unrouted`.
6. **Audit log**: paginated table of entity, action, actor, timestamp, and a detail popover
   rendering the `{ field: [old, new] }` object. Filters: entity, actor, date range.

---

## Acceptance

- An admin can go from an empty database to a routable organisation without touching SQL.
- Unchecking the last department for a service produces a visible warning both on the matrix
  and in the service list.
- Editing a milestone template does not alter any already-closed order in the tracking screen.
- Locking a user leaves their historical orders and quotes intact and visible.

## Gotchas

- The routing matrix is a full-array replace. Building it as a per-cell PATCH will silently
  drop concurrent edits.
- `services.milestones` is an ordered `text[]`; the array position is the sequence. Reordering
  in the UI must send the new order, not a sequence field.
- A department's manager is a user, and a user belongs to a department — creation order matters.
  Allow saving a department without a manager and assigning one afterwards.
