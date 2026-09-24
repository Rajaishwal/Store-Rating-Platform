# Store Rating Platform

A full-stack web application where users rate stores from 1 to 5. A single login
serves three roles — System Administrator, Normal User, and Store Owner — each
with different capabilities after signing in.

## Tech stack

| Layer    | Choice                                   |
| -------- | ---------------------------------------- |
| Backend  | Express 5 + Prisma 7                     |
| Database | MySQL 8                                  |
| Frontend | React 19 + Vite 8 + Tailwind CSS 4       |
| Auth     | JWT (stateless), bcrypt password hashing |

## Project layout

```
backend/
  prisma/schema.prisma     database schema and migrations
  prisma/seed.js           re-runnable development data
  src/
    config/env.js          environment variables, validated at boot
    lib/                   Prisma client, JWT helpers
    middleware/            authentication, role guards, error handling
    routes/                HTTP routes grouped by area
    validators/            Zod schemas; the single source of validation rules
    utils/                 API errors, response serialisers
  tests/                   end-to-end smoke suites run against a real database
frontend/
  src/
    pages/                 one component per screen
    components/            reusable UI (layout, DataTable, rating widget)
    context/               auth state; the context and its hook live apart
                           from the provider so fast refresh keeps working
    hooks/                 shared React hooks
    api/                   axios client and error normalisation
    lib/                   validation mirror, route map, role labels
```

## Getting started

### 1. Database

MySQL 8 must be running locally. The migration creates the database if it does
not exist, so no manual `CREATE DATABASE` is required.

### 2. Backend

```bash
cd backend
cp .env.example .env     # then set DATABASE_URL and JWT_SECRET
npm install --legacy-peer-deps
npm run db:migrate
npm run db:seed
npm run dev              # http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev              # http://localhost:5173
```

The Vite dev server proxies `/api` to the backend, so no API URL is baked into
the client.

> `--legacy-peer-deps` works around a dependency-resolution bug in npm 10.2.0
> that crashes on Prisma's peer chain. Upgrading npm removes the need for it.

## Seeded accounts

`npm run db:seed` creates 9 users, 6 stores and 25 ratings. Every account uses
the password `Password@123`.

| Role        | Email                           |
| ----------- | ------------------------------- |
| Admin       | `admin@storerating.com`         |
| Store owner | `rajesh.sharma@storerating.com` |
| Normal user | `aditya.nair@example.com`       |

## API

All routes are prefixed with `/api`. Authenticated routes expect an
`Authorization: Bearer <token>` header.

| Method  | Route                      | Role     | Purpose                                      |
| ------- | -------------------------- | -------- | -------------------------------------------- |
| `GET`   | `/health`                  | public   | liveness check                               |
| `POST`  | `/auth/signup`             | public   | register a normal user                       |
| `POST`  | `/auth/login`              | public   | sign in, returns a JWT                       |
| `GET`   | `/auth/me`                 | any      | current user, used to restore a session      |
| `PATCH` | `/auth/password`           | any      | change password                              |
| `GET`   | `/stores`                  | any      | store listing with overall and own rating    |
| `PUT`   | `/stores/:id/rating`       | `USER`   | submit or change a rating (upsert)           |
| `GET`   | `/admin/dashboard`         | `ADMIN`  | totals for users, stores and ratings         |
| `GET`   | `/admin/users`             | `ADMIN`  | user listing with filters and sorting        |
| `GET`   | `/admin/users/:id`         | `ADMIN`  | one user; owners include their store rating  |
| `POST`  | `/admin/users`             | `ADMIN`  | create a user of any role                    |
| `GET`   | `/admin/stores`            | `ADMIN`  | store listing with filters and sorting       |
| `POST`  | `/admin/stores`            | `ADMIN`  | register a store, optionally with an owner   |
| `GET`   | `/owner/dashboard`         | `OWNER`  | own store, its average rating, and its raters |

`GET /stores` accepts `search`, `sortBy` (`name`, `address`, `rating`), `order`
(`asc`, `desc`), `page` and `limit`. `search` matches store name or address.

`GET /admin/users` filters on `name`, `email`, `address` and `role`, and sorts by
`name`, `email`, `address`, `role` or `createdAt`. `GET /admin/stores` filters on
`name`, `email` and `address`, and sorts by `name`, `email`, `address` or
`rating`. Both paginate with `page` and `limit`.

`GET /owner/dashboard` sorts its rater list by `name`, `email`, `rating` or
`ratedAt`, and paginates with `page` and `limit`.

Sortable columns are validated against a fixed whitelist, so a column name from
a query string never reaches the database as SQL.

## Scripts

Run from `backend/`:

| Command               | Does                                              |
| --------------------- | ------------------------------------------------- |
| `npm run dev`         | start the API with auto-reload                    |
| `npm start`           | start the API                                     |
| `npm run db:migrate`  | create and apply migrations                       |
| `npm run db:seed`     | reload development data                           |
| `npm run db:reset`    | drop, re-migrate and reseed in one step           |
| `npm run db:studio`   | browse the database in Prisma Studio              |
| `npm run test:auth`   | 20 authentication checks                          |
| `npm run test:stores` | 31 store listing and rating checks                |
| `npm run test:admin`  | 51 administrator checks                           |
| `npm run test:owner`  | 23 store owner checks                             |

## Tests

125 end-to-end checks run against a real database, not mocks. Each suite starts
its own instance of the app on its own port, creates any fixtures it needs, and
removes them afterwards, so the suites are re-runnable and order-independent.

```bash
cd backend
npm run test:auth && npm run test:stores && npm run test:admin && npm run test:owner
```

## Validation rules

Defined once in `backend/src/validators/fields.js` and mirrored in
`frontend/src/lib/validation.js` for immediate feedback. The server is
authoritative.

| Field    | Rule                                                         |
| -------- | ------------------------------------------------------------ |
| Name     | 20–60 characters                                             |
| Address  | up to 400 characters                                         |
| Password | 8–16 characters, at least one uppercase and one special char |
| Email    | standard email format                                        |
| Rating   | integer from 1 to 5                                          |

## Design notes

**One rating per user per store.** A unique index on `(user_id, store_id)` makes
submitting and changing a rating the same operation, so the API exposes one
idempotent `PUT` rather than separate create and update routes.

**The 1–5 range is enforced by the database.** A `CHECK` constraint backs up the
application-level validation, so no script or manual query can store an
out-of-range rating.

**Average rating is computed, not stored.** Store listings sort by that average
in SQL rather than in JavaScript, because sorting after fetching would only
order the current page.

**Roles are never taken from the request body.** Signup always produces a normal
user; only an authenticated administrator can assign a role.

**Unrated stores report `null`, not `0`.** "No ratings yet" and "rated zero" are
different facts, and zero is not a valid rating.

**A store owner without a store is a normal state, not an error.** An owner
account can be created before a store is assigned to it, so the dashboard
returns an empty result with an explanation rather than a 404.

## Troubleshooting

**`RSA public key is not available client side`** — MySQL 8 authenticates with
`caching_sha2_password`. The server caches a successful login, so this appears
only after a MySQL restart, which makes it look intermittent. The driver is
configured with `allowPublicKeyRetrieval` in `src/lib/prisma.js` to complete the
full handshake. Safe over loopback; use TLS for a remote database.

**`Table 'store_rating_db.users' doesn't exist`** — the schema was dropped. Run
`npm run db:migrate` then `npm run db:seed`, or `npm run db:reset` for both.

**`npm ERR! Cannot read properties of null (reading 'edgesOut')`** — the npm
10.2.0 resolver bug. Install with `--legacy-peer-deps`, or upgrade npm.

## Build progress

- [x] **Phase 0** — project skeleton, health check, Tailwind wired up
- [x] **Phase 1** — database schema, migrations, seed data
- [x] **Phase 2** — authentication, JWT, role guards, protected routes
- [x] **Phase 3** — normal user: store list, search, submit/modify rating
- [x] **Phase 4** — admin: dashboard, user and store listings with filter + sort
- [x] **Phase 5** — store owner: dashboard with raters and average rating
- [x] **Phase 6** — polish: 404 page, shared table, lint pass, documentation
