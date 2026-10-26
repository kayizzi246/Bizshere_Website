# 02 Setup and operations

**For:** developers and whoever hosts the site.

## Local setup (Windows, no Docker)

Requirements: Node.js 20 or newer. Nothing else.

```powershell
npm install
copy .env.example .env      # then edit NEXTAUTH_SECRET and SEED_ADMIN_PASSWORD
```

```powershell
npm run db:local     # start the database; it keeps running in the background
npm run db:setup     # first time only
npm run dev          # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run db:local` | Starts PostgreSQL. Safe to run when it is already running |
| `npm run db:stop` | Stops it cleanly |
| `npm run db:status` | Says whether it is running |

`scripts/local-db.mjs` uses the real PostgreSQL binaries installed by the
`embedded-postgres` package and drives them with PostgreSQL's own `initdb` and `pg_ctl`.
Data is in `.pgdata/`, the server log in `.pgdata/server.log`. It reads user, password,
port and database name from `DATABASE_URL`. If a crash left old PostgreSQL processes
behind, `db:local` stops them before starting. If it still can't start, it prints the
reason and the end of the server log.

To start again from empty: `npm run db:stop`, delete `.pgdata/`, then `db:local` and `db:setup`.

**`Can't reach database server at localhost:5432` in the browser:** run `npm run db:local`
and refresh. If you started `dev` before creating `.env`, restart `dev`.

**If port 5432 is already used** (another PostgreSQL): change the port in `DATABASE_URL`,
e.g. `localhost:5433`, and run `db:local` again.

Alternatives: `npm run db:up` (Docker, see `docker-compose.yml`) or any PostgreSQL 14+.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `NEXTAUTH_URL` | yes | Public site address, e.g. `https://bizsphere.ug` |
| `NEXTAUTH_SECRET` | yes | Long random string. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | for seeding | First admin account |
| `UPLOAD_DIR` | no (default `uploads`) | Private file storage folder |
| `PAYMENT_*` | when payments go live | Gateway keys, see below |

## Database changes

1. Edit `prisma/schema.prisma`.
2. `npm run db:migrate` (name the migration when asked). Commit the new folder in `prisma/migrations/`.
3. If you need a rule Prisma can't express, add it to `prisma/sql/constraints.sql` using the `bsu_add_check` helper (it is safe to re-run), then `npm run db:constraints`.
4. If the change is a directory field editors should fill in, add one line to `src/lib/content-fields.ts`.
5. `npm run docs:db` to regenerate the data dictionary.

## Daily jobs

`npm run jobs` (in `scripts/jobs.ts`) runs these. Run a single one with `npm run jobs -- rounds`.

| Job | What it does |
|---|---|
| `rounds` | Opens upcoming funding rounds whose start date has passed; closes rounds past their deadline |
| `deadlineAlerts` | Alerts members who saved a programme, 7 days before it closes |
| `staleOffers` | Machine quotes past their validity go back to review |
| `subscriptions` | Marks unpaid subscriptions past due, then expired |
| `freshness` | Archives content past its expiry date; reports overdue reviews and old prices |
| `links` | Checks Useful Website links weekly and records the HTTP status |

Schedule once a day, e.g. Linux cron `15 3 * * * cd /app && npm run jobs`, or Windows Task Scheduler.

## Files and downloads

Downloadable files (templates, manuals, verification documents) are stored in
`UPLOAD_DIR` and are **only** served through `/api/files/[id]`, which checks the viewer's
access first. Never link to the storage folder directly. Each file has versions
(`file_versions`); exactly one is current (enforced by the database). To move to S3 later,
replace `readStoredFile()` in `src/lib/storage.ts`.

## Payments

`src/lib/payments.ts` is a stub until a gateway that supports MTN Mobile Money, Airtel
Money and cards in Uganda is chosen. Implement `startCheckout()` and `verifyWebhook()`.
The webhook route `/api/payments/webhook` already marks the payment as paid and extends
the subscription. Access is only granted from the webhook, never from the browser
redirect. Until configured, the webhook answers 501.

## Health check

`GET /api/health` returns `{"ok":true,"db":"up"}` or 503. Point your uptime monitor at it.

## Deploying

```bash
npm ci
npx prisma migrate deploy
npm run db:constraints
npm run build
npm start
```

Then schedule `npm run jobs`. Run the seed only once in production, to create the first
admin; then change that password and delete the sample records from the admin area.

## Backups

Back up the database daily (`pg_dump`) and the `UPLOAD_DIR` folder. Test a restore before launch.

## Verified on 26 Oct 2026

On Windows without Docker, from a fresh `.pgdata/`: `db:local` → `db:setup` → production
`build` → every public, admin, business and API route answered as expected. The CHECK
constraints were tested against invalid data, and the seed and jobs ran twice without errors.
