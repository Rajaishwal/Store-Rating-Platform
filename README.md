# Store Rating Platform

A full-stack web application where users rate stores from 1 to 5. A single login
serves three roles — System Administrator, Normal User, and Store Owner — each
with different capabilities after signing in.

## Tech stack

| Layer    | Choice                                  |
| -------- | --------------------------------------- |
| Backend  | Express 5 + Prisma 7                     |
| Database | MySQL 8                                  |
| Frontend | React 19 + Vite 8 + Tailwind CSS 4       |
| Auth     | JWT (stateless), bcrypt password hashing |

## Project layout

```
backend/
  prisma/schema.prisma     database schema and migrations
  src/
    config/env.js          environment variables, validated at boot
    middleware/            auth, role guards, error handling
    routes/                HTTP routes grouped by role
    utils/                 shared helpers
frontend/
  src/
    pages/                 one component per screen
    components/            reusable UI (tables, forms, rating widget)
    context/               auth state
    api/                   axios client
```

## Getting started

### 1. Database

MySQL 8 must be running locally. Create the database:

```sql
CREATE DATABASE store_rating_db;
```

### 2. Backend

```bash
cd backend
cp .env.example .env     # then set DATABASE_URL and JWT_SECRET
npm install
npm run db:migrate
npm run db:seed
npm run dev              # http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev              # http://localhost:5173
```

The Vite dev server proxies `/api` to the backend, so no API URL is baked into
the client.

## Validation rules

| Field    | Rule                                                        |
| -------- | ----------------------------------------------------------- |
| Name     | 20–60 characters                                             |
| Address  | up to 400 characters                                         |
| Password | 8–16 characters, at least one uppercase and one special char |
| Email    | standard email format                                        |
| Rating   | integer from 1 to 5                                          |

## Build progress

- [x] **Phase 0** — project skeleton, health check, Tailwind wired up
- [x] **Phase 1** — database schema, migrations, seed data
- [x] **Phase 2** — authentication, JWT, role guards, protected routes
- [ ] **Phase 3** — normal user: store list, search, submit/modify rating
- [ ] **Phase 4** — admin: dashboard, user and store listings with filter + sort
- [ ] **Phase 5** — store owner: dashboard with raters and average rating
- [ ] **Phase 6** — polish and documentation (password update shipped in Phase 2)
