import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { contentTypeLabel, date, itemHref } from "@/lib/format";
import { decideCorrection } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Corrections" };

export default async function CorrectionsAdminPage({ searchParams }: { searchParams: { status?: string } }) {
  const status = searchParams.status === "done" ? "done" : "open";
  const reports = await prisma.correctionReport.findMany({
    where: status === "open" ? { status: "PENDING" } : { status: { not: "PENDING" } },
    include: { contentItem: true, reporter: { select: { name: true, email: true } }, decidedBy: { select: { name: true } } },
    orderBy: { createdAt: status === "open" ? "asc" : "desc" },
    take: 100,
  });
  return (
    <>
      <div><h1 className="text-3xl font-extrabold tracking-tight">Correction reports</h1><p className="text-sm text-ink-muted">Reports from readers. Check each against the source before changing the page. Accepting marks the page as due for review now.</p></div>
      <div className="flex gap-2">
        {[["open", "Open"], ["done", "Decided"]].map(([s, l]) => <Link key={s} href={`?status=${s}`} className={`rounded-full px-3.5 py-2 text-sm font-bold ${status === s ? "bg-ink text-white hover:text-white" : "border border-line-strong bg-white text-ink-soft"}`}>{l}</Link>)}
      </div>
      {reports.length === 0 ? <p className="card p-6 text-sm text-ink-muted">Nothing here.</p> : reports.map((r) => (
        <article key={r.id} className="card flex flex-col gap-3 p-5">
          <div className="flex flex-wrap justify-between gap-2">
            <span className="flex flex-col">
              <Link href={`/admin/content/${r.contentItemId}`} className="font-extrabold">{r.contentItem.title}</Link>
              <span className="text-xs text-ink-muted">{contentTypeLabel[r.contentItem.contentType]} · <Link href={itemHref(r.contentItem)} target="_blank">view page ↗</Link></span>
            </span>
            <span className="text-xs text-ink-muted">{date(r.createdAt)} · {r.reporter?.name ?? r.reporterEmail ?? "Anonymous"}</span>
          </div>
          <p className="whitespace-pre-line rounded-xl bg-page p-4 text-sm">{r.message}</p>
          {r.status === "PENDING" ? (
            <form action={decideCorrection} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={r.id} />
              <label className="label flex-[1_1_320px]">Note (sent to the reporter if signed in)<input name="note" className="input" /></label>
              <button name="decision" value="APPROVED" className="btn-primary">Accept</button>
              <button name="decision" value="REJECTED" className="btn-outline">Reject</button>
            </form>
          ) : (
            <span className="text-sm text-ink-muted">{r.status.toLowerCase()} by {r.decidedBy?.name ?? "—"} on {date(r.decidedAt)}{r.decisionNote ? ` · ${r.decisionNote}` : ""}</span>
          )}
        </article>
      ))}
    </>
  );
}
