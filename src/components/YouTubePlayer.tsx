"use client";

import { useState } from "react";
import { Play } from "lucide-react";

/**
 * Click-to-play YouTube: shows the thumbnail and loads YouTube's player only when
 * tapped (it's heavy), then plays straight away. Uses youtube-nocookie.com.
 */
export function YouTubePlayer({ id, title, live }: { id: string; title: string; live: boolean }) {
  const [playing, setPlaying] = useState(false);
  if (playing) {
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        className="absolute inset-0 h-full w-full"
      />
    );
  }
  return (
    <button type="button" onClick={() => setPlaying(true)} aria-label={`Play: ${title}`} className="group absolute inset-0 flex items-center justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- YouTube thumbnail, sized by the frame */}
      <img src={`https://i.ytimg.com/vi/${id}/${live ? "hqdefault_live" : "hqdefault"}.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />
      <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white transition group-hover:scale-105 sm:h-20 sm:w-20">
        <Play className="ml-1 h-7 w-7 fill-current sm:h-9 sm:w-9" />
      </span>
    </button>
  );
}
