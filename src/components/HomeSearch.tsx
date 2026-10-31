"use client";

import { useState } from "react";
import { Icon } from "./Icon";
import { useTypingHint } from "./TypingHint";

const EXAMPLES = ["start a bakery", "poultry farming", "maize milling machine", "loans for small business", "soap making", "register a business"];

/** Homepage search: one compact box with a glowing edge and a typed-out example; searches every directory. */
export function HomeSearch() {
  const [q, setQ] = useState("");
  const hint = useTypingHint(EXAMPLES, { paused: Boolean(q) });
  return (
    <form action="/search" role="search" className="search-glow w-full max-w-[600px] rounded-2xl">
      <div className="flex items-center gap-2 rounded-[14px] bg-white p-1.5 pl-4 text-ink-muted">
        <Icon name="search" className="h-5 w-5 shrink-0" />
        <label className="sr-only" htmlFor="hero-q">Search all directories</label>
        <input id="hero-q" name="q" type="search" enterKeyHint="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={hint}
          className="min-h-[44px] w-full min-w-0 bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-muted sm:min-h-[48px] sm:text-[17px]" />
        <button className="btn-primary min-h-[44px] shrink-0 rounded-xl px-5 text-[15px] font-semibold sm:min-h-[48px] sm:px-6">Search</button>
      </div>
    </form>
  );
}
