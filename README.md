# FinLedger — Finance Access Control Backend

A clean, efficient backend for a finance dashboard with role-based access control, built with **Node.js + Express + PostgreSQL**.

## Why This Stack?

- **Express** — minimal, explicit, no magic. Every middleware and route is intentional.
- **PostgreSQL** — proper relational integrity, constraints enforced at DB level, not just app level.
- **Zod** — schema validation that colocates type safety with runtime validation.
- **JWT** — stateless auth, easy to test, no session storage overhead.

## Project Structure

```
finledger/
├── src/
│   ├── app.js                 # Entry point, middleware wiring
│   ├── db/
│   │   ├── index.js           # PostgreSQL pool + schema init
│   │   └── seed.js            # Seed data (3 users + 30 records)
│   ├── middleware/
│   │   ├── auth.js            # JWT authenticate + role authorize
│   │   └── validate.js        # Zod schemas + validate middleware
│   └── routes/
│       ├── auth.js            # /auth — login, register, me
│       ├── users.js           # /users — CRUD (admin only)
│       ├── records.js         # /records — CRUD + filtering + pagination
│       └── dashboard.js       # /dashboard — summary analytics
└── ui/
    └── index.html             # Minimal dark-terminal UI
```

## Setup

### 1. Prerequisites

- Node.js ≥ 18
- PostgreSQL ≥ 14

### 2. Create Database

```sql
createdb finledger
```

### 3. Install & Configure

```bash
npm install
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET
```

### 4. Start

```bash
npm start        # production
npm run dev      # development (nodemon)
npm run seed     # seed DB with 3 users + 30 records
```

App runs at: `http://localhost:3000`

---

## Roles & Permissions

| Action                    | Viewer | Analyst | Admin |
|---------------------------|--------|---------|-------|
| View records              | ✓      | ✓       | ✓     |
| Filter / paginate records | ✓      | ✓       | ✓     |
| Create records            | ✗      | ✓       | ✓     |
| Update records            | ✗      | ✓       | ✓     |
| Delete records (soft)     | ✗      | ✗       | ✓     |
| View dashboard analytics  | ✗      | ✓       | ✓     |
| Manage users              | ✗      | ✗       | ✓     |

---

## API Reference

### Auth

| Method | Path           | Auth | Description        |
|--------|----------------|------|--------------------|
| POST   | /auth/register | None | Create a user      |
| POST   | /auth/login    | None | Get JWT token      |
| GET    | /auth/me       | Any  | Current user info  |

### Records

| Method | Path          | Auth            | Description             |
|--------|---------------|-----------------|-------------------------|
| GET    | /records      | Any             | List (filter, paginate) |
| GET    | /records/:id  | Any             | Single record           |
| POST   | /records      | analyst, admin  | Create                  |
| PATCH  | /records/:id  | analyst, admin  | Update fields           |
| DELETE | /records/:id  | admin           | Soft delete             |

**Filter query params:** `type`, `category`, `from` (YYYY-MM-DD), `to` (YYYY-MM-DD), `page`, `limit`

### Dashboard

| Method | Path                  | Auth            | Description           |
|--------|-----------------------|-----------------|-----------------------|
| GET    | /dashboard/summary    | analyst, admin  | Totals + net balance  |
| GET    | /dashboard/by-category| analyst, admin  | Category-wise totals  |
| GET    | /dashboard/trends     | analyst, admin  | Monthly/weekly trends |
| GET    | /dashboard/recent     | analyst, admin  | Last 10 records       |

### Users

| Method | Path        | Auth  | Description        |
|--------|-------------|-------|--------------------|
| GET    | /users      | admin | All users          |
| GET    | /users/:id  | admin | Single user        |
| PATCH  | /users/:id  | admin | Update role/status |
| DELETE | /users/:id  | admin | Hard delete        |

---

## Seed Credentials

After `npm run seed`:

| Email                   | Password    | Role    |
|-------------------------|-------------|---------|
| admin@finledger.dev     | Admin@123   | admin   |
| analyst@finledger.dev   | Analyst@123 | analyst |
| viewer@finledger.dev    | Viewer@123  | viewer  |

---

## Design Decisions

- **Soft deletes** on records — financial data should never be hard-deleted. The `is_deleted` flag preserves audit trails.
- **DB-level constraints** — `CHECK` constraints on `type` and `role` columns mean the DB itself enforces valid values, not just the app.
- **Pagination on all list endpoints** — no endpoint returns unbounded data.
- **Role enforcement as middleware** — `authorize(...roles)` is composable and explicit at the route level, not buried in service logic.
- **No ORM** — raw `pg` queries make SQL explicit, easier to audit, and avoids N+1 query surprises.

## Optional Enhancements Included

- ✓ JWT authentication
- ✓ Soft delete for records
- ✓ Pagination
- ✓ Minimal UI (dark terminal theme)
- ✓ Filtering by date, category, type
