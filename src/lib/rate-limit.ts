import { headers } from "next/headers";
import { prisma } from "./prisma";

/**
 * Rate limits that hold across serverless instances: counters live in the database (rate_limits),
 * one row per key and time window, bumped in a single statement so bursts can't slip through.
 * Expired rows are cleared by the daily job (src/lib/jobs.ts).
 *
 *   if (!(await allow(`sms:ip:${await clientIp()}`, 10, 3600))) return "Too many requests…";
 */
export async function allow(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "rate_limits" ("key", "count", "resetAt")
    VALUES (${key}, 1, NOW() + make_interval(secs => ${windowSeconds}))
    ON CONFLICT ("key") DO UPDATE SET
      "count"   = CASE WHEN "rate_limits"."resetAt" <= NOW() THEN 1 ELSE "rate_limits"."count" + 1 END,
      "resetAt" = CASE WHEN "rate_limits"."resetAt" <= NOW() THEN EXCLUDED."resetAt" ELSE "rate_limits"."resetAt" END
    RETURNING "count"`;
  return Number(rows[0]?.count ?? 0) <= max;
}

/**
 * The visitor's IP address. On Vercel the first x-forwarded-for entry is set by Vercel itself and
 * can't be faked by the visitor. Outside a request (scripts, jobs) or locally: "local".
 */
export async function clientIp(): Promise<string> {
  try {
    const h = headers();
    return ipFrom((name) => h.get(name));
  } catch {
    return "local";
  }
}

/** Same, from a plain header lookup (NextAuth's authorize() gets the request headers this way). */
export function ipFrom(get: (name: string) => string | null | undefined): string {
  const forwarded = get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || get("x-real-ip") || "local").slice(0, 64);
}

/** The limits, in one place. Windows are in seconds. */
export const LIMITS = {
  /** Sign-in and PIN-reset codes texted from one IP address (stops SMS pumping through many numbers). */
  smsPerIp: [10, 3600],
  /** All sign-in codes the site texts, together: a ceiling that protects the SMS credit. */
  smsAll: [300, 3600],
  /** Password, PIN and code sign-in attempts from one IP address. */
  loginPerIp: [30, 900],
  /** Forgotten staff passwords asked for from one IP address. */
  staffResetPerIp: [10, 3600],
  /** Staff log-in tries from one IP address (the first step, before the password check). */
  staffLoginPerIp: [60, 900],
  /** Current-password checks in My account, per team member. */
  accountPerUser: [10, 900],
  /** Payment orders one person can start (each one is a Pesapal order). */
  checkoutPerUser: [10, 600],
  /** Correction reports from one IP address. */
  correctionsPerIp: [5, 3600],
  /** Chat messages one person can send a minute. */
  forumMessagePerUser: [20, 60],
  /** New forum topics one person can start an hour. */
  forumTopicPerUser: [5, 3600],
  /** Remarks under tips one person can add in 10 minutes. */
  tipRemarkPerUser: [10, 600],
} as const satisfies Record<string, readonly [number, number]>;
