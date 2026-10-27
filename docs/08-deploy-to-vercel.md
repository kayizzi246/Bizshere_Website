# 08 Deploy to Vercel

**For:** whoever puts the site online. About 20 minutes the first time.

You need: the GitHub repository (`kayizzi246/Bizshere_Website`), a Vercel account, and
this project on your computer with `npm install` done.

Vercel runs the website. It does **not** include a database, so you also create a free
cloud PostgreSQL database (Neon) from inside Vercel. Your local `npm run db:local`
database stays on your computer and is not used online.

---

## Step 1: Create the Vercel project

1. Go to **https://vercel.com/signup** and choose **Continue with GitHub**.
2. Click **Add New… → Project**.
3. Find **Bizshere_Website** and click **Import**. If it isn't listed, click
   **Adjust GitHub App Permissions** and give Vercel access to the repository.
4. Framework Preset shows **Next.js**. Leave Build Command, Output Directory and Install
   Command as they are (`package.json` already runs `prisma generate && next build`).
5. Open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `NEXTAUTH_SECRET` | A long random string (see below) |
   | `CRON_SECRET` | Another long random string |

   To make a random string, run this on your computer:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
6. Click **Deploy**. The build takes 2–4 minutes. The site opens but pages show a database
   error. That's expected; the database comes next.

## Step 2: Add a database

1. In your Vercel project, open the **Storage** tab.
2. Click **Create Database** → choose **Neon** (Serverless Postgres) → **Continue**.
3. Pick the region closest to your users (for Uganda, a European region such as
   Frankfurt is usually closest) and the **Free** plan. Click **Create**.
4. When asked, connect it to your project for **Production, Preview and Development**.

Vercel now adds the database variables to your project automatically. Check
**Settings → Environment Variables**: you should see `DATABASE_URL` and
`DATABASE_URL_UNPOOLED`.

## Step 3: Set the site address

1. In the project's **Settings → Domains**, copy your address, e.g.
   `bizshere-website.vercel.app`.
2. **Settings → Environment Variables → Add**: `NEXTAUTH_URL` = `https://bizshere-website.vercel.app`
   (your address, with `https://`, no slash at the end).

## Step 4: Create the tables and your admin account

Do this once, **from your computer**, in the VS Code terminal (PowerShell).

1. In Vercel, **Settings → Environment Variables**, click the eye icon next to
   `DATABASE_URL_UNPOOLED` and copy the value. It starts with `postgresql://`.
2. In the terminal, paste these lines one at a time, replacing the parts in `<...>`:

   ```powershell
   $env:DATABASE_URL = "<paste DATABASE_URL_UNPOOLED here>"
   $env:SEED_ADMIN_EMAIL = "<your real email>"
   $env:SEED_ADMIN_PASSWORD = "<a strong password, 12+ characters>"
   npm run db:production-setup
   ```

   You should see `All migrations have been successfully applied`,
   `Script executed successfully` and `Production seed complete`.

   This creates all 76 tables, the database rules and search index, your admin account
   and the reference lists (districts, categories, plans, units). It does **not** add
   demo accounts or sample listings.

3. **Close this terminal** afterwards, so later commands don't use the online database by
   accident. In a new terminal, everything uses your local `.env` again.

## Step 5: Redeploy and check

1. In Vercel, open **Deployments**, click **⋯** on the latest one → **Redeploy**.
   (This picks up `NEXTAUTH_URL` and the database variables.)
2. Open your site. Check:
   - the homepage loads,
   - `https://<your-address>/api/health` shows `{"ok":true,"db":"up"}`,
   - you can sign in at `/login` with the admin email and password from Step 4, and open `/admin`.

## Step 6: Daily jobs (already set up)

`vercel.json` tells Vercel to call `/api/cron/daily` once a day at 00:15 UTC (03:15 in
Kampala). It closes expired funding rounds, sends deadline alerts, flags stale quotes and
checks website links. It only runs when `CRON_SECRET` is set (Step 1). See it under the
project's **Settings → Cron Jobs**.

---

## Updating the live site

Every `git push` to `main` deploys automatically:

```
git add -A
git commit -m "what changed"
git push
```

**If you changed `prisma/schema.prisma`:** first create the migration locally
(`npm run db:migrate`), push, then apply it to the online database the same way as Step 4:

```powershell
$env:DATABASE_URL = "<DATABASE_URL_UNPOOLED>"
npx prisma migrate deploy
npm run db:constraints
```

## Good to know

- **File downloads:** Vercel servers have no permanent disk, so the `UPLOAD_DIR` storage
  won't keep files online. Before adding file uploads, switch `src/lib/storage.ts` to
  Vercel Blob or S3.
- **Custom domain:** **Settings → Domains → Add** (e.g. `bizsphere.ug`), follow the DNS
  instructions, then change `NEXTAUTH_URL` to the new address and redeploy.
- **Free plan limits:** fine for launch and testing. Upgrade Vercel and Neon when traffic grows.
- **Build failed?** Open the failed deployment → **Build Logs**, and read the first red error.
