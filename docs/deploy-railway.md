# Deploying Bizsphere-Ug to Railway

Railway runs the app as a **long-running Node server in Docker** (not serverless like Netlify),
which suits Next.js + Prisma much better. The repo has a `Dockerfile` and
`scripts/docker-entrypoint.sh` that **apply database migrations every time the container starts**,
so a deploy can never leave the database behind the code (the cause of the "This page didn't load"
crashes on Netlify, where migrations never ran).

Railway auto-detects the `Dockerfile` — there is no `railway.json` or `nixpacks.toml` to maintain.

## 1. Create the database

In your Railway project: **+ New → Database → PostgreSQL**. Railway creates a `Postgres` service
that publishes its own `DATABASE_URL` (pointing at the private host `postgres.railway.internal`).

You can also keep an existing Neon/Supabase database and paste its connection string instead. If
you use a pooled URL (PgBouncer) and migrations fail on the advisory lock, use the
**direct/unpooled** URL for `DATABASE_URL`.

## 2. Create the application

1. **+ New → GitHub Repo** → `kayizzi246/Bizshere_Website`, branch **main**.
2. Railway detects the `Dockerfile` and uses it. No build command to set.
3. **Port:** nothing to configure. Railway injects `PORT` at runtime, which overrides the
   Dockerfile's `ENV PORT=3000`, and `next start` honours it.
4. **Settings → Networking → Public Networking → Generate Domain** (or attach your own domain,
   e.g. `bizsphere.ug`). Railway issues the HTTPS certificate.

## 3. Environment variables

The image **does not contain `.env`** — `.dockerignore` excludes it so secrets are never baked
into a layer. Every variable below has to be set on the service: **your service → Variables**.

> Do **not** wrap values in quotes. Quotes are `.env` shell syntax; in Railway's variable editor
> they become part of the value and will break a URL or a secret.

Required — the container refuses to start without the first three:

| Variable | What to set |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` — a **reference**, not a pasted literal |
| `NEXTAUTH_URL` | The site's public URL, e.g. `https://bizsphere.ug` |
| `NEXTAUTH_SECRET` | A long random string (`openssl rand -base64 32`) |
| `ADMIN_LOGIN_KEY` | A long random string — the secret staff sign-in path `/staff/<key>` |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | The first admin login (used by the seed) |
| `UPLOAD_DIR` | A path on a **volume**, e.g. `/data/uploads` (see step 4) |
| `CRON_SECRET` | A random string, if you call the cron endpoint |

Using `${{Postgres.DATABASE_URL}}` rather than a copied string means traffic stays on Railway's
private network (no egress charges) and the app keeps working if the database password rotates.
Both services must be in the **same project and environment**, or the reference resolves to empty
— which fails exactly like an unset variable.

Payments, email, SMS, Google sign-in (set the ones you use):

`PESAPAL_CONSUMER_KEY`, `PESAPAL_CONSUMER_SECRET`, `PESAPAL_ENV`, `PESAPAL_IPN_ID`,
`RESEND_API_KEY`, `EMAIL_FROM`, `EGOSMS_USERNAME`, `EGOSMS_PASSWORD`, `EGOSMS_SENDER_ID`,
`EGOSMS_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

Do **not** set `OTP_TEST_PHONE` / `OTP_TEST_CODE` in production unless you want the demo login.
You no longer need `BLOB_READ_WRITE_TOKEN` (that was Vercel Blob) — uploads use `UPLOAD_DIR`.

## 4. A volume for uploads

Railway containers have an **ephemeral filesystem**: without a volume, every uploaded photo and
file is lost on the next deploy or restart. Go to **Settings → Volumes → Add Volume** and mount it
at the same path you set for `UPLOAD_DIR` (e.g. `/data/uploads`).

## 5. Deploy

Press **Deploy**. On every deploy the container checks its required variables, runs
`prisma migrate deploy` (and the DB constraints), then `next start` — so the schema is always in
sync. Watch the deploy logs; you should see "Applying database migrations…", then
"Applying database constraints…", then "Starting Next.js…".

## 6. First run

The first deploy's migrations create the tables. To load the reference data and the admin user,
run once from the service's shell (or as a one-off command):

```
npm run db:seed:production
```

(`npm run db:constraints` already runs on every start.) After that you can sign in at
`/staff/<ADMIN_LOGIN_KEY>` with the seed admin email and password.

## 7. Updating the site

Push to `main`. Railway redeploys automatically from the connected GitHub repo. Each deploy
rebuilds the image and re-runs migrations on start — no manual database step, ever.

## Troubleshooting

**`Error code: P1012 — Environment variable not found: DATABASE_URL`, repeating forever.**
The variable is not reaching the container, so the entrypoint exits and Railway restarts it. Check
that `DATABASE_URL` is set on the **app** service (not only on the Postgres service), that the
reference names your database service exactly, and that both are in the same environment. Since
the fail-fast check was added, this now shows as a single `✗ Cannot start: missing required
environment variable(s)` line instead of a Prisma stack trace.

**The site loads but sign-in redirects to localhost.** `NEXTAUTH_URL` is still
`http://localhost:3000`. Set it to the public https address and redeploy.

**Uploaded images vanish after a deploy.** No volume is mounted at `UPLOAD_DIR` — see step 4.

## Notes

- **Health check:** point Railway's health check path at `/` or `/robots.txt`.
- **Cron jobs:** the daily job is `GET /api/cron/daily` with the `CRON_SECRET`. Add a Railway
  **Cron Schedule** on a service (or an external cron) to call it once a day.
- **Resources:** the Node server is modest; 1 vCPU / 1 GB RAM is enough to start.
