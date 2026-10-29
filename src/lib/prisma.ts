import { PrismaClient } from "@prisma/client";

/**
 * Connection address with the settings serverless hosting needs. The live site runs on Vercel
 * with a Neon database (docs/08-deploy-to-vercel.md), and two things there fail now and then:
 *   - Neon's pooled address (host "…-pooler…") is PgBouncer: Prisma must be told
 *     (pgbouncer=true), or queries fail with "prepared statement already exists".
 *   - Neon sleeps when idle; waking takes a few seconds, longer than Prisma's default
 *     5-second connect timeout, so the first visit after a quiet spell failed.
 * Settings already in the address are kept; local databases are left as they are.
 */
function databaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return raw;
  try {
    const url = new URL(raw);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return raw;
    const set = (k: string, v: string) => { if (!url.searchParams.has(k)) url.searchParams.set(k, v); };
    if (url.hostname.includes("-pooler") || url.searchParams.get("pgbouncer") === "true") set("pgbouncer", "true");
    set("connect_timeout", "20"); // seconds: room for a sleeping database to wake
    set("pool_timeout", "20"); // seconds to wait for a free connection before failing
    if (process.env.VERCEL) set("connection_limit", "5"); // many small functions share the database
    return url.toString();
  } catch {
    return raw;
  }
}

/**
 * Neon closes connections that sit idle, and a warm Vercel function keeps using them: every query
 * in that request then fails with P1017 "Server has closed the connection" (seen in the live logs,
 * 29 Oct 2026). Prisma replaces a closed connection on the next attempt, so a failed READ is
 * retried after a short pause. Writes are never retried: one might already have been saved.
 */
const RETRY_CODES = new Set(["P1017", "P1001", "P1002", "P2024"]); // closed, unreachable, timed out, pool timeout
const READS = new Set(["findMany", "findFirst", "findFirstOrThrow", "findUnique", "findUniqueOrThrow", "count", "aggregate", "groupBy"]);
// A pool can hold several dead connections at once (one per slot), and each attempt may pick
// another, so allow enough tries to cycle through them: waits of 0.1 s, 0.2 s … about 1.5 s in all.
const ATTEMPTS = 6;

function retryable(e: unknown) {
  const err = e as { code?: string; message?: string };
  return (err.code && RETRY_CODES.has(err.code)) || /Server has closed the connection|Can't reach database server|Connection terminated|kind: Closed/i.test(err.message ?? "");
}

function createClient() {
  return new PrismaClient({
    datasourceUrl: databaseUrl(),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  }).$extends({
    query: {
      async $allOperations({ operation, args, query }) {
        if (!READS.has(operation)) return query(args);
        for (let attempt = 1; ; attempt++) {
          try {
            return await query(args);
          } catch (e) {
            if (attempt >= ATTEMPTS || !retryable(e)) throw e;
            await new Promise((r) => setTimeout(r, 100 * attempt));
          }
        }
      },
    },
  });
}

// One client per server instance (and across hot reloads in development).
const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

export const prisma = globalForPrisma.prisma ?? createClient();

globalForPrisma.prisma = prisma;

/** The client handed to an interactive `prisma.$transaction(async (tx) => …)` callback. */
export type Tx = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">;
