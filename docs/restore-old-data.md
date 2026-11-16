# The old Prisma Postgres database

**Decision, 16 Nov 2026: the data in the old database was abandoned, not recovered.** It was
mostly test content from a site that spent most of its life crash-looping, and unlocking it was
not worth the cost. The live site runs on the Postgres container in `docker-compose.prod.yml` and
was seeded fresh with `npm run db:seed:production`. This page is kept as the record of why.

## What actually happened

The site was down for a day with `prisma migrate deploy` failing on:

```
Error: P1001  Can't reach database server at `db.prisma.io:5432`
```

That message says "can't reach", so it reads like a firewall or a wrong host — and it was chased
that way for a long time, across two hosting providers. It was neither. Connecting with a plain
Postgres driver gave the real answer:

```
Failed to identify your database: Your account has restrictions: planLimitReached.
Please contact Prisma support to resolve account restrictions.
```

The TCP connection and the TLS handshake both succeeded. Prisma Postgres was **refusing to
authenticate** because the account had hit a Free-plan ceiling (200,000 operations a month, 2 GB
storage). The Free plan is a hard cap: nothing is billed, access simply stops. It would have
failed from any network, which is why moving the app between hosts never helped.

The crash loop probably made it worse: every container restart ran `prisma migrate deploy`, and
the container restarted roughly once a minute for days.

## What to take from it

- **`P1001` does not mean "network problem".** It is Prisma's generic message for a refused
  connection, including when the refusal is about your account. Test with a plain Postgres client
  before concluding anything about firewalls — the real error is usually in that reply.
- **A free tier that hard-caps database access does not belong under a production site.** The
  failure is total, gives no warning in the application logs, and looks like an infrastructure
  fault.
- The database now runs beside the app as a container, so there is no external service that can
  lock the site out of its own data.

## If you ever do want it back

The data still exists in Prisma Postgres. Upgrading the account (Starter was $10/month, which
also adds backups) lifts the restriction and makes it readable again. Then take a dump from any
machine — the network was never the obstacle:

```
pg_dump "postgres://USER:PASSWORD@db.prisma.io:5432/postgres?sslmode=require" \
  --no-owner --no-privileges -Fc -f bizsphere.dump
```

Use PostgreSQL client **17**; an 18+ `pg_dump` writes an archive Prisma Postgres cannot read back.

Copy the file to the server and load it with:

```
sh scripts/restore-dump.sh bizsphere.dump
```

That script refuses to run if the database already holds content items or payments, so it will
not overwrite anything entered since the site came back. By now it almost certainly would —
which is the other reason this was a now-or-never decision.
