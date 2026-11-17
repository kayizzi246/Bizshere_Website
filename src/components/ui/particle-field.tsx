"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** `phase` and `speed` drive the twinkle; `drift` is the barely-there sideways movement. */
type Dot = { x: number; y: number; size: number; base: number; phase: number; speed: number; drift: number; sprite: number };

/**
 * One star, drawn once into a small off-screen canvas and then stamped wherever it is needed.
 *
 * A star is not a dot: it is a small white core inside a halo that fades out over several times its
 * own width, and the brightest ones throw four spikes — the shape a camera lens makes of a point of
 * light, and the shape everyone reads as "star". Both are gradients, which are far too slow to build
 * eighty times a frame, so each kind is painted once here and from then on it is only a drawImage.
 *
 * `rgb` is the colour as "r,g,b"; `spikes` adds the cross.
 */
function starSprite(rgb: string, spikes: boolean): HTMLCanvasElement {
  const S = 64; // The sprite is always scaled down, so this is plenty of detail.
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const g = c.getContext("2d")!;
  const m = S / 2;

  // The glow: solid white for the first few per cent, then away quickly, then a long faint tail.
  // The sharp step near the middle is what reads as a point of light rather than a fuzzy blob.
  const halo = g.createRadialGradient(m, m, 0, m, m, m);
  halo.addColorStop(0, `rgba(${rgb},1)`);
  halo.addColorStop(0.06, `rgba(${rgb},0.95)`);
  halo.addColorStop(0.14, `rgba(${rgb},0.42)`);
  halo.addColorStop(0.3, `rgba(${rgb},0.12)`);
  halo.addColorStop(0.6, `rgba(${rgb},0.03)`);
  halo.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = halo;
  g.fillRect(0, 0, S, S);

  if (spikes) {
    // Each spike is a long thin diamond filled with a gradient that is bright in the middle and
    // gone at both tips, so it tapers to a point instead of stopping dead. "lighter" adds the two
    // together, which makes the centre where they cross the brightest part of the star.
    g.globalCompositeOperation = "lighter";
    const arm = (across: boolean) => {
      const L = m * 0.96;
      const w = S * 0.03;
      const grad = across ? g.createLinearGradient(m - L, 0, m + L, 0) : g.createLinearGradient(0, m - L, 0, m + L);
      grad.addColorStop(0, `rgba(${rgb},0)`);
      grad.addColorStop(0.42, `rgba(${rgb},0.3)`);
      grad.addColorStop(0.5, `rgba(${rgb},0.85)`);
      grad.addColorStop(0.58, `rgba(${rgb},0.3)`);
      grad.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = grad;
      g.beginPath();
      if (across) { g.moveTo(m - L, m); g.lineTo(m, m - w); g.lineTo(m + L, m); g.lineTo(m, m + w); }
      else { g.moveTo(m, m - L); g.lineTo(m + w, m); g.lineTo(m, m + L); g.lineTo(m - w, m); }
      g.closePath();
      g.fill();
    };
    arm(true);
    arm(false);
  }
  return c;
}

/**
 * A night sky for a dark panel: stars that hold their place and slowly brighten and dim.
 *
 * Chosen over drifting dots (17 Nov 2026), then made to shine rather than sit flat (17 Nov 2026,
 * client): each one is a lit core in a halo, and the biggest few throw the four-point cross a lens
 * makes of a bright point. They are drawn with "lighter", so where two glows meet the light adds up
 * the way real light does instead of one covering the other.
 *
 * Each star breathes on its own timer, so the field is always changing without anything actually
 * travelling across the panel — calm enough to sit behind a headline, where motion across the screen
 * pulls the eye off the words. The twinkle is deliberately uneven: a star spends most of its cycle
 * low and passes quickly through its brightest moment, which is what stops eighty of them pulsing
 * like a row of indicator lights. A touch of sideways drift keeps it from looking like a still image.
 *
 * Deliberately less than HeroParticles: no lines between stars and nothing that follows the pointer.
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
    // Mostly white, some in the hero's light blue so the field sits inside the existing palette.
    // Index 0/1 are plain stars, 2/3 the same colours with spikes.
    const sprites = [
      starSprite("255,255,255", false),
      starSprite("168,214,255", false),
      starSprite("255,255,255", true),
      starSprite("188,224,255", true),
    ];
    let dots: Dot[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let running = false;

    const build = () => {
      const rect = panel.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      // Draw at device resolution so the stars are not blurred on a high-DPI screen, but cap the
      // multiplier: at 3x a full-width hero is millions of pixels to repaint every frame.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Scale the count with the area so a wide screen is not sparse and a phone is not crowded.
      const n = Math.round(count * Math.min(1.4, Math.max(0.45, (width * height) / (1440 * 660))));
      dots = Array.from({ length: n }, () => {
        // A few bright ones among many faint: the spread is what makes a sky look deep rather than
        // like a pattern. Only the top of that range earns spikes — about one star in six.
        const weight = Math.random();
        const big = weight > 0.84;
        const blue = Math.random() > 0.72;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          // The whole sprite, halo included, is roughly ten times the lit core.
          size: (big ? 22 + Math.random() * 14 : 9 + Math.random() * 9),
          // The brightness each star settles around; the twinkle swings either side of it.
          base: (big ? 0.5 + Math.random() * 0.3 : 0.22 + Math.random() * 0.3),
          // A random starting point in the cycle, so they are not all bright at the same moment.
          phase: Math.random() * Math.PI * 2,
          // Each on its own clock: the slowest takes about 11 seconds a cycle, the quickest about 2.5.
          speed: Math.random() * 0.021 + 0.005,
          // Barely moving — a few pixels a minute, just enough that the field is never quite still.
          drift: (Math.random() - 0.5) * 0.02,
          sprite: big ? (blue ? 3 : 2) : (blue ? 1 : 0),
        };
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      // Light adds: two glows that overlap make a brighter patch, not a seam.
      ctx.globalCompositeOperation = "lighter";
      for (const d of dots) {
        // sin() swings between -1 and 1. Squaring the 0–1 version of it holds the star low for most
        // of the cycle and sends it through its peak quickly, which is how a real one reads.
        const swing = (Math.sin(d.phase) + 1) / 2;
        const lit = swing * swing;
        ctx.globalAlpha = Math.min(1, d.base * (0.34 + 0.9 * lit));
        // The brightest moment also swells it a little, which is most of what sells the shine.
        const s = d.size * (0.86 + 0.24 * lit);
        ctx.drawImage(sprites[d.sprite], d.x - s / 2, d.y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    const step = () => {
      for (const d of dots) {
        d.phase += d.speed;
        if (d.phase > Math.PI * 2) d.phase -= Math.PI * 2;
        d.x += d.drift;
        // Wrap rather than bounce: bouncing makes the edges visible as the stars pile up against them.
        if (d.x < -40) d.x = width + 40;
        else if (d.x > width + 40) d.x = -40;
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
