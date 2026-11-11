"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, ExternalLink, FileDown, FileText, Minus, Plus, X } from "lucide-react";

/**
 * Reading a PDF on the site before downloading it, on phones and computers.
 *
 *   <PdfOpenButton>  a button that opens the document in a full-screen reader, with Download in its bar
 *   <PdfReader>      the document shown inside a page (guides, the business plan)
 *
 * Computers show the PDF with the browser's own viewer. Phones and tablets usually can't show a PDF
 * inside a page (they download it instead), so there the pages are drawn by pdf.js, loaded only when
 * a document is opened (public/pdfjs, copied by scripts/copy-pdfjs.mjs). The file must come from our
 * own address (…/file, …/pdf, /api/files/[id]?inline=1): those routes check who may read it.
 */

const PDFJS = "/pdfjs/pdf.min.mjs";
const PDFJS_WORKER = "/pdfjs/pdf.worker.min.mjs";

/** True where the browser shows PDFs inside a page by itself; null until known (on the server). */
function useNativePdf() {
  const [native, setNative] = useState<boolean | null>(null);
  useEffect(() => {
    const builtIn = (navigator as Navigator & { pdfViewerEnabled?: boolean }).pdfViewerEnabled === true;
    setNative(builtIn && window.matchMedia("(min-width: 768px) and (pointer: fine)").matches);
  }, []);
  return native;
}

const withHash = (file: string) => `${file}#view=FitH`;

type PdfPage = { getViewport(o: { scale: number }): { width: number; height: number }; render(o: object): { promise: Promise<void> } };
type PdfDoc = { numPages: number; getPage(n: number): Promise<PdfPage> };

/** The pages of a PDF drawn one under another; each is drawn when it comes near the screen. */
function PdfPages({ file, zoom, fallback }: { file: string; zoom: number; fallback: React.ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const doc = useRef<PdfDoc | null>(null);
  const [info, setInfo] = useState<{ pages: number; ratio: number } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let gone = false;
    let task: { promise: Promise<PdfDoc>; destroy(): Promise<void> } | null = null;
    const end = () => { task?.destroy().catch(() => undefined); task = null; };
    setInfo(null);
    setFailed(false);
    (async () => {
      try {
        const lib = await import(/* webpackIgnore: true */ PDFJS);
        if (gone) return;
        lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        task = lib.getDocument({ url: file, isEvalSupported: false });
        const loaded = await task!.promise;
        if (gone) return end();
        doc.current = loaded;
        const first = (await loaded.getPage(1)).getViewport({ scale: 1 });
        if (!gone) setInfo({ pages: loaded.numPages, ratio: first.width / first.height });
      } catch {
        if (!gone) setFailed(true);
      }
    })();
    return () => { gone = true; doc.current = null; end(); };
  }, [file]);

  // Draw the pages near the screen, one at a time, and let go of the ones far away (phones have little memory).
  useEffect(() => {
    const root = host.current;
    if (!info || !root) return;
    let gone = false;
    let queue = Promise.resolve();
    const draw = async (holder: HTMLElement) => {
      const pdf = doc.current;
      if (gone || !pdf || holder.dataset.near !== "1" || holder.dataset.drawn === String(zoom)) return;
      const page = await pdf.getPage(Number(holder.dataset.page));
      const base = page.getViewport({ scale: 1 });
      const sharp = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: (holder.clientWidth / base.width) * sharp });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.className = "block h-auto w-full";
      await page.render({ canvas, canvasContext: canvas.getContext("2d"), viewport }).promise;
      if (gone) return;
      holder.style.aspectRatio = `${base.width} / ${base.height}`;
      holder.replaceChildren(canvas);
      holder.dataset.drawn = String(zoom);
    };
    const watcher = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const holder = e.target as HTMLElement;
        holder.dataset.near = e.isIntersecting ? "1" : "";
        if (e.isIntersecting) queue = queue.then(() => draw(holder)).catch(() => undefined);
        else if (holder.dataset.drawn) { holder.replaceChildren(); delete holder.dataset.drawn; }
      }
    }, { root: root.closest("[data-pdf-scroll]"), rootMargin: "900px 0px" });
    root.querySelectorAll<HTMLElement>("[data-page]").forEach((el) => watcher.observe(el));
    return () => { gone = true; watcher.disconnect(); };
  }, [info, zoom]);

  if (failed) return <>{fallback}</>;
  if (!info) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 px-6 py-20 text-center text-sm text-white/80">
        <span aria-hidden className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/25 border-t-white" />
        Opening the document…
      </div>
    );
  }
  return (
    <div ref={host} className="mx-auto flex flex-col gap-3 p-3 sm:p-5" style={{ width: `${zoom * 100}%`, maxWidth: zoom === 1 ? 900 : undefined }}>
      {Array.from({ length: info.pages }, (_, n) => (
        <div key={n} data-page={n + 1} aria-label={`Page ${n + 1} of ${info.pages}`} className="w-full overflow-hidden rounded bg-white shadow-[0_2px_12px_rgb(0_0_0/0.35)]" style={{ aspectRatio: String(info.ratio) }} />
      ))}
    </div>
  );
}

/** The full-screen reader: the document, with Download and Close always in view. */
function PdfOverlay({ file, download, title, onClose }: { file: string; download: string; title: string; onClose: () => void }) {
  const native = useNativePdf();
  const [zoom, setZoom] = useState(1);
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // also pauses the page's smooth scrolling (SmoothScroll.tsx)
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    close.current?.focus();
    return () => { document.body.style.overflow = before; window.removeEventListener("keydown", key); };
  }, [onClose]);

  const bar = "inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold";
  const failed = (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-4 px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white"><FileText aria-hidden className="h-5 w-5" /></span>
      <p className="text-sm text-white/85">This document can&apos;t be shown here on this device. Open it in a new tab, or download it.</p>
      <span className="flex flex-wrap justify-center gap-2">
        <a href={file} target="_blank" rel="noopener" className={`${bar} border border-white/30 px-4 text-white hover:bg-white/10 hover:text-white`}><ExternalLink aria-hidden className="h-4 w-4" />Open in a new tab</a>
        <a href={download} className={`${bar} bg-accent px-4 text-ink hover:bg-white hover:text-ink`}><FileDown aria-hidden className="h-4 w-4" />Download</a>
      </span>
    </div>
  );

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[300] flex flex-col bg-[#1B2430]">
      <div className="flex items-center gap-2 border-b border-white/10 bg-navy px-3 py-2 text-white sm:px-4">
        <FileText aria-hidden className="hidden h-5 w-5 shrink-0 text-accent sm:block" />
        <span className="min-w-0 flex-1 truncate font-display text-sm font-bold sm:text-[15px]">{title}</span>
        {native === false ? (
          <span className="flex items-center">
            <button type="button" onClick={() => setZoom((z) => Math.max(1, z - 0.5))} disabled={zoom <= 1} aria-label="Zoom out" className={`${bar} w-10 text-white hover:bg-white/10 disabled:opacity-40`}><Minus aria-hidden className="h-4 w-4" /></button>
            <button type="button" onClick={() => setZoom((z) => Math.min(3, z + 0.5))} disabled={zoom >= 3} aria-label="Zoom in" className={`${bar} w-10 text-white hover:bg-white/10 disabled:opacity-40`}><Plus aria-hidden className="h-4 w-4" /></button>
          </span>
        ) : null}
        <a href={download} className={`${bar} bg-accent px-3 text-ink hover:bg-white hover:text-ink sm:px-4`}><FileDown aria-hidden className="h-4 w-4" />Download</a>
        <button ref={close} type="button" onClick={onClose} aria-label="Close the document" className={`${bar} w-10 text-white hover:bg-white/10`}><X aria-hidden className="h-5 w-5" /></button>
      </div>
      <div data-pdf-scroll="" data-lenis-prevent="" className="min-h-0 flex-1 overflow-auto overscroll-contain">
        {native === null ? null : native
          ? <iframe src={withHash(file)} title={`${title} (PDF)`} className="block h-full w-full border-0 bg-white" />
          : <PdfPages file={file} zoom={zoom} fallback={failed} />}
      </div>
    </div>,
    document.body,
  );
}

/**
 * A button that opens a PDF in the on-site reader. `file` shows the document and `download` saves
 * it; both must be addresses on this site. `className` and the children style it like any button.
 */
export function PdfOpenButton({ file, download, title, className, children }: { file: string; download: string; title: string; className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>{children}</button>
      {open ? <PdfOverlay file={file} download={download} title={title} onClose={close} /> : null}
    </>
  );
}

/**
 * A PDF inside a page. Computers show it right there; phones and tablets get a "Read it here"
 * panel that opens the full-screen reader, as a document is too small to read in a narrow box.
 */
export function PdfReader({ file, download, title, what = "document" }: { file: string; download: string; title: string; what?: string }) {
  const native = useNativePdf();
  const panel = (
    <div className={`flex-col items-center gap-3 rounded-xl border border-line bg-page px-5 py-9 text-center ${native === null ? "flex sm:hidden" : "flex"}`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-tint text-brand"><BookOpen aria-hidden className="h-5 w-5" /></span>
      <p className="max-w-xs text-sm text-ink-soft">Read the {what} here first, then download it if you want to keep it.</p>
      <PdfOpenButton file={file} download={download} title={title} className="btn-primary min-h-[46px] gap-2 px-6 text-sm"><BookOpen aria-hidden className="h-4 w-4" />Read it here</PdfOpenButton>
    </div>
  );
  if (native) return <iframe src={withHash(file)} title={`${title} (PDF)`} loading="lazy" className="h-[760px] w-full rounded-xl border border-line bg-page" />;
  return (
    <>
      {/* Until the browser is known: room for the viewer on wide screens, so the page doesn't jump */}
      {native === null ? <div aria-hidden className="hidden h-[760px] w-full rounded-xl border border-line bg-page sm:block" /> : null}
      {panel}
    </>
  );
}
