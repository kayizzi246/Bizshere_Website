import { Briefcase, FileText, Link2 } from "lucide-react";

type Work = {
  id: string;
  title: string;
  clientName: string | null;
  year: number | null;
  summary: string | null;
  outcome: string | null;
  imageUrl: string | null;
  fileUrl: string | null;
  linkUrl: string | null;
  isCaseStudy: boolean;
};

/**
 * "Work and case studies" on an expert's page: the projects the team approved (publication
 * permitted), each with its photo, client and year, what was done, the result, and the file and
 * link the expert added. Nothing approved yet: nothing shown.
 */
export function ExpertWork({ work }: { work: Work[] }) {
  if (!work.length) return null;
  return (
    <section id="work" className="flex scroll-mt-24 flex-col gap-3">
      <h2 className="font-display text-lg font-extrabold text-heading">Work and case studies</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {work.map((w) => (
          <li key={w.id} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
            {w.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- uploaded by the expert, checked by the team
              <img src={w.imageUrl} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" />
            ) : null}
            <div className="flex flex-1 flex-col gap-1.5 p-4">
              <span className="flex items-start gap-2">
                {w.imageUrl ? null : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand"><Briefcase aria-hidden className="h-4 w-4" /></span>}
                <span className="flex min-w-0 flex-col">
                  <span className="font-display text-[15px] font-bold leading-snug text-heading">{w.title}</span>
                  {w.clientName || w.year || w.isCaseStudy ? <span className="text-[12px] text-ink-muted">{[w.isCaseStudy ? "Case study" : null, w.clientName, w.year].filter(Boolean).join(" · ")}</span> : null}
                </span>
              </span>
              {w.summary ? <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">{w.summary}</p> : null}
              {w.outcome ? <p className="text-[13px] text-ink-soft"><span className="font-semibold text-heading">Result:</span> {w.outcome}</p> : null}
              {w.fileUrl || w.linkUrl ? (
                <span className="mt-auto flex flex-wrap gap-4 pt-1 text-[13px] font-semibold">
                  {w.fileUrl ? <a href={w.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5"><FileText aria-hidden className="h-4 w-4" />Open the file</a> : null}
                  {w.linkUrl ? <a href={w.linkUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5"><Link2 aria-hidden className="h-4 w-4" />View online</a> : null}
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
