"use client";

import { useEffect, useState } from "react";

/**
 * A search box placeholder that types out example searches one after another ("Try “start a
 * bakery”", then "Try “poultry farm”"…), to show visitors what they can look for. With reduced
 * motion, or while the box has text, it stays on the first example.
 */
export function useTypingHint(examples: string[], { prefix = "Try ", paused = false } = {}) {
  const [text, setText] = useState(examples[0] ?? "");

  useEffect(() => {
    if (paused || examples.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let word = 0;
    let chars = examples[0].length;
    let deleting = true;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      const full = examples[word];
      chars += deleting ? -1 : 1;
      setText(full.slice(0, chars));
      let wait = deleting ? 35 : 70;
      if (deleting && chars === 0) { deleting = false; word = (word + 1) % examples.length; wait = 300; }
      else if (!deleting && chars === examples[word].length) { deleting = true; wait = 2200; }
      timer = setTimeout(step, wait);
    };
    timer = setTimeout(step, 2500); // let the first example be read
    return () => clearTimeout(timer);
  }, [examples, paused]);

  return `${prefix}“${text}”`;
}
