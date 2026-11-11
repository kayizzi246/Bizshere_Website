import Link from "next/link";
import { BookOpen, FileDown, FileText, LockKeyhole } from "lucide-react";
import { PdfOpenButton, PdfReader } from "./PdfViewer";

/**
 * A guide's PDF read right on its page (/guides/[slug]/file serves it from our own address),
 * with Read here (full screen, on phones too) and Download. Visitors who may not download it
 * get a locked panel instead.
 */
export function GuideViewer({ file, title, locked, back }: { file: string; title: string; locked: boolean; back: string }) {
  const download = `${file}?download=1`;
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 font-display text-lg font-extrabold text-heading"><FileText aria-hidden className="h-5 w-5 text-brand" />Read the guide</h2>
        {!locked ? (
          <span className="flex gap-2">
            <PdfOpenButton file={file} download={download} title={title} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-[13px] font-semibold text-heading hover:border-brand hover:text-brand"><BookOpen aria-hidden className="h-3.5 w-3.5" />Full screen</PdfOpenButton>
            <a href={download} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-[13px] font-semibold text-white hover:bg-brand-dark hover:text-white"><FileDown aria-hidden className="h-3.5 w-3.5" />Download</a>
          </span>
        ) : null}
      </div>
      {locked ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line-strong bg-page px-5 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-tint text-brand"><LockKeyhole aria-hidden className="h-5 w-5" /></span>
          <p className="max-w-sm text-sm text-ink-soft">Members can read this guide here and download it.</p>
          <Link href={back} data-onboard="" className="btn-primary min-h-[44px] px-5 text-sm">Unlock the guide</Link>
        </div>
      ) : <PdfReader file={file} download={download} title={title} what="guide" />}
    </section>
  );
}
