"use client";

import { useEffect, useRef } from "react";
import type { AnimationItem } from "lottie-web";

/**
 * A small decorative Lottie animation (files in public/lottie, made by scripts/make-lottie.mjs).
 * The player (lottie-web's light build) and the file load only when it comes near the screen, it
 * plays only while on screen, and for visitors who ask for less motion it shows one still frame.
 */
export function LottieArt({ src, className = "" }: { src: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let anim: AnimationItem | null = null;
    let loading = false, gone = false, seen = false;

    const io = new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (anim) { if (seen && !still) anim.play(); else anim.pause(); return; }
      if (!seen || loading) return;
      loading = true;
      import("lottie-web/build/player/lottie_light").then(({ default: lottie }) => {
        if (gone) return;
        anim = lottie.loadAnimation({ container: box, renderer: "svg", loop: true, autoplay: false, path: src });
        anim.addEventListener("DOMLoaded", () => {
          if (still) anim?.goToAndStop(30, true);
          else if (seen) anim?.play();
        });
      }).catch(() => { /* decorative: nothing to show */ });
    }, { rootMargin: "120px" });
    io.observe(box);
    return () => { gone = true; io.disconnect(); anim?.destroy(); };
  }, [src]);

  return <div ref={ref} aria-hidden className={className} />;
}
