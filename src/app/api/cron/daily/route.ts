import { NextResponse } from "next/server";
import { runJobs } from "@/lib/jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily jobs for Vercel Cron (schedule in vercel.json). Vercel sends
 * `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set in the project's
 * environment variables. Without a matching secret the request is refused.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const results = await runJobs();
    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
