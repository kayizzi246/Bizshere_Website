import Link from "next/link";
import { Check, FileText, Link2, X } from "lucide-react";
import { requireArea } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { date } from "@/lib/format";
import { reviewExpertWork } from "@/app/actions/expert";

export const dynamic = "force-dynamic";
export const metadata = { title: "Expert work" };

/**
 * Work experts added or changed in their portal (/expert). It shows on the expert's page only
 * once approved here. Approving also marks it "publication permitted".
 */
export default async function ExpertWorkPage({ searchParams }: { searchParams: { done?: string } }) {
  await requireArea("experts");
  const waiting = await prisma.consultantProject.findMany({
    where: { status: "IN_REVIEW" },
    include: { consultant: { select: { fullName: true, contentItem: { select: { slug: true } } } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-heading">Expert work</h1>
        <p className="text-sm text-ink-muted">Projects, reports and case studies experts added. Check the photo, file and link, then approve to show it on their page.</p>
      </div>
      {searchParams.done ? <p role="status" className="rounded-lg bg-brand-tint px-4 py-2.5 text-sm font-semibold text-brand-dark">Work {searchParams.done}.</p> : null}
      {waiting.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong bg-surface px-5 py-10 text-center text-sm text-ink-muted">Nothing waiting.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {waiting.map((w) => (
            <li key={w.id} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded by the expert */}
              {w.imageUrl ? <img src={w.imageUrl} alt="" className="aspect-[16/9] w-full object-cover" /> : null}
              <div className="flex flex-1 flex-col gap-2 p-4">
                <Link href={`/experts/${w.consultant.contentItem.slug}`} className="text-xs font-semibold">{w.consultant.fullName}</Link>
                <span className="font-bold text-heading">{w.title}</span>
                {w.clientName || w.year ? <span className="text-xs text-ink-muted">{[w.clientName, w.year].filter(Boolean).join(" · ")}</span> : null}
                {w.summary ? <p className="whitespace-pre-line text-sm text-ink-soft">{w.summary}</p> : null}
                {w.outcome ? <p className="text-sm text-ink-soft"><strong>Result:</strong> {w.outcome}</p> : null}
                <span className="flex flex-wrap gap-3 text-[13px] font-semibold">
                  {w.fileUrl ? <a href={w.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1"><FileText aria-hidden className="h-4 w-4" />Open file</a> : null}
                  {w.linkUrl ? <a href={w.linkUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1"><Link2 aria-hidden className="h-4 w-4" />{w.linkUrl.replace(/^https?:\/\//, "").slice(0, 40)}</a> : null}
                </span>
                <span className="text-xs text-ink-muted">Sent {date(w.createdAt)}</span>
                <span className="mt-auto flex gap-2 pt-1">
                  <form action={reviewExpertWork}><input type="hidden" name="id" value={w.id} /><input type="hidden" name="decision" value="approve" />
                    <button className="btn-primary min-h-[40px] gap-1.5 px-4 text-sm"><Check aria-hidden className="h-4 w-4" />Approve</button></form>
                  <form action={reviewExpertWork}><input type="hidden" name="id" value={w.id} /><input type="hidden" name="decision" value="reject" />
                    <button className="btn-outline min-h-[40px] gap-1.5 px-4 text-sm"><X aria-hidden className="h-4 w-4" />Reject</button></form>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
