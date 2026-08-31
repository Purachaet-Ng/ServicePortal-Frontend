# OpsPortal — Frontend

React 19 + Vite + Tailwind 4 + shadcn/ui. The client for the Internal Operations Portal.

**Read these first:** [PLAN.md](../PLAN.md) — scope, roles, data model, ticket lifecycle · [API.md](../API.md) — the endpoint contract · [WORKFLOW.md](../WORKFLOW.md) — user flows and the six-step recipe for adding a page · [STITCH-PROMPTS.md](../STITCH-PROMPTS.md) — design system.

---

## Setup

```bash
npm install
```

```bash
cp .env.example .env
```

```bash
npm run dev
```

The app runs on <http://localhost:5173>. `VITE_API_URL` must end in `/api` — every path in API.md is mounted under it.

**Running both servers** — two terminals, from `6.Group_Project/`:

```bash
cd backend && npm run dev
```

```bash
cd frontend && npm run dev
```

The backend's `CORS_ORIGIN` must be `http://localhost:5173` or every request fails in the browser while working fine in Postman. That mismatch costs people an afternoon.

---

## What is already built

You should not have to write any of this — use it.

| Concern | File |
| --- | --- |
| HTTP + error unwrapping + auth header | `src/api/client.js` |
| Endpoint functions, one file per module | `src/api/*.api.js` |
| Token + user, persisted | `src/store/auth.store.js` |
| Query defaults | `src/lib/queryClient.js` |
| Enums, labels, nav, **ticket transitions** | `src/lib/constants.js` |
| Permission matrix | `src/lib/permissions.js` + `src/hooks/usePermission.js` |
| Runtime zod from `form_schema` | `src/lib/formSchema.js` |
| Router + role gates | `src/routes/` |
| Search / filter / sort / paging state | `src/hooks/useListQuery.js` |
| Shared UI | `src/components/common/` |
| **The dynamic form** | `src/components/ticket/DynamicForm.jsx` |
| **Status buttons from the lifecycle** | `src/components/ticket/StatusActions.jsx` |

Every page in `src/pages/` beyond Login, Register, Dashboard, and Profile renders a `<ComingSoon />` card naming its owner, the doc section to read, and the endpoints it needs. Replace that card with the real page.

## Folder structure

```
src/
├── api/              client.js + one <module>.api.js per domain
├── features/         <domain>/ — query hooks, mutations, forms
├── components/
│   ├── ui/           shadcn CLI output — NEVER hand-edited
│   ├── common/       DataTable, FilterBar, PageHeader, StatusChip, EmptyState, ErrorState
│   └── <domain>/     presentational pieces: DynamicForm, StatusActions, CommentThread
├── pages/            <Name>Page.jsx — one per route, composition only
├── layouts/          AppLayout (sidebar shell), AuthLayout (centered card)
├── routes/           index.jsx (router + role gates), ProtectedRoute.jsx
├── hooks/            useAuth, usePermission, useListQuery, useDebounce
├── store/            auth.store.js, ui.store.js  (Zustand)
├── validators/       <module>.validator.js  (zod)
└── lib/              constants.js, permissions.js, format.js, formSchema.js, queryClient.js, utils.js
```

See [`src/features/README.md`](src/features/README.md) for which folder your code belongs in.

## Adding a page — the six steps

1. `src/api/<module>.api.js` — thin functions, no logic *(already written for every module)*
2. `src/validators/<module>.validator.js` — zod for the fixed fields
3. `src/features/<module>/use<Module>.js` — query hooks, keys `["<module>", "list", params]`
4. `src/pages/<Name>Page.jsx` — composition only; no `fetch`, no `useForm` here
5. `src/components/<module>/` — presentational, takes props
6. `src/routes/index.jsx` — route + guard

Full worked example in [WORKFLOW.md §B4](../WORKFLOW.md).

## Rules that are not negotiable

- **The backend scopes the rows, not the frontend.** `STAFF` and `ADMIN_SYSTEM` call the same `GET /api/tickets`. Never filter by role client-side — that would mean the data was already sent to a browser that should not have it.
- **No hardcoded enum strings.** Import from `lib/constants.js`. A typo in a filter returns an empty list instead of an error.
- **Server validation errors go on the fields**, via `setError(detail.field, …)` — not into a toast.
- **A hidden button is a courtesy, not a lock.** `usePermission` decides what to render; the backend is the boundary.
- **Never copy server data into Zustand.** TanStack Query owns it.
- **Every screen handles four states:** loading, error, empty, forbidden. "Nothing yet" and "no matches" are different messages.

## Shared files — say something in the group chat before editing

| File | Why |
| --- | --- |
| `src/routes/index.jsx` | Everyone adds routes |
| `src/lib/permissions.js` | Everyone adds actions |
| `src/lib/constants.js` | Enums, labels, chip colors, nav |
| `src/api/client.js` | Interceptors — one owner, ideally |
| `src/components/common/*` | Shared UI everyone depends on |

Keep [API.md](../API.md) in the same commit as the code that changes an endpoint, and flip its status marker to ✅ when the endpoint works end to end.

## Known gaps against the docs

These are backend facts as of the last check, not frontend bugs:

- `GET /api/auth/me` and `POST /api/auth/logout` do not exist. `useMe()` tolerates the 404 — `client.js` logs out on **401 only**, so the session survives.
- Only `/api/health` and `/api/auth` are mounted in `backend/src/app.js`. Every other endpoint 404s.
- `errorHandler.js` returns `{ status, message, err }`, not API.md's `{ error: { code, message, details } }`, and is not mounted. `client.js` reads both shapes, so nothing here changes when that is fixed.
- The `User` model is `firstname` + `lastname`; API.md says `name`. The frontend follows the database — use `fullName(user)` from `lib/format.js`.
- `utils/jwt.js` signs with three per-role secrets. Admin login will fail until [PLAN.md §8.5](../PLAN.md) is applied.

## Git

The repo is currently initialised in `backend/`, so **this folder is not versioned yet**. Either move the repo root up to `6.Group_Project/` or `git init` here before anyone starts work.

Branch per feature (`feat/tickets-list`), PR into `dev`, one reviewer. Never commit to `main`.
