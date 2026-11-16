# Keeping the server safe, and the data recoverable

The site runs on one VPS. That machine is now the only place the business's data exists, so these
two jobs — keeping other people out, and being able to get the data back — are no longer optional.

Work down this page in order. The first three items are the ones that matter most.

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

`scripts/backup.sh` dumps the database and archives the uploads. Run it nightly from cron:

```
crontab -e
```
```
0 2 * * * cd /path/to/Bizshere_Website && sh scripts/backup.sh >> /var/log/bizsphere-backup.log 2>&1
```

**A backup on the same machine is not a backup.** If the VPS is lost, so are they. Copy them off
— to another server, to object storage, or to your own computer:

```
0 3 * * * rsync -az /path/to/Bizshere_Website/backups/ user@elsewhere:/backups/bizsphere/
```

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
