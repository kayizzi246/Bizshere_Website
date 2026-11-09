import { NextResponse } from "next/server";
import { DAYTIME_JOBS, runJobs } from "@/lib/jobs";
import { refuseCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The jobs that text people (saved-search alerts, the weekly digest), at 09:00 Kampala time: 06:00 UTC in
 * vercel.json. Without the matching CRON_SECRET the request is refused.
 */
export async function GET(req: Request) {
  const refused = refuseCron(req);
  if (refused) return refused;
  try {
    const results = await runJobs(DAYTIME_JOBS);
    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
