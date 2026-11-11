"use client";

import { useEffect, useRef } from "react";

type Dot = { x: number; y: number; vx: number; vy: number; r: number; color: string; glow: boolean; phase: number };

const LINK = 130; // px: dots closer than this are joined by a line
const REACH = 190; // px: how far the mouse joins dots to itself
const WHITE = "255,255,255";
const BLUE = "96,190,255";
const GOLD = "242,170,70";

/**
 * The homepage hero's moving background (client, 11 Nov 2026: particles that impress and build trust):
 * a network of small lights drifting slowly, joined by fine lines when they come near each other, like
 * businesses finding one another. Near the mouse the lines reach out to it. It fills its parent, which
 * must be positioned, and sits behind the content. Purely decorative: it takes no clicks and is hidden
 * from screen readers. It stops when off screen or in a hidden tab; with reduced motion it is drawn still.
 */
export function HeroParticles() {
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

    const draw = (now: number) => {
      ctx.clearRect(0, 0, width, height);
      // Lines first, so the lights sit on top of them
      ctx.lineWidth = 1;
      for (let i = 0; i < dots.length; i++) {
        const a = dots[i];
        for (let j = i + 1; j < dots.length; j++) {
          const b = dots[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          if (Math.abs(dx) > LINK || Math.abs(dy) > LINK) continue;
          const distance = Math.hypot(dx, dy);
          if (distance > LINK) continue;
          ctx.strokeStyle = `rgba(${BLUE},${(1 - distance / LINK) * 0.22})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
        const toPointer = Math.hypot(a.x - pointer.x, a.y - pointer.y);
        if (toPointer < REACH) {
          ctx.strokeStyle = `rgba(${GOLD},${(1 - toPointer / REACH) * 0.5})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }
      }
      for (const d of dots) {
        // Each light breathes a little, at its own pace
        const shine = 0.55 + 0.45 * Math.sin(now * 0.0012 + d.phase);
        if (d.glow) {
          const halo = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 6);
          halo.addColorStop(0, `rgba(${d.color},${0.35 * shine})`);
          halo.addColorStop(1, `rgba(${d.color},0)`);
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r * 6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = `rgba(${d.color},${0.45 + 0.5 * shine})`;
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
      // Fewer on a phone: less to draw, and the text needs the room
      const count = Math.min(width < 640 ? 34 : 95, Math.round((width * height) / 11000));
      dots = Array.from({ length: count }, (_, i) => {
        const angle = Math.random() * Math.PI * 2, speed = 0.12 + Math.random() * 0.22;
        const glow = i % 7 === 0;
        return {
          x: Math.random() * width, y: Math.random() * height, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          r: glow ? 1.1 + Math.random() * 0.6 : 0.5 + Math.random() * 0.6, color: i % 7 === 0 ? GOLD : i % 3 === 0 ? BLUE : WHITE, glow, phase: Math.random() * Math.PI * 2,
        };
      });
      draw(performance.now());
    };

    const tick = (now: number) => {
      frame = 0;
      // The same speed on any screen: steps are measured against 60 frames a second
      const step = Math.min((now - last) / 16.7 || 1, 3);
      last = now;
      for (const d of dots) {
        d.x += d.vx * step;
        d.y += d.vy * step;
        // Leaving one edge, a light comes back in at the other
        if (d.x < -20) d.x = width + 20; else if (d.x > width + 20) d.x = -20;
        if (d.y < -20) d.y = height + 20; else if (d.y > height + 20) d.y = -20;
      }
      draw(now);
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

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 -z-10 h-full w-full" />;
}
