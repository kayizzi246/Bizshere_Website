/**
 * Daily jobs from the command line (the same jobs Vercel Cron runs via /api/cron/daily).
 *
 *   npm run jobs            run everything
 *   npm run jobs -- rounds  run one job by name
 */
import { existsSync } from "node:fs";

// Load .env when present (servers usually set variables directly instead).
if (existsSync(".env")) process.loadEnvFile(".env");

async function main() {
  const { runJobs } = await import("../src/lib/jobs");
  const { prisma } = await import("../src/lib/prisma");
  try {
    for (const r of await runJobs(process.argv.slice(2))) console.log(r);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
