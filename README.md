# BizSphere-Ug

Business information platform for Uganda: a public website with free previews and
member-only detail, a business portal for suppliers, dealers, experts and funders,
and an admin area for review, verification and content freshness.

Built from the **Database and Website Design Blueprint v1.0**
(`docs/source/`). All project documents are indexed in **[docs/README.md](docs/README.md)**.

| | |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript, server components and server actions) |
| Database | PostgreSQL via Prisma 6 (75 tables, see [data dictionary](docs/03-database/data-dictionary.md)) |
| Auth | NextAuth (email + password, JWT sessions, roles) |
| Styling | Tailwind CSS with brand tokens in `tailwind.config.ts` |

---

## 1. Get it running (first time)

You need **Node.js 20+** and **VS Code**. **Docker is not required.**

```bash
# 1. Install
npm install

# 2. Environment
copy .env.example .env        # macOS/Linux: cp .env.example .env
#    then set NEXTAUTH_SECRET (any long random string) and SEED_ADMIN_PASSWORD

# 3. Start the database (runs in the background)
npm run db:local

# 4. Create tables, constraints, search index and sample data (first time only)
npm run db:setup

# 5. Start the site
npm run dev
```

Open http://localhost:3000.

`npm run db:local` runs a real PostgreSQL from npm (no Docker, no installer). It keeps
running in the background after the command finishes; data is kept in `.pgdata/`.
Each working day: `npm run db:local`, then `npm run dev`. Stop the database with
`npm run db:stop`; check it with `npm run db:status`. If it can't start, it prints the
reason and the server log.

**Prefer Docker or your own PostgreSQL?** Use `npm run db:up` (Docker) instead of
step 3, or point `DATABASE_URL` in `.env` at your server. Everything else is the same.

### Sample accounts (from the seed)

| Email | Role | Password |
|---|---|---|
| `admin@bizsphere.local` (or `SEED_ADMIN_EMAIL`) | Admin | `SEED_ADMIN_PASSWORD` in `.env` |
| `editor@bizsphere.local` | Editor | `Demo-12345` |
| `member@bizsphere.local` | Paying member (sees everything) | `Demo-12345` |
| `visitor@bizsphere.local` | Free user (sees previews) | `Demo-12345` |
| `dealer@bizsphere.local` | Business owner | `Demo-12345` |

Sign in as the visitor and the member in two browsers to see the free preview vs full detail.

---

## 2. Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / run |
| `npm run typecheck`, `npm run lint` | Checks |
| `npm run db:local` | Start PostgreSQL without Docker (runs in the background) |
| `npm run db:stop` / `npm run db:status` | Stop it / check whether it is running |
| `npm run db:up` | Start PostgreSQL in Docker (alternative) |
| `npm run db:setup` | First time: apply migrations, constraints, seed |
| `npm run db:migrate` | Create and apply a new migration after editing `schema.prisma` |
| `npm run db:constraints` | Re-apply `prisma/sql/constraints.sql` (safe to repeat) |
| `npm run db:seed` | Load sample data and demo accounts (development only; safe to repeat) |
| `npm run db:production-setup` | Online database: migrations, constraints, admin and reference data (no demo accounts) |
| `npm run db:reset` | Wipe and rebuild the database (asks first). Run `db:constraints` and `db:seed` after |
| `npm run db:studio` | Browse the database in Prisma Studio |
| `npm run jobs` | Daily jobs: close funding rounds, deadline alerts, stale quotes, expiries, link checks |
| `npm run docs:db` | Regenerate the data dictionary after a schema change |

---

## 3. Project layout

```
docs/                    Project documents (start at docs/README.md); source PDFs in docs/source/
prisma/
  schema.prisma          All 75 tables (blueprint sections 03–14)
  migrations/            Migration history (apply with migrate deploy)
  sql/constraints.sql    CHECK rules, ISO currency codes, partial unique indexes, search index
  seed.ts                Sample data (no invented prices: unknown amounts stay empty)
scripts/
  local-db.mjs           PostgreSQL without Docker
  jobs.ts                Daily maintenance jobs
  data-dictionary.ts     Generates docs/03-database/data-dictionary.md
src/
  app/
    (site)/              Public site: home, search, 11 directories with detail pages,
                         account, corrections, membership, about/contact/methodology/terms/privacy
    business/            Business portal: dashboard, add a machine offer
    admin/               Dashboard, review queue, content editor (all directories),
                         corrections, market prices, users
    api/                 Auth, business sign-up, gated file downloads, payment webhook, health
    actions/member.ts    Save, collections, saved searches, alerts, corrections
  components/            Header, footer, Gate, DetailParts (shared detail-page sections)...
  config/site.ts         Site name, tagline, public contact details (waiting on client)
  lib/
    access.ts            WHO CAN SEE WHAT (server-side gating, roles)
    content-fields.ts    Admin entry-form fields for every directory
    costing.ts           Recipe costing and budget totals
    search.ts            Full-text + advanced search
    storage.ts           Private file storage
    payments.ts          Payment gateway stub (MTN MoMo, Airtel Money, card)
    format.ts            Money, dates, labels, routes
```

---

## 4. Rules the code follows (please keep them)

1. **Gate on the server, never in the browser.** Visitors must not receive member-only
   data at all. Pages call `getViewer()` and only query or pass detail when
   `viewer.isMember` is true. The blurred rows behind "Show more" are fake filler.
   This also applies to API routes and file downloads (`/api/files/[id]`).
2. **Unknown is empty, not zero.** Money and quantity fields are nullable. A budget line or
   costing line with no cost must have an `unknownReason` (enforced in the database).
3. **Verification is specific.** One `VerificationCheck` row per check type with date,
   editor and evidence. Show "Business contact checked on 12 Mar 2026", never a blanket "verified".
4. **Status, checks and freshness are separate.** `publicationStatus`, `VerificationCheck`
   and `lastReviewedAt` / `nextReviewDueAt` are different fields on purpose.
5. **Keep history.** Price observations are added, never overwritten. Budget totals are
   calculated from lines, never stored. Every admin save writes a `ContentRevision`.
6. **Business input goes through review.** Sign-ups and offers create a `Submission`; nothing
   a business submits goes live without an editor.

Full status and what's next: [docs/07-delivery-plan.md](docs/07-delivery-plan.md).

---

## 5. Deploying

**Vercel (recommended):** follow [docs/08-deploy-to-vercel.md](docs/08-deploy-to-vercel.md).
Daily jobs run through Vercel Cron (`vercel.json` → `/api/cron/daily`). Set up the online
database once with `npm run db:production-setup`, which creates the admin and reference data
only, with no demo accounts.

**Any other Node host** that can reach PostgreSQL (a VPS, Render, Railway, Fly.io):

```bash
npm ci
npx prisma migrate deploy
npm run db:constraints
npm run build
npm start
```

Set `DATABASE_URL`, `NEXTAUTH_URL` (your real domain), a strong `NEXTAUTH_SECRET` and
`UPLOAD_DIR`. Schedule `npm run jobs` once a day. Don't run the seed in production except
to create the first admin. See [docs/02-setup-and-operations.md](docs/02-setup-and-operations.md).
