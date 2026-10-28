"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cycles through words letter by letter: the old word's letters lift away one after another,
 * the new word's letters flip up out of a blur, and the box (and the underline under it) glides
 * to the new word's width, so the rest of the line moves smoothly instead of jumping.
 * Screen readers get the first word only, and copying the headline copies one word.
 * Reduced-motion users see the first word without cycling.
 */
export function RotatingWord({ words, interval = 3200, className = "" }: { words: string[]; interval?: number; className?: string }) {
  const [i, setI] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [widths, setWidths] = useState<number[]>([]);
  const sizers = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const measure = () => setWidths(sizers.current.map((el) => el?.offsetWidth ?? 0));
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [words]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      setI((n) => {
        setPrev(n);
        return (n + 1) % words.length;
      });
    }, interval);
    return () => clearInterval(id);
  }, [words.length, interval]);

  return (
    <span className={`relative inline-block whitespace-nowrap align-bottom [perspective:600px] motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-[cubic-bezier(0.65,0,0.35,1)] ${className}`}
      style={widths[i] ? { width: widths[i] } : undefined}>
      <span className="sr-only">{words[0]}</span>
      {/* Invisible copies: one sets the line height, the others give each word's width */}
      <span aria-hidden className="invisible select-none">{words[i]}</span>
      {words.map((w, n) => <span key={w} ref={(el) => { sizers.current[n] = el; }} aria-hidden className="invisible absolute left-0 top-0 select-none">{w}</span>)}
      {[i, prev].map((n) => n === null || (n === prev && prev === i) ? null : (
        <span key={`${words[n]}-${n === i ? "in" : "out"}`} aria-hidden className="absolute left-0 top-0 select-none">
          {[...words[n]].map((ch, k) => (
            <span key={k} className={`inline-block ${n === i ? "letter-in" : "letter-out"}`} style={{ animationDelay: `${k * (n === i ? 55 : 30)}ms` }}>{ch}</span>
          ))}
        </span>
      ))}
    </span>
  );
}
