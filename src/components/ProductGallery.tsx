"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Expand, Play, X } from "lucide-react";
import { Icon } from "./Icon";
import { YouTubePlayer } from "./YouTubePlayer";

/**
 * A photo in the gallery. `label` and `href`: a photo of something linked to this page (e.g. the
 * machine a business idea needs), named on the photo and opening that page.
 */
export type GalleryImage = { src: string; alt: string; credit?: string | null; label?: string | null; href?: string | null };
/** A video in the gallery: a YouTube id, a direct video file, or any other link. */
export type GalleryVideo = { label: string; href: string; youtubeId?: string | null };

type Slide = ({ kind: "image" } & GalleryImage) | ({ kind: "video" } & GalleryVideo);

const isFile = (href: string) => /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(href);

/**
 * Detail-page gallery (business ideas, directory records, supplier products): one large slot with
 * arrows, swipe on phones and a counter, a scrolling row of thumbnails underneath, and a full-screen
 * view on tap. Photos and videos share the slot: a video plays right there (YouTube in its player,
 * video files with the browser's controls), never on another page. Without any photo it shows a
 * plain panel with the directory icon.
 *
 * `shop` (supplier products; client, 11 Nov 2026: "show images well, like an e-commerce site"): a square
 * white slot where the whole photo shows (nothing cropped), thumbnails in a column beside it on wide
 * screens, and a close-up that follows the mouse when pointing at the photo.
 */
export function ProductGallery({ images, videos = [], icon, shop = false }: { images: GalleryImage[]; videos?: GalleryVideo[]; icon: string; shop?: boolean }) {
  const slides: Slide[] = [...images.map((i) => ({ kind: "image" as const, ...i })), ...videos.map((v) => ({ kind: "video" as const, ...v }))];
  const [current, setCurrent] = useState(0);
  const [full, setFull] = useState(false);
  const shown = slides[current];
  const many = slides.length > 1;
  // Shop close-up: where the mouse is on the photo, as a percentage (null when not pointing at it)
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!shop || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };
  const go = useCallback((step: number) => setCurrent((c) => (c + step + slides.length) % slides.length), [slides.length]);

  // Swipe left or right on the main photo (phones)
  const start = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { start.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (start.current === null || !many) return;
    const dx = e.changedTouches[0].clientX - start.current;
    start.current = null;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  };

  // Keep the picked thumbnail in view in the scrolling row. Only the row scrolls, sideways, and only
  // after a change: scrollIntoView would also scroll the whole page, even on load.
  const thumbs = useRef<HTMLUListElement>(null);
  const moved = useRef(false);
  useEffect(() => {
    if (!moved.current) { moved.current = true; return; }
    const row = thumbs.current;
    const el = row?.children[current] as HTMLElement | undefined;
    if (!row || !el) return;
    const left = el.offsetLeft - row.offsetLeft;
    if (left < row.scrollLeft) row.scrollTo({ left, behavior: "smooth" });
    else if (left + el.offsetWidth > row.scrollLeft + row.clientWidth) row.scrollTo({ left: left + el.offsetWidth - row.clientWidth, behavior: "smooth" });
  }, [current]);

  const arrow = (dir: -1 | 1, big = false) => (
    <button type="button" onClick={(e) => { e.stopPropagation(); go(dir); }} aria-label={dir < 0 ? "Previous photo" : "Next photo"}
      className={`absolute top-1/2 z-10 flex -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-heading shadow-sm ring-1 ring-black/5 transition hover:bg-white ${big ? "h-12 w-12" : "h-9 w-9 opacity-90 [@media(hover:hover)]:opacity-0 group-hover:opacity-100"} ${dir < 0 ? (big ? "left-4" : "left-2.5") : big ? "right-4" : "right-2.5"}`}>
      {dir < 0 ? <ChevronLeft aria-hidden className="h-5 w-5" /> : <ChevronRight aria-hidden className="h-5 w-5" />}
    </button>
  );

  return (
    <div className={shop ? "flex flex-col gap-3 md:flex-row-reverse md:items-start" : "flex flex-col gap-3"}>
      <figure className={`flex flex-col gap-1.5 ${shop ? "min-w-0 md:flex-1" : ""}`}>
        <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
          className={`group relative flex items-center justify-center overflow-hidden rounded-2xl border border-line ${shop ? "aspect-square bg-white" : "aspect-[4/3] bg-page"}`}>
          {!shown ? (
            <Icon name={icon} className="h-16 w-16 text-brand/40" strokeWidth={1.25} />
          ) : shown.kind === "image" ? (
            <button type="button" onClick={() => setFull(true)} aria-label="View photo full screen" className="absolute inset-0 cursor-zoom-in"
              onMouseMove={onMove} onMouseLeave={() => setZoom(null)}>
              {/* Editor-entered addresses; no Next image domain list to maintain. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img key={shown.src} src={shown.src} alt={shown.alt}
                style={zoom ? { transform: "scale(2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
                className={`gallery-fade h-full w-full ${shop ? "object-contain p-3 transition-transform duration-150 sm:p-5" : "object-cover"}`} />
            </button>
          ) : shown.youtubeId ? (
            <div key={shown.href} className="absolute inset-0 bg-black"><YouTubePlayer id={shown.youtubeId} title={shown.label} live={false} /></div>
          ) : isFile(shown.href) ? (
            <video key={shown.href} src={shown.href} controls autoPlay playsInline className="h-full w-full bg-black object-contain" />
          ) : (
            // A page we can't play here (not YouTube or a video file): say so, with a way to open it.
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white"><Play className="ml-0.5 h-6 w-6 fill-current" /></span>
              <p className="text-sm text-ink-soft">This video is on another website.</p>
              <a href={shown.href} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark hover:text-white">Watch on that site ↗</a>
            </div>
          )}

          {shown?.kind === "image" ? (
            <>
              {shop ? null : <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />}
              {shown.label ? (
                shown.href ? (
                  <Link href={shown.href} className="absolute bottom-3 left-3 z-10 inline-flex max-w-[70%] items-center gap-1 truncate rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-bold text-heading hover:text-brand">{shown.label} <span aria-hidden>→</span></Link>
                ) : <span className="absolute bottom-3 left-3 z-10 max-w-[70%] truncate rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-bold text-heading">{shown.label}</span>
              ) : null}
              <span className="pointer-events-none absolute bottom-3 right-3 z-10 flex items-center gap-1.5">
                {many ? <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${shop ? "bg-white text-heading shadow-sm ring-1 ring-black/5" : "bg-black/60 text-white"}`}>{current + 1} / {slides.length}</span> : null}
                <span className={`flex h-7 w-7 items-center justify-center rounded-full ${shop ? "bg-white text-heading shadow-sm ring-1 ring-black/5" : "bg-black/60 text-white"}`}><Expand aria-hidden className="h-3.5 w-3.5" /></span>
              </span>
            </>
          ) : null}
          {many ? <>{arrow(-1)}{arrow(1)}</> : null}
        </div>
        {shown?.kind === "image" && shown.credit ? <figcaption className="text-[11px] text-ink-muted">{shown.credit}</figcaption> : null}
      </figure>

      {many ? (
        <ul ref={thumbs} className={`-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${shop ? "md:mx-0 md:max-h-[560px] md:w-[84px] md:shrink-0 md:flex-col md:overflow-y-auto md:overflow-x-visible md:px-0 md:pb-0 md:pt-0.5" : ""}`}>
          {slides.map((s, n) => (
            <li key={s.kind === "image" ? s.src : s.href} className="snap-start">
              <button type="button" onClick={() => setCurrent(n)} aria-pressed={n === current}
                aria-label={s.kind === "image" ? `Show photo ${n + 1}${s.label ? `: ${s.label}` : ""}` : `Play ${s.label.toLowerCase()}`}
                className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white transition ${shop ? "h-[72px] w-[72px] md:h-20 md:w-20" : "h-16 w-20 sm:h-[72px] sm:w-24"} ${n === current ? "ring-2 ring-brand ring-offset-2" : "opacity-75 ring-1 ring-line hover:opacity-100"}`}
                  onMouseEnter={shop ? () => setCurrent(n) : undefined}>
                {s.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.src} alt="" loading="lazy" className={`h-full w-full ${shop ? "object-contain p-1" : "object-cover"}`} />
                ) : (
                  <>
                    {s.youtubeId ? (
                      // eslint-disable-next-line @next/next/no-img-element -- YouTube thumbnail
                      <img src={`https://i.ytimg.com/vi/${s.youtubeId}/mqdefault.jpg`} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                    ) : <span className="absolute inset-0 bg-brand-tint" />}
                    <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white"><Play className="ml-0.5 h-3.5 w-3.5 fill-current" /></span>
                  </>
                )}
                {s.kind === "image" && s.label ? <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1 py-0.5 text-[9px] font-semibold text-white">{s.label.replace(/^.*?·\s*/, "")}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {full && shown?.kind === "image" ? <Lightbox slide={shown} index={current} count={slides.length} onStep={many ? go : null} onClose={() => setFull(false)} /> : null}
    </div>
  );
}

/** The photo full screen: arrows (and ← → keys) through the photos, × or Escape to close. */
function Lightbox({ slide, index, count, onStep, onClose }: { slide: GalleryImage; index: number; count: number; onStep: ((n: number) => void) | null; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (onStep && e.key === "ArrowRight") onStep(1);
      else if (onStep && e.key === "ArrowLeft") onStep(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose, onStep]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Photo" className="fixed inset-0 z-[85] flex flex-col bg-black/95 text-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="text-[13px] text-white/70">{count > 1 ? `${index + 1} / ${count}` : ""}</span>
        <button type="button" onClick={onClose} aria-label="Close" autoFocus className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><X aria-hidden className="h-5 w-5" /></button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={slide.src} src={slide.src} alt={slide.alt} className="gallery-fade max-h-full max-w-full rounded-lg object-contain" />
        {onStep ? (
          <>
            <button type="button" onClick={() => onStep(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><ChevronLeft aria-hidden className="h-6 w-6" /></button>
            <button type="button" onClick={() => onStep(1)} aria-label="Next photo" className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><ChevronRight aria-hidden className="h-6 w-6" /></button>
          </>
        ) : null}
      </div>
      <div className="flex flex-col items-center gap-1 px-4 py-4 text-center">
        {slide.label ? (slide.href ? <Link href={slide.href} onClick={onClose} className="text-[14px] font-bold text-white hover:text-accent">{slide.label} →</Link> : <span className="text-[14px] font-bold">{slide.label}</span>) : null}
        {slide.credit ? <span className="text-[11px] text-white/60">{slide.credit}</span> : null}
      </div>
    </div>
  );
}
