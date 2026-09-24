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
    components/            reusable UI (layout, tables, rating widget)
    context/               auth state
    hooks/                 shared React hooks
    api/                   axios client and error normalisation
    lib/validation.js      client-side mirror of the backend rules
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

`GET /stores` accepts `search`, `sortBy` (`name`, `address`, `rating`), `order`
(`asc`, `desc`), `page` and `limit`. `search` matches store name or address.

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

## Build progress

- [x] **Phase 0** — project skeleton, health check, Tailwind wired up
- [x] **Phase 1** — database schema, migrations, seed data
- [x] **Phase 2** — authentication, JWT, role guards, protected routes
- [x] **Phase 3** — normal user: store list, search, submit/modify rating
- [ ] **Phase 4** — admin: dashboard, user and store listings with filter + sort
- [ ] **Phase 5** — store owner: dashboard with raters and average rating
- [ ] **Phase 6** — polish and documentation (password update shipped in Phase 2)
