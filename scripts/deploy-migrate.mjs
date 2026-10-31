/**
 * Applies pending database migrations during a Vercel build, so the online database always
 * has the columns the new code reads. Without it, a schema change that wasn't applied by hand
 * makes every page that touches the new columns fail ("This page didn't load").
 *
 * Runs only on Vercel (VERCEL is set there); local builds are left alone. Uses the direct
 * (unpooled) Neon connection when there is one, because migrations need a session lock that
 * the pooled connection doesn't allow.
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

const run = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, DATABASE_URL: url },
});
process.exit(run.status ?? 1);
