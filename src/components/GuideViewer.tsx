import Link from "next/link";
import { ExternalLink, FileDown, FileText, LockKeyhole } from "lucide-react";

/**
 * A guide's PDF read right on its page (/guides/[slug]/file serves it from our own address),
 * with Open and Download. Visitors who may not download it get a locked panel instead.
 * Phones often can't show a PDF inside a page: they get the buttons only.
 */
export function GuideViewer({ file, title, locked, back }: { file: string; title: string; locked: boolean; back: string }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 font-display text-lg font-extrabold text-heading"><FileText aria-hidden className="h-5 w-5 text-brand" />Read the guide</h2>
        {!locked ? (
          <span className="flex gap-2">
            <a href={file} target="_blank" rel="noopener" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-[13px] font-semibold text-heading hover:border-brand hover:text-brand"><ExternalLink aria-hidden className="h-3.5 w-3.5" />Open</a>
            <a href={`${file}?download=1`} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-[13px] font-semibold text-white hover:bg-brand-dark hover:text-white"><FileDown aria-hidden className="h-3.5 w-3.5" />Download</a>
          </span>
        ) : null}
      </div>
      {locked ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line-strong bg-page px-5 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-tint text-brand"><LockKeyhole aria-hidden className="h-5 w-5" /></span>
          <p className="max-w-sm text-sm text-ink-soft">Members can read this guide here and download it.</p>
          <Link href={back} data-onboard="" className="btn-primary min-h-[44px] px-5 text-sm">Unlock the guide</Link>
        </div>
      ) : (
        <>
          <iframe src={`${file}#view=FitH`} title={`${title} (PDF)`} loading="lazy" className="hidden h-[760px] w-full rounded-xl border border-line bg-page sm:block" />
          <p className="text-[13px] text-ink-muted sm:hidden">Tap Open to read the guide, or Download to keep it.</p>
        </>
      )}
    </section>
  );
}
