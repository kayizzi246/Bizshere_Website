"use client";

import { useEffect, useRef } from "react";

type Dot = { homeX: number; homeY: number; x: number; y: number; vx: number; vy: number; r: number; phase: number; speed: number; color: string };

const RADIUS = 130; // how far the pointer reaches, in px
const PUSH = 1.5; // how hard it pushes
const SPRING = 0.022; // how strongly a particle returns home
const DAMPING = 0.9;
const WHITE = "rgba(255,255,255,0.55)";
const ORANGE = "rgba(242,140,40,0.85)";

/**
 * Small particles over the navy panel of the sign-in screens (src/components/SplitShell.tsx). Each drifts
 * around its home and is pushed away by the mouse, then springs back. Purely decorative, so it takes
 * no clicks and is hidden from screen readers. It stops when off screen or in a hidden tab, and with
 * reduced motion the particles are simply drawn still.
 */
export function PanelParticles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const panel = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !panel || !ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dots: Dot[] = [];
    let width = 0, height = 0;
    let frame = 0, visible = true, last = 0;
    const pointer = { x: -9999, y: -9999 };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const d of dots) {
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const size = () => {
      const box = panel.getBoundingClientRect();
      width = box.width;
      height = box.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.min(110, Math.round((width * height) / 7000));
      dots = Array.from({ length: count }, (_, i) => {
        const x = Math.random() * width, y = Math.random() * height;
        return { homeX: x, homeY: y, x, y, vx: 0, vy: 0, r: 0.8 + Math.random() * 1.5, phase: Math.random() * Math.PI * 2, speed: 0.0003 + Math.random() * 0.0005, color: i % 6 === 0 ? ORANGE : WHITE };
      });
      draw();
    };

    const tick = (now: number) => {
      frame = 0;
      // The same speed on any screen: steps are measured against 60 frames a second
      const step = Math.min((now - last) / 16.7 || 1, 3);
      last = now;
      for (const d of dots) {
        const targetX = d.homeX + Math.cos(now * d.speed + d.phase) * 14;
        const targetY = d.homeY + Math.sin(now * d.speed * 1.3 + d.phase) * 14;
        d.vx += (targetX - d.x) * SPRING * step;
        d.vy += (targetY - d.y) * SPRING * step;
        const dx = d.x - pointer.x, dy = d.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < RADIUS && distance > 0.01) {
          const force = (1 - distance / RADIUS) * PUSH * step;
          d.vx += (dx / distance) * force;
          d.vy += (dy / distance) * force;
        }
        d.vx *= DAMPING;
        d.vy *= DAMPING;
        d.x += d.vx * step;
        d.y += d.vy * step;
      }
      draw();
      if (visible && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const run = () => { if (!still && !frame && visible && !document.hidden) { last = performance.now(); frame = requestAnimationFrame(tick); } };

    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const box = panel.getBoundingClientRect();
      pointer.x = e.clientX - box.left;
      pointer.y = e.clientY - box.top;
    };
    const leave = () => { pointer.x = pointer.y = -9999; };

    size();
    const resized = new ResizeObserver(size);
    resized.observe(panel);
    const seen = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; run(); });
    seen.observe(panel);
    document.addEventListener("visibilitychange", run);
    if (!still) {
      panel.addEventListener("pointermove", move);
      panel.addEventListener("pointerleave", leave);
    }
    run();
    return () => {
      cancelAnimationFrame(frame);
      resized.disconnect();
      seen.disconnect();
      document.removeEventListener("visibilitychange", run);
      panel.removeEventListener("pointermove", move);
      panel.removeEventListener("pointerleave", leave);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}
