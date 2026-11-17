# Keeping the server safe, and the data recoverable

The site runs on one VPS. That machine is now the only place the business's data exists, so these
two jobs — keeping other people out, and being able to get the data back — are no longer optional.

Work down this page in order. The first three items are the ones that matter most.

## Before you enter real data

Typing real listings, members and payments into the site turns it from something you can rebuild
into something you cannot. Do these six things first, in this order. Everything is explained
further down.

1. **Close the Coolify dashboard** to your own address, and change its password (§1).
2. **Rotate every secret** that has been pasted into a chat, a ticket or an email (§2).
3. **Check which database the site actually uses** (§3) — backing up the wrong one is worse than
   not backing up, because it looks like you are covered.
4. **Run one backup by hand and restore it somewhere else.** Until a backup has been restored
   once, you do not have a backup, you have a file.
5. **Put the backup on a cron** and copy it off the machine (§3).
6. **Turn off password SSH** (§4) and **switch on automatic security updates** (§5).

After that, the rule for day-to-day work is simple:

```sh
sh scripts/backup.sh      # before a bulk import, a migration, or anything you cannot retype
```

A backup costs seconds. Re-keying a week of listings does not.

## 1. Close the Coolify dashboard (do this first)

Coolify is served on port 8000 over **plain HTTP**, open to the whole internet. Every login sends
the admin password across the network in clear text, and that password controls every container,
every environment variable and the database.

Restrict the port to your own address:

```
ufw allow from YOUR.IP.ADDRESS.HERE to any port 8000 proto tcp
ufw deny 8000/tcp
```

If your address changes (most home connections), put the dashboard behind a domain with HTTPS
instead — Coolify can issue a certificate for itself the same way it does for the site.

**Then change the Coolify password.** Treat the current one as already known.

## 2. Rotate the secrets

These have all been shared in chat transcripts and should be considered public:

| Variable | Why it matters |
| --- | --- |
| `ADMIN_LOGIN_KEY` | The secret staff sign-in path. Anyone with it reaches the staff login. |
| `NEXTAUTH_SECRET` | Signs session cookies. With it, sessions can be forged. |
| `CRON_SECRET` | Lets anyone trigger the daily job. |
| `EGOSMS_PASSWORD` | Sends SMS at your cost. |
| `PESAPAL_CONSUMER_SECRET` | Payment credentials. |

Generate each with `openssl rand -base64 32`, set them in Coolify, redeploy. Changing
`NEXTAUTH_SECRET` signs everyone out, which is the point.

Delete the dead ones while you are there: `BLOB_READ_WRITE_TOKEN`, `BLOB_STORE_ID`,
`BLOB_WEBHOOK_PUBLIC_KEY`, `POSTGRES_URL`, `PRISMA_DATABASE_URL`.

## 3. Back up, automatically

**First: check you are backing up the database the site actually uses.** This is not a formality.
`scripts/backup.sh` dumps the `db` container defined in `docker-compose.prod.yml`. If the running
site's `DATABASE_URL` points somewhere else — a managed Postgres, Prisma, Neon, Supabase — then
that script backs up an empty or stale container and reports success, while the real data is
untouched. A backup that looks healthy and contains nothing is worse than none at all.

In Coolify, open the application → Environment Variables and read `DATABASE_URL`:

| What `DATABASE_URL` says | What to back up |
| --- | --- |
| `@db:5432` (or another compose service name) | `scripts/backup.sh` is correct as written. |
| Any outside host | That provider's own backups **and** a dump you keep yourself. The script needs its connection string, not the compose container. |

A managed database is not a backup either. It can be locked by a billing problem while your data
sits intact and unreachable on the other side of it — which is exactly what happened here with
Prisma. Keep a copy you hold.

`scripts/backup.sh` dumps the database and archives the uploads. It works with either shape of
deployment:

| Setting | When to use it |
| --- | --- |
| *(nothing)* | The compose stack in `docker-compose.prod.yml`. |
| `DB_CONTAINER=…` | A **Coolify-managed** database, which is not part of that stack. `docker ps` shows the name. |
| `APP_CONTAINER=…` | The app container, for the uploads. Without it the database is still dumped, and the run says plainly that the files are not included. |
| `BACKUP_PASSPHRASE=…` | Encrypt both files with AES256 before they leave the server. |
| `BACKUP_KEEP=…` | How many of each to keep locally (default 14). |

Run it nightly from cron:

```
crontab -e
```
```
0 2 * * * cd /path/to/Bizshere_Website && DB_CONTAINER=your-postgres APP_CONTAINER=your-app \
  BACKUP_PASSPHRASE="$(cat /root/.backup-pass)" sh scripts/backup.sh \
  >> /var/log/bizsphere-backup.log 2>&1
```

Keep the passphrase in a file only root can read (`chmod 600`), and **a copy of it somewhere off
the server** — an encrypted backup whose passphrase died with the machine is not a backup.

**A backup on the same machine is not a backup.** If the VPS is lost, so are they. Copy them off
— to another server, to object storage, or to your own computer:

```
0 3 * * * rsync -az /path/to/Bizshere_Website/backups/ user@elsewhere:/backups/bizsphere/
```

### Where to keep the offsite copy — free options

This site's whole database dumps to about **1 MB**. That is small enough that every free tier
below is years of nightly backups, so cost is not the deciding factor — durability and not being
locked out are.

| Where | Free allowance | Good for this |
| --- | --- | --- |
| **Cloudflare R2** | 10 GB storage, free egress, no expiry | **Best choice.** S3-compatible, so Coolify's built-in scheduled backups can write to it directly, and getting the data back out costs nothing. |
| **Backblaze B2** | 10 GB | Also S3-compatible. Fine second choice. |
| Your own computer | your disk | Free, and genuinely separate from the server. Needs you to remember — pair it with one of the above, do not rely on it alone. |
| Google Drive / OneDrive | 15 GB / 5 GB | Works via `rclone`. Fine as a third copy. |
| **A git repository** | — | **No.** Backups hold members' phone numbers and payment records; a repo is the wrong place for personal data, and the history grows forever. |

Coolify can do this for you: on the database resource there is a **Backups** section that runs
`pg_dump` on a schedule and uploads to any S3-compatible target. Point it at R2, set it daily,
and keep `scripts/backup.sh` as well — that one also captures the uploaded files, which a
database-only backup misses.

**Encrypt anything that leaves the server.** The dump contains names, phone numbers and payments:

```sh
gpg --symmetric --cipher-algo AES256 backups/db-20261117-020000.dump
# upload the .gpg file, keep the passphrase somewhere other than the server
```

### If you ever want a managed database again

You do not need one — Postgres on the VPS is free and yours. But if the backup burden ever feels
heavier than the vendor risk:

- **Neon** scales to zero and **wakes on the first query**, so a quiet site simply resumes.
- **Supabase** free projects **pause after about a week of inactivity** and must be unpaused by
  hand in the dashboard — which is the same shape of problem as the one that locked this site out.

Check the current limits at neon.com/pricing and supabase.com/pricing before trusting either;
these tiers change, and both can still gate your data behind an account.

**Test a restore before you need one.** An untested backup is a guess. On a spare machine:

```
sh scripts/restore-dump.sh backups/db-YYYYMMDD-HHMMSS.dump
```

Put a reminder in your calendar to do this once a quarter.

## 4. Lock down SSH

```
ssh-copy-id root@YOUR.SERVER            # from your own machine, if you have not already
```

Then in `/etc/ssh/sshd_config`:

```
PasswordAuthentication no
PermitRootLogin prohibit-password
```
```
systemctl restart sshd
```

**Keep your current session open** while you test a new one from another terminal. Locking
yourself out of a VPS means a rescue console.

## 5. Keep the system patched

```
apt-get install -y unattended-upgrades
dpkg-reconfigure --priority=low unattended-upgrades
```

Security updates then install themselves. This is the single highest-value thing you can set up
and forget, because the usual way a small server is compromised is a months-old unpatched package.

## 6. Check what is exposed

```
ss -tlnp
```

The site needs 80 and 443. SSH needs its port. Nothing else should be listening on a public
address — in particular the database must **not** be, and `docker-compose.prod.yml` deliberately
publishes no port for it.

## 7. Lock the database down

### Where it should live: on your own server, not Supabase

The strongest protection a database can have is **not being reachable from the internet at all**.
`docker-compose.prod.yml` already does this: the `db` service publishes no port, so Postgres
listens only on the private Docker network where the app container can see it. There is no public
address to attack, no password to brute-force from outside, and no provider that can lock you out.

Supabase, Neon and Prisma Postgres all work the other way round: a public endpoint, reachable by
anyone who has or guesses the connection string. They defend it well, but the attack surface
exists by design — and the account in front of it can be suspended, which is **exactly** what
happened to this project's data on Prisma.

| | Self-hosted on the VPS | Supabase / managed |
| --- | --- | --- |
| Reachable from the internet | No | Yes, by design |
| Can a billing problem lock your data away | No | Yes — it already has |
| Backups | Yours to run (§3) | Automatic, plus point-in-time |
| Patching Postgres | Yours | Theirs |

**Recommendation: keep the database on the VPS.** It is more secure and it cannot be taken away
from you. The price is that backups and updates are your job — which §3 and §5 cover. Move to
Supabase only if you decide the managed backups are worth the public endpoint and the vendor
risk, and never because it feels "more secure" — for this site it is not.

### Then take away the application's power

Even with no public port, the site normally connects as the database **owner** — a role that can
drop every table, read every other database and create new logins. A web app needs none of that.

`prisma/sql/harden.sql` creates a second role, `bizsphere_app`, that can read and write rows and
nothing else. Run it once, as the owner, after the schema exists:

```sh
docker compose -f docker-compose.prod.yml exec -T db \
  psql -U bizsphere -d bizsphere -v app_password="'$(openssl rand -base64 24)'" \
  -f /dev/stdin < prisma/sql/harden.sql
```

Then in Coolify set **two** variables:

| Variable | Role | Used for |
| --- | --- | --- |
| `DATABASE_URL` | `bizsphere_app` | The running site. Rows only. |
| `MIGRATION_DATABASE_URL` | the owner | Schema changes at container start. |

`scripts/docker-entrypoint.sh` uses the second one for `prisma migrate deploy` and the constraints
file, and the first for everything else. If `MIGRATION_DATABASE_URL` is unset, both fall back to
`DATABASE_URL` and nothing changes — so you can set this up in two steps.

**What this buys you.** Tested on a throwaway copy of this schema, connected as `bizsphere_app`:

| Attempt | Result |
| --- | --- |
| `SELECT` / `INSERT` / `UPDATE` / `DELETE` | allowed — the site works normally |
| `CREATE TABLE` | blocked — permission denied for schema public |
| `DROP TABLE` | blocked — must be owner of table |
| `ALTER TABLE` | blocked — must be owner of table |
| `TRUNCATE` | blocked — permission denied for table |
| `CREATE ROLE … LOGIN` | blocked — permission denied to create role |
| `pg_read_file('/etc/passwd')` | blocked — permission denied for function |
| Connecting to another database on the server | blocked |

So a stolen `DATABASE_URL`, or a flaw in the app, costs you rows — not the schema, not a back-door
login, not the server's files. That is the difference between an incident and a catastrophe.

### The rest of the lock

- **Never publish 5432.** No `ports:` on the `db` service, and `ufw deny 5432` on the host.
  Check with `ss -tlnp` (§6) — the database must not appear on a public address.
- **One long random password per role**, `openssl rand -base64 24`, stored only in Coolify.
- **Rotate after anyone leaves**, after any paste into a chat or ticket, and after any build that
  carried the secret into an image (§7 below).
- **Keep the owner's connection string out of the app entirely** once the two variables are set.

## 8. Keep secrets out of the built image

Every Coolify build of this site logs fourteen of these:

```
SecretsUsedInArgOrEnv: Do not use ARG or ENV instructions for sensitive data
  (ARG "NEXTAUTH_SECRET") … (ARG "PESAPAL_CONSUMER_SECRET") … (ARG "EGOSMS_PASSWORD")
```

This is not coming from `Dockerfile` — it contains no `ARG` lines at all. It is **Coolify**
passing environment variables into the build as build arguments, which it does for every variable
marked as a *Build Variable*. Build arguments are written into the image's layer metadata, so
anyone who can read the image can read the secrets: `docker history`, a pull from the registry,
or anyone who later gets a copy of that image.

These secrets are not needed at build time. `scripts/docker-entrypoint.sh` reads them when the
container **starts**, from the host environment.

**The fix is in Coolify, not in the repo:** open the application → Environment Variables, and for
each secret clear the *Build Variable* / *Available at build time* checkbox. Leave it ticked only
for variables genuinely needed while compiling (this site needs none of the secrets). Redeploy,
and the warnings go.

Then rotate anything that has already been through a build — the old images still carry it.

## Why uploads are on the server rather than Vercel Blob

The upload code supports both: with `BLOB_READ_WRITE_TOKEN` set it uploads to Vercel Blob,
otherwise it writes under `UPLOAD_DIR`. The site now uses the local path, because:

- It keeps everything on one host, with one bill and one place to look when something breaks.
- An external storage account is one more thing that can suspend you and take the site's images
  with it — which is exactly what happened with the database.
- There is no egress cost and no second vendor to configure.

The trade is that **the files are only as safe as this server**, which is why step 3 archives the
uploads volume alongside the database. If you later want a CDN or offsite durability more than
simplicity, setting `BLOB_READ_WRITE_TOKEN` switches the behaviour back with no code change.

**`UPLOAD_DIR` needs a volume.** Set `UPLOAD_DIR=/data/uploads` and mount persistent storage
there. Without it, every uploaded photo is lost on the next deploy — the container filesystem is
replaced each time.
