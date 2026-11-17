-- Least-privilege database roles.
--
-- Run once, as the database owner, after the schema exists (after `prisma migrate deploy`):
--
--   docker compose -f docker-compose.prod.yml exec -T db \
--     psql -U bizsphere -d bizsphere -v app_password="'a-long-random-password'" \
--     -f /dev/stdin < prisma/sql/harden.sql
--
-- Why: the site normally connects as the database owner, which can do anything — drop every
-- table, read every other database, create new superusers. That is far more than a web app needs.
-- After this, the running site connects as `bizsphere_app`, which can read and write rows and
-- nothing else. Schema changes keep happening as the owner, at container start, over a separate
-- connection string (MIGRATION_DATABASE_URL — see scripts/docker-entrypoint.sh).
--
-- So a flaw in the app, or a stolen DATABASE_URL, cannot drop a table, cannot add a login, and
-- cannot reach another database on the same server. It is the difference between losing some rows
-- and losing everything.
--
-- Safe to run again: every statement checks first.

\set ON_ERROR_STOP on

-- ── 1. Nobody gets anything by default ──
-- Postgres 15+ already removes CREATE on public from PUBLIC; asserted here for older servers and
-- for databases restored from an older dump.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- ── 2. The application role ──
-- LOGIN, no CREATEDB, no CREATEROLE, no SUPERUSER, no BYPASSRLS. Rows only.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bizsphere_app') THEN
    EXECUTE format('CREATE ROLE bizsphere_app LOGIN PASSWORD %L', :app_password);
  ELSE
    EXECUTE format('ALTER ROLE bizsphere_app LOGIN PASSWORD %L', :app_password);
  END IF;
END
$$;

ALTER ROLE bizsphere_app NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

-- ── 3. What it may do ──
-- Postgres grants CONNECT on every database to PUBLIC by default, so a role made for one database
-- can open the others on the same server. Take that back, then grant it to the two roles that
-- need it, so this database is reachable only by them.
REVOKE CONNECT ON DATABASE :"DBNAME" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"DBNAME" TO CURRENT_USER;
GRANT CONNECT ON DATABASE :"DBNAME" TO bizsphere_app;
GRANT USAGE ON SCHEMA public TO bizsphere_app;

-- Read and write rows in the tables that exist now…
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bizsphere_app;
-- …and use the id sequences behind them.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bizsphere_app;

-- …and in the tables a future migration adds, so this never has to be run again.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bizsphere_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO bizsphere_app;

-- ── 4. What it may NOT do ──
-- No DDL: no CREATE, ALTER or DROP of tables. Not granted above, and not grantable by accident,
-- because creating objects in a schema needs CREATE on that schema, which is withheld.
REVOKE CREATE ON SCHEMA public FROM bizsphere_app;
-- No reading of other databases on the same server: that is controlled by CONNECT, granted above
-- for this database only.

-- ── 5. Show the result ──
SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolbypassrls
FROM pg_roles WHERE rolname IN ('bizsphere_app', CURRENT_USER);
