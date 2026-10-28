"use client";

import { useEffect, useState } from "react";

/**
 * Cycles through words in place: the current one slides up and out, the next slides up into view.
 * All words share one grid cell, so the line keeps the width of the longest and nothing jumps.
 * Clipped with clip-path rather than overflow, which would move the word off the text baseline.
 * Screen readers get the first word only; reduced-motion users see it without cycling.
 */
export function RotatingWord({ words, interval = 4000, className = "" }: { words: string[]; interval?: number; className?: string }) {
  const [i, setI] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);

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
    <span className={`relative inline-grid [clip-path:inset(-0.1em_-0.3em_-0.2em_-0.3em)] ${className}`}>
      <span className="sr-only">{words[0]}</span>
      {words.map((w, n) => (
        <span
          key={w}
          aria-hidden
          className={`col-start-1 row-start-1 whitespace-nowrap transition-all duration-[900ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] ${
            n === i ? "translate-y-0 opacity-100 blur-0" : n === prev ? "-translate-y-full opacity-0 blur-sm" : "translate-y-full opacity-0 blur-sm"
          }`}
        >
          {w}
        </span>
      ))}
    </span>
  );
}
