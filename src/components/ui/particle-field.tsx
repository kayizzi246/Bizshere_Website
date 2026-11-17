"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** `phase` and `speed` drive the twinkle; `drift` is the barely-there sideways movement. */
type Dot = { x: number; y: number; r: number; base: number; phase: number; speed: number; drift: number; tint: number };

/**
 * A night sky for a dark panel: specks that hold their place and slowly brighten and dim.
 *
 * Chosen over drifting dots (17 Nov 2026). Each star breathes on its own timer, so the field is
 * always changing without anything actually travelling across the panel — calm enough to sit behind
 * a headline, where motion across the screen pulls the eye off the words. A touch of sideways drift
 * is kept so it does not look like a static image.
 *
 * Deliberately less than HeroParticles: no lines between dots and nothing that follows the pointer.
 * It fills its parent, which must be positioned, and sits behind the content.
 *
 * Decorative only — it takes no clicks and is hidden from screen readers. It stops when scrolled out
 * of view or the tab is hidden, and with `prefers-reduced-motion` it is painted once and left still.
 */
export function ParticleField({ className, count = 90 }: { className?: string; count?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const panel = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !panel || !ctx) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dots: Dot[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let running = false;

    const build = () => {
      const rect = panel.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      // Draw at device resolution so the dots are not blurred on a high-DPI screen, but cap the
      // multiplier: at 3x a full-width hero is millions of pixels to repaint every frame.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Scale the count with the area so a wide screen is not sparse and a phone is not crowded.
      const n = Math.round(count * Math.min(1.4, Math.max(0.45, (width * height) / (1440 * 660))));
      dots = Array.from({ length: n }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.5 + 0.6,
        // The brightness each star settles around; the twinkle swings either side of it.
        base: Math.random() * 0.34 + 0.16,
        // A random starting point in the cycle, so they are not all bright at the same moment.
        phase: Math.random() * Math.PI * 2,
        // Each on its own clock: the slowest takes about 11 seconds a cycle, the quickest about 2.5.
        speed: Math.random() * 0.021 + 0.005,
        // Barely moving — a few pixels a minute, just enough that the field is never quite still.
        drift: (Math.random() - 0.5) * 0.02,
        tint: Math.random(),
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const d of dots) {
        // Mostly white, a few in the hero's light blue, so it sits inside the existing palette.
        const rgb = d.tint > 0.62 ? "150,205,255" : "255,255,255";
        // sin() swings between -1 and 1; this maps it to 35%-100% of the star's own brightness, so
        // one never blinks out completely — that would read as a fault rather than a twinkle.
        const a = d.base * (0.675 + 0.325 * Math.sin(d.phase));
        // The brightest moment also grows it very slightly, which is what sells it as light.
        const r = d.r * (0.92 + 0.08 * Math.sin(d.phase));
        ctx.beginPath();
        ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${a})`;
        ctx.fill();
      }
    };

    const step = () => {
      for (const d of dots) {
        d.phase += d.speed;
        if (d.phase > Math.PI * 2) d.phase -= Math.PI * 2;
        d.x += d.drift;
        // Wrap rather than bounce: bouncing makes the edges visible as the dots pile up against them.
        if (d.x < -2) d.x = width + 2;
        else if (d.x > width + 2) d.x = -2;
      }
      draw();
      frame = requestAnimationFrame(step);
    };

    const start = () => {
      if (running || still) return;
      running = true;
      frame = requestAnimationFrame(step);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    build();
    draw();
    if (!still) start();

    // Only animate while the hero is actually on screen and the tab is in front.
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: 0 });
    io.observe(panel);
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);

    // Rebuild on resize, but not on every pixel of a drag.
    let resizeTimer: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        build();
        draw();
      }, 150);
    });
    ro.observe(panel);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      clearTimeout(resizeTimer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [count]);

  return <canvas ref={ref} aria-hidden className={cn("pointer-events-none absolute inset-0 -z-10 h-full w-full", className)} />;
}
