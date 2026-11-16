# Recovering the data from Prisma Postgres

The site's old data is still in the Prisma Postgres database at `db.prisma.io`. Nothing was
deleted — the server simply cannot open a connection to it, which is why the site was moved to a
Postgres running beside the app.

To get the data across you need **one machine with a route to port 5432 on `db.prisma.io`**. The
VPS does not have one, and many home and office networks block outbound 5432 as well.

## 1. Check the Console first

Sign in at [console.prisma.io](https://console.prisma.io) and open your database's **Backups**
tab. On paid plans Prisma takes daily snapshots (on days the database saw activity) and can
restore them from the Console. That is worth knowing about before you touch anything: if the data
you want is in a snapshot, restore it there first, then dump from the restored state.

## 2. Find a machine that can reach the database

Try, in order:

1. **Your own computer, on a different network.** A mobile hotspot often works where home
   broadband does not. Test it before installing anything:
   ```
   pg_isready -h db.prisma.io -p 5432
   ```
2. **A cloud shell.** [Google Cloud Shell](https://shell.cloud.google.com) and GitHub Codespaces
   both have `pg_dump` installed and unrestricted outbound networking, and both are free for this
   amount of use. This is usually the quickest route.

You need PostgreSQL **client version 17** — Prisma Postgres runs on 17, and a newer `pg_dump`
(18+) produces an archive it will not read back.

## 3. Take the dump

```
pg_dump "postgres://USER:PASSWORD@db.prisma.io:5432/postgres?sslmode=require" \
  --no-owner --no-privileges -Fc -f bizsphere.dump
```

Use the connection string from the Prisma Console. `-Fc` is the custom format that
`scripts/restore-dump.sh` expects.

Check the file is not empty — a few hundred KB at least:
```
ls -lh bizsphere.dump
```

## 4. Copy it to the server

```
scp bizsphere.dump root@161.97.109.77:/path/to/Bizshere_Website/
```

## 5. Restore

On the server, in the directory holding `docker-compose.prod.yml`:

```
sh scripts/restore-dump.sh bizsphere.dump
```

The script refuses to run if the database already holds content items or payments, so it cannot
quietly overwrite work entered since the site came back. If you do want the dump's version
instead, it prints the command to empty the database first.

Afterwards it runs `prisma migrate deploy`, so the restored schema is brought up to date with the
code.

## 6. Check your sign-in

If the dump contains its own admin user, the one created by `npm run db:seed:production` may have
been replaced. Sign in at `/staff/<ADMIN_LOGIN_KEY>` with the **old** credentials. If neither
works, re-run the seed — it upserts, so it will recreate the admin without disturbing the rest.

## If none of this is possible

If no machine you have can reach `db.prisma.io:5432`, open a support request with Prisma from the
Console and ask for an export of the database. The data is theirs to hand over; it is only the
network path that is blocked.

## Worth deciding first

If the Prisma Postgres database only ever held test records — the site was crash-looping for most
of its life there — this whole exercise may not be worth it. Check what is actually in it before
spending time on the recovery.
