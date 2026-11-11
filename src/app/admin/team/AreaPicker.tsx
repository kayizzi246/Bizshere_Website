"use client";

import { useState } from "react";
import { AREA_GROUPS, AREA_KEYS, AREAS } from "@/lib/admin-areas";

/**
 * Choosing what a sub-admin may manage, made quick (client, 11 Nov 2026: adding and managing admins as easy
 * as possible): one tap for a ready-made job ("All website content", "Suppliers and experts", "Money"…),
 * or tick single areas; each group has its own "all / none". With `withSuper` (the Add form) the first
 * choice is full access, which sends access=super and no areas. The ticked boxes are sent as `areas`.
 */
const JOBS: { label: string; help: string; keys: string[] }[] = [
  { label: "All website content", help: "Every directory, categories and market prices", keys: AREAS.filter((a) => a.group === "Directories").map((a) => a.key) },
  { label: "Suppliers and experts", help: "Their sign-ups, logins, products and reviews", keys: ["suppliers", "experts", "review", "content:SUPPLIER", "content:CONSULTANT"].filter((k) => AREA_KEYS.includes(k)) },
  { label: "Money", help: "Payments, leads and subscription prices", keys: AREAS.filter((a) => a.group === "Money").map((a) => a.key) },
  { label: "Checking and community", help: "Review queue, reported mistakes, forum", keys: ["review", "corrections", "community"] },
];

export function AreaPicker({ chosen, withSuper = false }: { chosen: string[]; withSuper?: boolean }) {
  const [picked, setPicked] = useState<string[]>(chosen);
  const [full, setFull] = useState(false);
  const has = (k: string) => picked.includes(k);
  const add = (keys: string[]) => setPicked((p) => [...new Set([...p, ...keys])]);
  const drop = (keys: string[]) => setPicked((p) => p.filter((k) => !keys.includes(k)));
  const chip = "rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors";

  return (
    <div className="flex flex-col gap-3">
      {withSuper ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {([[false, "Only some parts", "A sub-admin: they see and change only what you tick below"], [true, "Everything", "A super admin: every area, the team, prices and deletes"]] as const).map(([value, title, help]) => (
            <label key={title} className={`flex cursor-pointer items-start gap-2.5 rounded-xl border-2 p-3 ${full === value ? "border-brand bg-brand-tint" : "border-line"}`}>
              <input type="radio" name="access" value={value ? "super" : "some"} checked={full === value} onChange={() => setFull(value)} className="mt-1 h-4 w-4 accent-brand" />
              <span className="flex flex-col"><span className="font-bold text-heading">{title}</span><span className="text-[13px] text-ink-muted">{help}</span></span>
            </label>
          ))}
        </div>
      ) : null}

      {full ? null : (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-ink-soft">Quick choices (tap to tick a whole job)</span>
            <div className="flex flex-wrap gap-2">
              {JOBS.map((j) => {
                const on = j.keys.every(has);
                return <button key={j.label} type="button" title={j.help} aria-pressed={on} onClick={() => (on ? drop(j.keys) : add(j.keys))} className={`${chip} ${on ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink hover:border-brand hover:text-brand"}`}>{on ? "✓ " : "+ "}{j.label}</button>;
              })}
              <button type="button" onClick={() => setPicked(AREA_KEYS)} className={`${chip} border-line bg-surface text-ink hover:border-brand hover:text-brand`}>Tick all</button>
              <button type="button" onClick={() => setPicked([])} className={`${chip} border-line bg-surface text-ink-muted hover:border-bad-fg hover:text-bad-fg`}>Clear</button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {AREA_GROUPS.map((g) => {
              const keys = AREAS.filter((a) => a.group === g).map((a) => a.key);
              const all = keys.every(has);
              return (
                <fieldset key={g} className="flex flex-col gap-1.5 rounded-xl border border-line p-3">
                  <legend className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wide text-ink-muted">{g}
                    <button type="button" onClick={() => (all ? drop(keys) : add(keys))} className="rounded-full bg-page px-2 py-0.5 text-[11px] font-semibold normal-case tracking-normal text-brand hover:bg-brand-tint">{all ? "none" : "all"}</button>
                  </legend>
                  {AREAS.filter((a) => a.group === g).map((a) => (
                    <label key={a.key} className="flex cursor-pointer items-start gap-2 text-[13px]">
                      <input type="checkbox" name="areas" value={a.key} checked={has(a.key)} onChange={(e) => (e.target.checked ? add([a.key]) : drop([a.key]))} className="mt-0.5 h-4 w-4 shrink-0 accent-brand" />
                      <span className="flex flex-col"><span className="font-semibold text-ink">{a.label}</span>{a.help ? <span className="text-[12px] text-ink-muted">{a.help}</span> : null}</span>
                    </label>
                  ))}
                </fieldset>
              );
            })}
          </div>
          <p className="text-[13px] text-ink-muted" aria-live="polite">{picked.length ? `${picked.length} of ${AREA_KEYS.length} areas ticked.` : "Nothing ticked yet."}</p>
        </>
      )}
    </div>
  );
}
