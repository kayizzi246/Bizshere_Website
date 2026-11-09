import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set in the project's
 * environment variables. Returns the refusal to send back, or null when the request may run.
 */
export function refuseCron(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  // Constant-time comparison, so the secret can't be guessed from response timing.
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const wanted = Buffer.from(`Bearer ${secret}`);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}
