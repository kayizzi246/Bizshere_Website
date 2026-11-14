"use client";

import { useState } from "react";
import { Icon } from "./Icon";
import { useTypingHint } from "./TypingHint";

/**
 * What the box types out by itself. Jobs people are already paying someone for come first (client,
 * 14 Nov 2026: "add things that will bring clients, for example filing returns expert"), then the
 * things people browse for. Every phrase is built from words in TOPICS (src/lib/advanced-search.ts),
 * so anyone who types one straight in gets real results rather than an empty page.
 */
const EXAMPLES = [
  "tax returns",
  "register a business",
  "trading licence",
  "business plan",
  "EFRIS",
  "VAT",
  "PAYE",
  "loans",
  "export",
  "licences",
  "bakery",
  "soap making",
  "hammer mill",
];

/** Homepage search: one compact box with a solid blue edge and a typed-out example; searches every directory. */
export function HomeSearch() {
  const [q, setQ] = useState("");
  const hint = useTypingHint(EXAMPLES, { paused: Boolean(q) });
  return (
    <form action="/search" role="search" className="search-glow w-full max-w-[640px] rounded-2xl">
      <div className="flex items-center gap-2 rounded-[14px] bg-white p-1.5 pl-4 text-ink-muted">
        <Icon name="search" className="h-5 w-5 shrink-0" />
        <label className="sr-only" htmlFor="hero-q">Search all directories</label>
        <input id="hero-q" name="q" type="search" enterKeyHint="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={hint}
          className="min-h-[44px] w-full min-w-0 bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-muted sm:min-h-[48px] sm:text-[17px]" />
        <button className="btn-primary min-h-[44px] shrink-0 rounded-xl px-5 text-[15px] font-normal sm:min-h-[48px] sm:px-6">Search</button>
      </div>
    </form>
  );
}
