# Moving the database onto the VPS

The site's data currently lives in Prisma Postgres, which is locked behind `planLimitReached`.
This moves it onto Postgres running on the server you already pay for, beside the app. No second
bill, no public endpoint, and no company that can switch your data off.

Work through it in order. Nothing here is irreversible until step 6.

---

## 0. First decide: do you need the old data back?

**Moving to the VPS does not unlock the Prisma database.** It is a separate machine owned by
someone else, and it will stay shut until the account restriction is lifted. So decide which of
these you are doing:

| | What you get | Cost |
| --- | --- | --- |
| **A. Start fresh on the VPS** | A working site with an empty database. You re-enter content. | Nothing |
| **B. Pay Prisma once, export, then leave** | Everything that was in there, then move and cancel. | One month |

If the Prisma database holds real listings, members or payments, **B is almost certainly cheaper
than A** — one month costs less than re-keying a database by hand, and you cancel straight after.
Nothing commits you to staying: once the dump is on the VPS, the account can go.

For B, unlock the account, then on any machine that can reach it:

```sh
pg_dump "postgres://USER:PASSWORD@db.prisma.io:5432/postgres?sslmode=require" \
  -Fc --no-owner --no-privileges -f prisma-export.dump
```

Keep that file. Step 5 loads it.

---

## 1. Create the database in Coolify

Project → **+ New** → **Database** → **PostgreSQL 16**.

- **Leave "Make it publicly available" OFF.** This is the whole point: the database should have no
  internet-facing port. The app reaches it over Coolify's internal network.
- Set a long password: `openssl rand -base64 24`.
- Coolify shows an internal connection string like
  `postgresql://postgres:PASSWORD@<service-name>:5432/postgres`. That host is only resolvable
  inside the server.

## 2. Point the app at it

App → **Environment Variables**:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | the internal string from step 1 |

While you are in there, clear the **Build Variable** checkbox on every secret — see
[security-and-backups.md](security-and-backups.md) §8. Keep the old Prisma string somewhere safe
until the move is proven, then delete it.

## 3. Deploy

The container start does the rest: it waits for the database, runs `prisma migrate deploy`, then
applies `prisma/sql/constraints.sql`. The schema builds itself on an empty database — you do not
create tables by hand.

Watch the deploy log for:

```
→ Waiting for the database…
  database is up.
→ Applying database migrations (prisma migrate deploy)…
All migrations have been successfully applied.
→ Starting Next.js…
```

If it stops at "Database unreachable after 30 attempts", `DATABASE_URL` is wrong — inside the
container `localhost` means the container itself, so the host must be the database's **service
name**, never `localhost` or `127.0.0.1`.

## 4. Create the first admin

With `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` set, run the seed once from the app container,
or use `npm run admin:create`. You need this to reach `/admin` and enter content.

## 5. Load the data (option B only)

Copy `prisma-export.dump` onto the server, then:

```sh
sh scripts/restore-dump.sh prisma-export.dump
```

It refuses to run if the database already holds content, so it cannot quietly overwrite work.

> `scripts/restore-dump.sh` and `scripts/backup.sh` talk to the `db` service of
> `docker-compose.prod.yml`. If you used a **Coolify-managed** database instead, point them at its
> container: `docker ps` to find the name, then `docker exec -i <name> psql …` /
> `pg_dump …` with the same flags.

## 6. Verify before you trust it

Do not skip this. In order:

1. Open the site. Pages that read the database should show content, not "This page didn't load".
2. Sign in at `/admin` and save one small change. Confirm it appears on the public page.
3. Check from outside the server that the database is **not** reachable:
   ```sh
   # from your own machine, not the VPS
   nc -vz YOUR.SERVER.IP 5432     # must fail: connection refused or timeout
   ```
   On the server, `ss -tlnp` should show Postgres bound only to a private address.
4. Take a backup and restore it somewhere else. See security-and-backups.md §3.

## 7. Then harden it

Now — not later, because it is easy while the data is small:

- **Restricted role**: `prisma/sql/harden.sql`, then `DATABASE_URL` = `bizsphere_app` and
  `MIGRATION_DATABASE_URL` = the owner. §7 of security-and-backups.md.
- **Nightly backup on cron, copied off the machine.** §3.
- **Close the Coolify dashboard, rotate secrets, SSH keys only, automatic updates.** §1, §2, §4, §5.

## 8. Only then, cancel Prisma

Once the site has run on the VPS database for a few days and you have restored a backup
successfully, the Prisma account can go.

---

## What this changes about backups

Prisma was backing the data up for you, invisibly. Nobody is doing that now. **A VPS database with
no backup is one disk failure away from being gone for good**, and that is a worse failure than
the one you are escaping — a locked database still has your data in it; a dead disk does not.

Step 7's cron job is not optional. It is the price of owning the database.
