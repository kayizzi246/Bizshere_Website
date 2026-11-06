"use client";

import { useEffect, useRef } from "react";

const EASE = 0.12; // how much of the way to the mouse each frame covers, so the cards trail it softly
const TILT = 9; // degrees at the edge of the fan
const SHIFT = 14; // px the front card moves; the back ones move half as much, which gives the depth

/**
 * The homepage's fan of idea photos. Every few seconds the cards swap places so a new one comes to the
 * front (each card's `--n` changes, and .fan-card glides to its new place); this rests under the mouse
 * and while the fan is off screen. It also leans towards the mouse and glides back when it leaves.
 * The lean is decorative, so it needs a real mouse, and all of it stays still with reduced motion. Each card's transform is
 * set directly, and the loop only runs while the cards are moving. The fan's own opening uses the
 * separate translate and rotate properties, so the two never fight.
 */
export function FanTilt({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  // The cards take turns at the front
  useEffect(() => {
    const fan = ref.current;
    if (!fan || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cards = [...fan.querySelectorAll<HTMLElement>(".fan-card")];
    if (cards.length < 2) return;
    const slots = cards.map((c) => c.style.getPropertyValue("--n").trim());
    let turn = 0, held = false, seen = false;
    const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; });
    io.observe(fan);
    const timer = window.setInterval(() => {
      if (held || !seen) return;
      turn += 1;
      cards.forEach((c, i) => {
        const slot = slots[(i + turn) % slots.length];
        c.style.setProperty("--n", slot);
        c.style.zIndex = slot === "0" ? "2" : "1";
      });
    }, 3000);
    const hold = () => { held = true; };
    const free = () => { held = false; };
    fan.addEventListener("pointerenter", hold);
    fan.addEventListener("pointerleave", free);
    return () => {
      window.clearInterval(timer);
      io.disconnect();
      fan.removeEventListener("pointerenter", hold);
      fan.removeEventListener("pointerleave", free);
    };
  }, []);

  useEffect(() => {
    const fan = ref.current;
    if (!fan || !window.matchMedia("(hover: hover) and (pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cards = [...fan.querySelectorAll<HTMLElement>(".fan-card")];
    const target = { x: 0, y: 0 }, now = { x: 0, y: 0 };
    let frame = 0;

    const tick = () => {
      frame = 0;
      now.x += (target.x - now.x) * EASE;
      now.y += (target.y - now.y) * EASE;
      const settled = Math.abs(target.x - now.x) < 0.001 && Math.abs(target.y - now.y) < 0.001;
      if (settled) { now.x = target.x; now.y = target.y; }
      for (const card of cards) {
        const front = card.style.getPropertyValue("--n").trim() === "0";
        const depth = front ? 1 : 0.5;
        card.style.transform = now.x === 0 && now.y === 0 ? "" : `perspective(900px) translate3d(${now.x * SHIFT * depth}px, ${now.y * SHIFT * depth}px, 0) rotateX(${-now.y * TILT}deg) rotateY(${now.x * TILT}deg)`;
      }
      if (!settled) frame = requestAnimationFrame(tick);
    };
    const run = () => { if (!frame) frame = requestAnimationFrame(tick); };
    const move = (e: PointerEvent) => {
      const box = fan.getBoundingClientRect();
      target.x = Math.max(-1, Math.min(1, ((e.clientX - box.left) / box.width) * 2 - 1));
      target.y = Math.max(-1, Math.min(1, ((e.clientY - box.top) / box.height) * 2 - 1));
      run();
    };
    const leave = () => { target.x = 0; target.y = 0; run(); };

    fan.addEventListener("pointermove", move);
    fan.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      fan.removeEventListener("pointermove", move);
      fan.removeEventListener("pointerleave", leave);
    };
  }, []);

  return <div ref={ref} data-reveal="" className="fan relative h-[260px] sm:h-[340px]">{children}</div>;
}
