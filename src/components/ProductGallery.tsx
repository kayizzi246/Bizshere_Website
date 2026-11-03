"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { Icon } from "./Icon";
import { YouTubePlayer } from "./YouTubePlayer";

export type GalleryImage = { src: string; alt: string; credit?: string | null };
/** A video in the gallery: a YouTube id, a direct video file, or any other link. */
export type GalleryVideo = { label: string; href: string; youtubeId?: string | null };

type Slide = ({ kind: "image" } & GalleryImage) | ({ kind: "video" } & GalleryVideo);

const isFile = (href: string) => /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(href);

/**
 * Product-page gallery (RecordPage layout="product"): one large slot and a row of thumbnails
 * underneath. Photos and videos share the slot: tapping a video thumbnail plays it right there
 * (YouTube in its player, video files with the browser's controls), never on another page.
 * Without any photo it shows a plain panel with the directory icon.
 */
export function ProductGallery({ images, videos = [], icon }: { images: GalleryImage[]; videos?: GalleryVideo[]; icon: string }) {
  const slides: Slide[] = [...images.map((i) => ({ kind: "image" as const, ...i })), ...videos.map((v) => ({ kind: "video" as const, ...v }))];
  const [current, setCurrent] = useState(0);
  const shown = slides[current];

  return (
    <div className="flex flex-col gap-2.5">
      <figure className="flex flex-col gap-1">
        <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-line bg-page">
          {!shown ? (
            <Icon name={icon} className="h-16 w-16 text-brand/40" strokeWidth={1.25} />
          ) : shown.kind === "image" ? (
            // Editor-entered addresses; no Next image domain list to maintain.
            // eslint-disable-next-line @next/next/no-img-element
            <img key={shown.src} src={shown.src} alt={shown.alt} className="h-full w-full object-cover" />
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
          {slides.length > 1 && shown?.kind === "image" ? (
            <span className="absolute bottom-3 right-3 rounded-full bg-heading/75 px-2.5 py-1 text-[11px] font-semibold text-white">{current + 1} / {slides.length}</span>
          ) : null}
        </div>
        {shown?.kind === "image" && shown.credit ? <figcaption className="text-[11px] text-ink-muted">{shown.credit}</figcaption> : null}
      </figure>

      {slides.length > 1 ? (
        <ul className="flex flex-wrap gap-2">
          {slides.map((s, n) => (
            <li key={s.kind === "image" ? s.src : s.href}>
              <button type="button" onClick={() => setCurrent(n)} aria-pressed={n === current}
                aria-label={s.kind === "image" ? `Show photo ${n + 1}` : `Play ${s.label.toLowerCase()}`}
                className={`relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border-2 bg-white transition sm:h-16 sm:w-16 ${n === current ? "border-brand" : "border-line hover:border-brand/50"}`}>
                {s.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.src} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <>
                    {s.youtubeId ? (
                      // eslint-disable-next-line @next/next/no-img-element -- YouTube thumbnail
                      <img src={`https://i.ytimg.com/vi/${s.youtubeId}/mqdefault.jpg`} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                    ) : <span className="absolute inset-0 bg-brand-tint" />}
                    <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white"><Play className="ml-0.5 h-3.5 w-3.5 fill-current" /></span>
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
