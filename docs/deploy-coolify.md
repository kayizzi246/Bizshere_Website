# Deploying Bizsphere-Ug to Coolify

Coolify runs the app as a **long-running Node server in Docker** (not serverless like Netlify),
which suits Next.js + Prisma much better. The repo has a `Dockerfile` and
`scripts/docker-entrypoint.sh` that **apply database migrations every time the container starts**,
so a deploy can never leave the database behind the code (the cause of the "This page didn't load"
crashes on Netlify, where migrations never ran).

## 1. Create the database

Either:

- **Coolify-managed Postgres** (simplest): in your project → **+ New** → **Database** →
  **PostgreSQL** (version 16). Coolify gives you an internal connection string like
  `postgresql://postgres:PASSWORD@<service>:5432/postgres`. Use that as `DATABASE_URL`.
- **Or keep your existing Neon/Supabase database** and use its connection string. If you use a
  pooled URL (PgBouncer), migrations still work here because they run at container start against
  `DATABASE_URL`; if you hit a pooling error, use the **direct/unpooled** URL for `DATABASE_URL`.

## 2. Create the application

1. Project → **+ New** → **Application** → **Public/Private Git repository**.
2. Repository: `kayizzi246/Bizshere_Website`, branch **main**.
3. **Build Pack: Dockerfile** (Coolify auto-detects the `Dockerfile`).
4. **Port: `3000`**.
5. Attach your domain (e.g. `bizsphere.ug`) and let Coolify issue the HTTPS certificate.

## 3. Environment variables

Add these under the app's **Environment Variables** (mark secrets as such). Required:

| Variable | What to set |
| --- | --- |
| `DATABASE_URL` | The Postgres connection string from step 1 |
| `NEXTAUTH_URL` | The site's public URL, e.g. `https://bizsphere.ug` |
| `NEXTAUTH_SECRET` | A long random string (`openssl rand -base64 32`) |
| `ADMIN_LOGIN_KEY` | A long random string — the secret staff sign-in path `/staff/<key>` |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | The first admin login (used by the seed) |
| `UPLOAD_DIR` | A path on a **persistent volume**, e.g. `/data/uploads` (see step 4) |
| `CRON_SECRET` | A random string, if you call the cron endpoint |

Payments, email, SMS, Google sign-in (set the ones you use):

`PESAPAL_CONSUMER_KEY`, `PESAPAL_CONSUMER_SECRET`, `PESAPAL_ENV`, `PESAPAL_IPN_ID`,
`RESEND_API_KEY`, `EMAIL_FROM`, `EGOSMS_USERNAME`, `EGOSMS_PASSWORD`, `EGOSMS_SENDER_ID`,
`EGOSMS_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

Do **not** set `OTP_TEST_PHONE` / `OTP_TEST_CODE` in production unless you want the demo login.
You no longer need `BLOB_READ_WRITE_TOKEN` (that was Vercel Blob) — uploads use `UPLOAD_DIR`.

## 4. Persistent storage for uploads

Netlify/Vercel have no permanent disk, so uploaded files were lost. On Coolify add a **Persistent
Storage** volume to the app, mounted at the same path you set for `UPLOAD_DIR` (e.g. `/data/uploads`).
Uploaded photos and files then survive restarts and deploys.

## 5. Deploy

Press **Deploy**. On every deploy the container starts by running
`prisma migrate deploy` (and the DB constraints), then `next start` — so the schema is always in
sync. Watch the deploy logs; you should see "Applying database migrations…" then "Starting Next.js…".

## 6. First run

The first deploy's migrations create the tables. To load the reference data and the admin user,
run once from the app's **Terminal** (or a one-off command) in Coolify:

```
npm run db:seed:production
```

(or `npm run db:constraints` is already run on start). After that you can sign in at
`/staff/<ADMIN_LOGIN_KEY>` with the seed admin email and password.

## 7. Updating the site

Push to `main`. In Coolify, enable **automatic deployments** (webhook) or press **Deploy**. Each
deploy rebuilds the image and re-runs migrations on start — no manual database step, ever.

## Notes

- **Health check:** point Coolify's health check at `/` or `/robots.txt`.
- **Cron jobs:** the daily job is `GET /api/cron/daily` with the `CRON_SECRET`. Add a Coolify
  **Scheduled Task** (or external cron) to call it once a day.
- **Resources:** running the site is modest — 1 vCPU / 1 GB RAM carries it. **Building it is not.**
  `next build` wants about 2 GB on its own, and Coolify builds on the same machine the site runs
  on, so on a 1 GB box a deploy starves everything else, Coolify's own screen included. Give the
  server **2 GB or more, and swap** (below). This line used to say 1 GB was enough to start; that
  was true of the running site and wrong about deploys, and it cost an afternoon on 17 Nov 2026.

## When the server goes slow, or Coolify will not open

Nearly always the build, not the site. Run this over SSH — it only reads:

```sh
sh scripts/vps-health.sh
```

It reports memory, disk, Docker's leftovers, load and whether the kernel has been killing
processes, then names what to change. The two fixes that matter most:

**Swap**, so a heavy build slows the machine down instead of killing it. Safe on a live server:

```sh
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

**Pruning**, because every build leaves layers behind until the disk fills. This touches no
running container, no database volume and nothing of Coolify's own:

```sh
sudo docker builder prune -af
sudo docker image prune -af
```

And push once. Each push to `main` starts another build; several in a row queue up and starve
each other on a small box. If deploys stay painful, build the image in a GitHub Action and have
Coolify pull it, so the server never builds at all.
