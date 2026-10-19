# 00 · Foundation — scaffold, theme, layout shell

**Goal**: a running Vite app with the btn-admin layout, routing, i18n, theme and the shared
primitives every later feature depends on. No business screen yet.

**Depends on**: nothing. Everything else depends on this.

---

## Deliverables

```
beeops-admin/
├── index.html
├── vite.config.ts                 # react + tailwind plugins, alias @ → ./src
├── tsconfig.json                  # strict, paths { "@/*": ["./src/*"] }
├── eslint.config.js               # flat config, no-explicit-any = error
├── .env.example
└── src/
    ├── main.tsx                   # ThemeProvider + CssBaseline + i18n import
    ├── App.tsx                    # SnackbarProvider + BrowserRouter + routes
    ├── theme/                     # palette, typography, component overrides
    ├── layouts/
    │   ├── DashboardLayout.tsx
    │   ├── AuthLayout.tsx
    │   └── components/            # Sidebar, SidebarItems, Header, Profile, LanguageSwitcher, Logo
    ├── routes/
    │   ├── routePaths.ts          # every path as a constant, no string literals in JSX
    │   ├── AppRoutes.tsx
    │   └── ProtectedRoute.tsx     # filled in by 02-permissions-ui
    ├── components/
    │   ├── form/                   # NumberField, PhoneField, EmailField, PasswordField, DateField
    │   ├── PageContainer.tsx
    │   ├── SectionCard.tsx        # card with title / subtitle / action slot
    │   ├── DataTableShell.tsx     # TableContainer + head + loading + empty + pagination
    │   ├── ConfirmDialog.tsx
    │   ├── StatusChip.tsx
    │   ├── EllipsisCell.tsx
    │   └── EmptyState.tsx
    ├── constants/                 # pagination, orderStatus, roles, services
    ├── hooks/                     # useDebouncedValue, useDisclosure, usePagination
    ├── services/                  # apiClient, apiEndpoints (filled in by 11-api-wiring)
    ├── utils/                     # formatters, storage
    ├── locales/                   # index.ts, vi.json, en.json
    └── styles/                    # tailwind.css, globals.css
```

---

## Steps

1. **Scaffold**: `npm create vite@latest beeops-admin -- --template react-ts`, then install the
   dependency set listed in `CLAUDE.md` §3. Pin the same major versions as btn-admin.
2. **Config**: alias `@` in both `vite.config.ts` and `tsconfig.json`. Enable
   `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`.
   ESLint flat config with `@typescript-eslint/no-explicit-any: "error"` and
   `@typescript-eslint/consistent-type-imports`.
3. **Theme** (`src/theme/`): split into `palette.ts`, `typography.ts`, `components.ts`, `index.ts`.
   `components.ts` carries the identity — card radius and shadow, table head and row hover,
   input shape, chip and button shape, tabular figures on every table so a column of money
   lines up. A screen that needs a different look changes the theme, not itself.
   Tokens come from the corporate site beetransportation.vn: primary `#FF5A00`, heading ink
   `#41454F`, muted `#8D8D8D`, hairline `#F4F4F4`, surface `#F8F9FA`, success `#00803C`,
   bee yellow `#FFDA44`. Sidebar rail `#1E232B` after the logo slate, with the active row as a
   solid orange block. Headings and buttons use Quicksand (the corporate face); body and table
   text use Be Vietnam Pro, which stays legible for dense Vietnamese at small sizes.
4. **Layout shell**: port `MainWrapper` / `PageWrapper` from btn-admin's `layout.tsx`, keeping
   `minWidth: 0` on the page wrapper (wide tables otherwise break the sticky header).
   Sidebar: permanent drawer on `lg+`, temporary below; 270px expanded, 80px collapsed with
   hover-expand and tooltips on collapsed items. Rewrite in English, no `any` in props.
5. **Sidebar menu**: define `useMenuItems()` returning a typed `NavItem[]` grouped as
   Overview · Orders · Reports · Directory · Administration. Titles come from i18n keys.
   Leave the permission filter as a pass-through; `02-permissions-ui.md` fills it in.
6. **Header**: sidebar toggle, language switcher (`vi` / `en`), notification bell placeholder
   (wired in `10-notifications.md`), profile menu with the current user's name, department and
   role chips, and a logout item.
7. **Shared primitives**: build `PageContainer`, `SectionCard`, `DataTableShell`,
   `StatusChip`, `ConfirmDialog`, `EmptyState`, `EllipsisCell`, and the form fields in
   `components/form/` — every screen composes from these and never restyles a card, a table
   or an input of its own.
   `DataTableShell` owns the list pattern once and for all: `CircularProgress` on first load,
   `LinearProgress` on refetch, dismissible error `Alert`, `EmptyState` when the result is
   empty, MUI `Pagination` at the bottom.
8. **i18n**: i18next with `vi` as `fallbackLng`, detection from `localStorage` key `appLang`
   only. Namespaces flat in `vi.json` / `en.json` under top-level sections
   (`common`, `nav`, `orders`, `quotes`, `dashboard`, `admin`, `auth`, `notifications`).
9. **Routing**: `routePaths.ts` exports every path as a constant. `AppRoutes.tsx` mounts
   `AuthLayout` routes and `DashboardLayout` routes; unknown paths render `NotFoundPage`.
10. **Utils**: `formatters.ts` with `formatCurrencyVnd` (string input, `vi-VN` grouping,
    ` ₫` suffix), `formatCompactCurrencyVnd` (for narrow columns), `formatDate`,
    `formatDateTime`, `formatRelativeTime`. `storage.ts` wrapping `localStorage` for the
    language preference and table preferences only — never for session data.

---

## Acceptance

- `npm run dev` renders the shell with a working sidebar (expand, collapse, hover, mobile
  drawer), header and an empty dashboard route.
- `npm run lint` and `npm run build` are clean.
- Switching language changes every visible label; no hard-coded Vietnamese anywhere.
- A 30-column table inside the content area scrolls inside its container; the page body never
  scrolls horizontally and the header stays put.

## Gotchas

- Do not copy btn-admin's `react-mui-sidebar` dependency; its own `SidebarItems` is
  hand-rolled and that is what to port.
- btn-admin's `tsconfig` sets `noUnusedLocals: false`. Do not copy that; keep it on.
- MUI 7 uses `slotProps.paper` on `Drawer`, not `PaperProps`. Copying older examples breaks.
