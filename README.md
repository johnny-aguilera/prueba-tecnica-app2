# User management (Angular front end)

Angular single-page application for managing users: list, create, edit and
delete, talking to a REST API over `HttpClient`.

| | |
| --- | --- |
| Angular | 21 (standalone components, signals, zoneless change detection) |
| UI | Angular Material 21 |
| App URL | <http://localhost:4200> |
| API URL (as the app sees it) | `/api/users` |
| Mock API URL (development only) | <http://localhost:3000/users> |

---

## Application 1 was not provided

This repository contains **Application 2 only** — the Angular front end. The
back-end REST service (Application 1) was not supplied with the exercise, so a
**lightweight mock REST API is included for development and demonstration
purposes only**. It exists so the UI can be run and reviewed end to end; it is
not part of the application architecture.

The front end is intentionally decoupled from it:

* Every call goes through `HttpClient` exactly as it would against the real
  service — same verbs, same URLs, same payloads, same status-code handling.
* No component contains CRUD behaviour or in-memory data. `UserService`
  ([src/app/core/services/user.service.ts](src/app/core/services/user.service.ts))
  is the only file that issues HTTP calls, and the only one that knows how the
  endpoints are shaped.
* The mock lives entirely in [mock/](mock/) and is wired in by configuration, not by code.

**Switching to the real backend is a configuration change** — see
[Replacing the mock with the real backend](#replacing-the-mock-with-the-real-backend).

---

## Quick start

Requirements: Node.js 20.19+, 22.12+ or 24 LTS (an even-numbered release) and npm 10+.

```bash
npm install          # install dependencies
npm run dev          # start the mock API (:3000) and the Angular app (:4200) together
```

Then open <http://localhost:4200>.

To run the two processes separately, in two terminals:

```bash
npm run mock-api     # terminal 1 - mock REST API on http://localhost:3000
npm start            # terminal 2 - Angular dev server on http://localhost:4200
```

### npm scripts

| Script | What it does |
| --- | --- |
| `npm start` | Angular dev server on port 4200, with the `/api` proxy enabled |
| `npm run mock-api` | `json-server` on port 3000, serving `mock/db.json` |
| `npm run dev` | Both of the above in one terminal (`concurrently`) |
| `npm run mock-api:reset` | Restore `mock/db.json` from `mock/db.seed.json` |
| `npm run build` | Production build into `dist/user-management` |
| `npm test` | Unit tests (see [Tests](#tests)) |

---

## The mock REST API

`json-server` serves [mock/db.json](mock/db.json) and provides exactly the
endpoints the app consumes:

```text
GET    /users        list users
GET    /users/:id    single user (404 when unknown)
POST   /users        create (201, server assigns the id)
PUT    /users/:id    replace
DELETE /users/:id    delete
```

A user resource looks like this:

```json
{
  "id": 1,
  "username": "john.doe",
  "name": "John",
  "surnames": "Doe",
  "email": "john.doe@example.com",
  "age": 32,
  "active": true,
  "lastLogging": "2026-09-20T10:30:00Z",
  "creationDate": "2026-01-10T09:00:00Z"
}
```

The database ships with 7 users, including an inactive one and one that has
never logged in (`"lastLogging": null`), so the list screen can be reviewed with
realistic data.

### Passwords are never stored

No password exists anywhere in `mock/db.json`, and none is ever displayed in the
UI. The create/edit form does have a password field — it is part of the form
payload for demonstration — but it is dropped before the request leaves the
browser, and the mock strips it again on arrival:

1. `UserService` removes `password` from the body whenever the configured API is
   not allowed to receive credentials (`sendPasswords: false`, the default in
   development).
2. [mock/middlewares/server-fields.js](mock/middlewares/server-fields.js) deletes
   `password` from every incoming body, so the JSON file cannot hold a
   credential even if a client sends one by mistake.

A real backend would receive the password over HTTPS and store only a hash; flip
`sendPasswords` to `true` for that environment.

### Server-owned fields stay on the server

The same mock middleware stamps `creationDate` and initialises
`lastLogging: null` on `POST /users`, the way a real API would. The Angular app
never invents those values — it only sends back the ones it received, because
`PUT` replaces the whole resource.

### Resetting the data

`json-server` writes to `mock/db.json`, so creating and deleting users changes
the file. `mock/db.seed.json` holds the pristine data set:

```bash
npm run mock-api:reset
```

---

## Proxy configuration

The app only ever calls **same-origin** URLs (`/api/...`). In development the
Angular dev server forwards them to the mock:

```text
browser          Angular dev server (:4200)              mock API (:3000)
GET /api/users ──────────► proxy /api -> strip prefix ──────────► GET /users
```

[proxy.conf.mjs](proxy.conf.mjs):

```js
export default {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
    secure: false,
    rewrite: (path) => path.replace(/^\/api/, ''),
  },
};
```

It is referenced from the `serve` target in [angular.json](angular.json). Because
the prefix is stripped by the proxy, the mock stays a plain REST service on
`/users` — the same shape a real backend would expose — and the browser never
deals with CORS.

---

## Replacing the mock with the real backend

Only configuration changes. Nothing in `src/app` has to be touched.

1. **Point the app at the real service.** The API is described by one object,
   injected through the `API_CONFIG` token
   ([src/app/core/api/api.config.ts](src/app/core/api/api.config.ts)) and fed from
   the environment files:

   ```ts
   // src/environments/environment.production.ts
   export const environment: Environment = {
     apiBaseUrl: '/api',        // or 'https://api.example.com'
     sendPasswords: true,
   };
   ```

   * Same origin (reverse proxy / API gateway): keep a relative `apiBaseUrl`.
   * Different origin: use the absolute URL and enable CORS on the service.

2. **Development against the real service:** change `target` in
   `proxy.conf.mjs`, or set `apiBaseUrl` to the absolute URL in
   `src/environments/environment.ts`.

3. **Delete the mock:** remove the `mock/` folder, the `mock-api*` scripts, the
   `json-server` and `concurrently` dev dependencies, and drop `mock-api` from
   `npm run dev`.

If the real API differs in shape (field names, pagination, error envelope), the
change is confined to `UserService` and [src/app/core/models/user.model.ts](src/app/core/models/user.model.ts).

---

## Architecture

```text
src/app
├── app.ts / app.html / app.scss      application shell (toolbar + router outlet)
├── app.config.ts                     providers; the only place the API config is assembled
├── app.routes.ts                     root routes, lazy-loads the users feature
├── core/
│   ├── api/
│   │   ├── api.config.ts             ApiConfig + API_CONFIG injection token
│   │   └── api-error.ts              HttpErrorResponse -> user-facing message
│   ├── models/user.model.ts          User, CreateUserRequest, UpdateUserRequest
│   └── services/
│       ├── user.service.ts           the only HTTP client for /users
│       └── notification.service.ts   snack-bar confirmations and failures
├── features/users/                   lazy feature
│   ├── users.routes.ts               '', 'new', ':id/edit'
│   ├── user-list/                    table, filters, delete
│   └── user-form/                    typed reactive form for create and edit
└── shared/
    ├── confirm-dialog/               reusable confirmation dialog
    └── not-found/                    wildcard route
```

### Which primitive owns what

| Concern | Mechanism |
| --- | --- |
| Component / UI state | **Signals** (`signal`, `computed`) |
| Form state and validation | **Reactive Forms** (typed, `nonNullable`) |
| API calls | **Observables** from `HttpClient` |
| API communication | **Services** |

No global state library is used, and no `Observable` is converted to a signal
just for the sake of it: HTTP stays reactive, while screen state is a set of
plain signals that are easy to read in review.

```ts
// user-list.ts
readonly users = signal<User[]>([]);
readonly loading = signal(false);
readonly error = signal<string | null>(null);
readonly deletingUserId = signal<number | null>(null);

readonly hasUsers = computed(() => this.users().length > 0);
readonly activeUsers = computed(() => this.users().filter((user) => user.active));
```

Search text and the "active only" toggle are signals too, so filtering is a
`computed()` over the already-loaded list — it never calls the API again.

The form is a typed reactive form; signals around it carry only UI state
(`isEditMode`, `loadingUser`, `saving`, `submitAttempted`, `currentUser`), and
`computed()` derives the labels (`pageTitle`, `submitLabel`). `effect()` is not
used anywhere: nothing in this app needs one.

Every component uses `ChangeDetectionStrategy.OnPush`, and the application runs
**zoneless** (`provideZonelessChangeDetection()`) — signal updates alone drive
rendering.

### Lazy loading

The root router lazy-loads the feature, and each screen is a lazy
`loadComponent`, so the list, the form and the not-found page are separate
chunks:

```text
Lazy chunk files    | Names
...                 | users-routes     (the feature's route table)
...                 | user-list
...                 | user-form
...                 | not-found
```

### UI states

Both screens handle the full set explicitly:

* **Loading** — spinner while the request is in flight; the delete button shows
  progress on its own row only.
* **Error** — inline message with a *Try again* action; unreachable API and 404
  get their own copy (`api-error.ts`).
* **Empty** — "No users found." with a *Create the first user* call to action,
  kept distinct from "no rows match the current filters".
* **Success** — snack-bar confirmation, then navigation back to the list;
  deletes are confirmed through a dialog first and the row is removed without a
  full reload.

---

## Production build

```bash
npm run build
```

Output in `dist/user-management`. The build enforces the bundle budgets in
`angular.json` (initial total is ~330 kB raw / ~90 kB transfer, well inside the
500 kB warning budget).

---

## Tests

```bash
npm test
```

22 unit tests (Vitest + jsdom, via `@angular/build:unit-test`) covering the parts
worth protecting:

* `UserService` — endpoint construction from `ApiConfig` (relative and absolute
  base URLs), full representation on `PUT`, and the password policy in both
  directions.
* `UserList` — loading, populated, empty and error states, retry, client-side
  filtering without a second request, and the delete flow (confirmed, failed and
  dismissed).
* `UserForm` — create vs edit labels, conditional password validation, no request
  while the form is invalid, the exact `POST`/`PUT` bodies, and the failure paths
  (load error, invalid route id, failed save).

> **First run:** Vitest pre-bundles `jsdom` the first time it runs, which on a
> cold cache can take longer than the 60 s worker start-up limit built into
> Vitest and abort the run with `Timeout waiting for worker to respond`. Simply
> run `npm test` again — the cache is warm from then on (runs take ~4 s).

---

## Notes

* **`json-server` is pinned to 0.17.x.** The 1.0.0-beta line rewrites resource
  ids as random strings, which does not match the numeric `id` a real service
  would return; 0.17.x keeps numeric, auto-incrementing ids. Its CLI is the
  `--watch` form used in `package.json`.
* The mock is a **development dependency**. It is never part of a production
  build.
* On an odd-numbered Node.js release (19, 21, 23, 25 …) the Angular CLI prints a
  "should not be used for production" warning. It is only a warning — everything
  works — but use an LTS release for real work.
* The production configuration sets `sendPasswords: true`. If you serve a
  production build against the mock (`ng serve --configuration production`), the
  mock's middleware still refuses to persist the password.
