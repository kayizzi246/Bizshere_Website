/**
 * Applies pending database migrations during a Vercel build, so the online database always
 * has the columns the new code reads. Without it, a schema change that wasn't applied by hand
 * makes every page that touches the new columns fail ("This page didn't load").
 *
 * Runs only on Vercel (VERCEL is set there); local builds are left alone. Uses the direct
 * (unpooled) connection when there is one, because migrations need a session lock that
 * the pooled connection doesn't allow.
 *
 * The database can be briefly out of reach while a build runs: a publish failed with
 * "P1001: Can't reach database server" (7 Nov 2026) and the next push would have gone through.
 * So an unreachable or busy database is tried again, for about a minute and a half, before the
 * build is stopped. Any other failure stops it at once, as before: publishing code the database
 * isn't ready for would break the pages that use it.
 */
import { spawnSync } from "node:child_process";

if (!process.env.VERCEL) {
  console.log("deploy-migrate: not on Vercel, skipping migrations");
  process.exit(0);
}

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("deploy-migrate: DATABASE_URL is not set");
  process.exit(1);
}

// Unreachable, timed out, busy (too many connections), or the migration lock still held by another build
const TRANSIENT = /P1001|P1002|P1017|P2024|P2037|P1008|Can't reach database server|timed out|too many (database )?connections|ECONNRESET|ETIMEDOUT|advisory lock/i;
const WAITS = [5, 10, 15, 20, 30]; // seconds before each further try

for (let attempt = 0; ; attempt++) {
  const run = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    encoding: "utf8",
    shell: process.platform === "win32",
    env: { ...process.env, DATABASE_URL: url },
  });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status === 0) process.exit(0);

  const output = `${run.stdout ?? ""}\n${run.stderr ?? ""}\n${run.error?.message ?? ""}`;
  if (attempt >= WAITS.length || !TRANSIENT.test(output)) {
    console.error(`deploy-migrate: migrations failed${attempt ? ` after ${attempt + 1} tries` : ""}; stopping the build.`);
    process.exit(run.status || 1);
  }
  const wait = WAITS[attempt];
  console.warn(`deploy-migrate: the database didn't answer (try ${attempt + 1} of ${WAITS.length + 1}); trying again in ${wait} s`);
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, wait * 1000);
}
