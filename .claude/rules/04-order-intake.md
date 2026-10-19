# 04 · F1 — Order intake

**Goal**: a sale creates a standardised order; the backend generates the code and distributes
it. The four fixed numeric fields exist so quoting can match historical prices later.

**Depends on**: `03-org-admin` (services must exist), `11-api-wiring`.

---

## Screens

| Route | Screen |
|---|---|
| `/orders/new` | Create-order form (admin, sale) |
| `/customers`, `/customers/:id` | Customer directory and profile |

## Endpoints

| Call | Endpoint |
|---|---|
| Create order | `POST /orders` |
| Customer suggestions | `GET /customers?q=` |
| Create customer | `POST /customers` |
| Customer detail | `GET /customers/:id` |

---

## Form sections

1. **Customer** — company name (autocomplete over the directory, free text allowed for a new
   customer), contact name, phone, email. These feed `POST /customers`; the order itself stores
   only the resulting `customerId`, which is optional.
2. **Service** — select from the ten active services. Changing it changes nothing else on the
   form, but a helper line shows the resulting code prefix.
3. **Route** — origin province + detailed address, destination province + detailed address,
   desired date. Provinces come from `GET /reference/provinces` through `useProvinces()`; the
   backend normalises known aliases and rejects anything else with a `400`, because reference
   pricing matches on the province, not the free-text address.
4. **Cargo figures** — all optional, all numeric: weight (kg), volume (CBM), package or
   container count with a 20'/40' selector, largest dimensions L × W × H (m). A persistent
   helper explains that the more of these are filled, the better the reference price the
   quoting department receives.
5. **Other** — goods name, free-text note (with a helper stating it is **not** used for price
   matching), attachments, order source (website / hotline / email / existing customer).

---

## Steps

1. **`orderService.ts`**: `createOrder(payload)` plus the shapes used by later features.
   `customerService.ts`: `searchCustomers`, `createCustomer`, `fetchCustomerDetail`.
2. **Form state**: a single typed form model; validation with explicit rules, not a schema
   library, unless one is already in the dependency set. Required: customer identity, service,
   origin and destination province.
3. **Customer autocomplete**: MUI `Autocomplete` with `freeSolo`, debounced 350 ms. Selecting an
   existing customer sends `customerId`; a name typed by hand goes in the `newCustomer` branch
   and the backend creates the profile in the same transaction as the order — reusing the
   existing profile when the name already matches, so a hand-typed name cannot split a
   customer's history. One request, one failure story. Two customers may legitimately share a
   name, so key the option rows by id, never by the label.
4. **Attachments**: multipart upload, whitelist pdf / jpeg / png / webp / doc(x) / xls(x),
   20 MB per file enforced client-side with a clear message; `413` from the server is also
   handled.
5. **After submit**: show a success panel carrying the generated code, a link to the order and
   a "create another" action. Whether the order was distributed is told by **`status`**, not by
   `departmentName`: that field names the *winning* department and stays null until the order is
   closed. `status === 'new'` means no department is responsible and the order sits in the
   unrouted queue; anything else means it was distributed.
6. **Customer directory**: list with search and order count; detail page shows the profile and
   an order history table limited by the caller's scope. Revenue totals on this page obey the
   amount-visibility rule.

---

## Acceptance

- Creating two orders for the same service on the same day yields sequential codes with no gap
  and no duplicate.
- Leaving all four numeric fields empty still creates the order.
- A service with no responsible department still creates the order and surfaces the warning.
- Uploading a 25 MB file is rejected before the request is sent.

## Gotchas

- Never compose the order code on the front-end. It comes from the response.
- Attachments can only be uploaded once the order exists, and the endpoint takes one file per
  request. A failed upload must not be reported as a failed order.
- The note field must never be presented as affecting price matching — it deliberately does not.
- Province values are validated by the backend; a free-typed province string is rejected. Use
  the catalogue, not a text field. `src/constants/provinces.ts` survives only as the offline
  fallback for `useProvinces()`.
