import { NextResponse } from "next/server";
import { HOURLY_JOBS, runJobs } from "@/lib/jobs";
import { refuseCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Every hour: the unfinished-payment reminder (src/lib/jobs.ts checkoutRecovery), which only works
 * while the person still remembers trying to pay. The job itself sends nothing outside 07:00–21:00
 * in Kampala, so this can run around the clock. Without the matching CRON_SECRET the request is refused.
 */
export async function GET(req: Request) {
  const refused = refuseCron(req);
  if (refused) return refused;
  try {
    const results = await runJobs(HOURLY_JOBS);
    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
