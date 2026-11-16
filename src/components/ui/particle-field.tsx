"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type Dot = { x: number; y: number; vx: number; vy: number; r: number; a: number; tint: number };

/**
 * A quiet field of drifting specks for a dark panel.
 *
 * Deliberately less than HeroParticles: no lines between dots, nothing that follows the pointer, and
 * low enough in contrast to read as texture rather than decoration competing with the words. It fills
 * its parent, which must be positioned, and sits behind the content.
 *
 * Decorative only — it takes no clicks and is hidden from screen readers. It stops when scrolled out
 * of view or the tab is hidden, and with `prefers-reduced-motion` it is painted once and left still.
 */
export function ParticleField({ className, count = 44 }: { className?: string; count?: number }) {
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
        // Slow: a dot crosses the panel in a few minutes, so it reads as drift, not motion.
        vx: (Math.random() - 0.5) * 0.08,
        vy: (Math.random() - 0.5) * 0.08,
        r: Math.random() * 1.3 + 0.5,
        a: Math.random() * 0.28 + 0.08,
        tint: Math.random(),
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const d of dots) {
        // Mostly white, a few in the hero's light blue, so it sits inside the existing palette.
        const rgb = d.tint > 0.78 ? "150,205,255" : "255,255,255";
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${d.a})`;
        ctx.fill();
      }
    };

    const step = () => {
      for (const d of dots) {
        d.x += d.vx;
        d.y += d.vy;
        // Wrap rather than bounce: bouncing makes the edges visible as the dots pile up against them.
        if (d.x < -2) d.x = width + 2;
        else if (d.x > width + 2) d.x = -2;
        if (d.y < -2) d.y = height + 2;
        else if (d.y > height + 2) d.y = -2;
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
