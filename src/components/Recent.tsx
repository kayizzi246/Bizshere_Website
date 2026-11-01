"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, History, X } from "lucide-react";
import { Icon } from "./Icon";

/**
 * Remembers the pages a visitor opens, in their own browser only (nothing is sent to us):
 * a "Welcome back" note on a page they have seen before, a "Viewed" tick on cards, and a
 * "Pick up where you left off" row on the homepage, listings and detail pages.
 */
export type RecentItem = { href: string; title: string; kind: string; icon: string; picture?: string | null; at: number };

const KEY = "bsu-recent";
const MAX = 12;
const EVENT = "bsu-recent";

function read(): RecentItem[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => x && typeof x.href === "string" && typeof x.title === "string") : [];
  } catch {
    return [];
  }
}

function write(items: RecentItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX)));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Private windows and blocked storage: the site works the same, it just doesn't remember.
  }
}

/** Saved visits, read after the page loads so the server and browser render the same first. */
function useRecent() {
  const [items, setItems] = useState<RecentItem[] | null>(null);
  useEffect(() => {
    const load = () => setItems(read());
    load();
    window.addEventListener(EVENT, load);
    window.addEventListener("storage", load);
    return () => { window.removeEventListener(EVENT, load); window.removeEventListener("storage", load); };
  }, []);
  return items;
}

export function ago(at: number) {
  const mins = Math.round((Date.now() - at) / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours === 1 ? "an hour ago" : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * Put on a detail page: records the visit and, when the visitor has been here before,
 * says so ("Welcome back · you last looked 3 days ago").
 */
export function RememberVisit({ item, tone = "dark" }: { item: Omit<RecentItem, "at">; tone?: "dark" | "light" }) {
  const [last, setLast] = useState<number | null>(null);
  useEffect(() => {
    const all = read();
    const before = all.find((x) => x.href === item.href);
    // A reload within a few minutes is the same visit, not a return.
    if (before && Date.now() - before.at > 5 * 60000) setLast(before.at);
    write([{ ...item, at: Date.now() }, ...all.filter((x) => x.href !== item.href)]);
    // Only the address identifies the visit; the rest is display text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.href]);

  if (!last) return null;
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${tone === "dark" ? "bg-accent/15 text-accent" : "bg-accent-tint text-accent-dark"}`}>
      <History aria-hidden className="h-3.5 w-3.5" />Welcome back · you looked at this {ago(last)}
    </span>
  );
}

/** A small "Viewed" tick for a card the visitor has already opened. */
export function SeenBadge({ href, className = "" }: { href: string; className?: string }) {
  const items = useRecent();
  if (!items?.some((x) => x.href === href)) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-bold text-brand ${className}`}>
      <Check aria-hidden className="h-3 w-3" strokeWidth={3} />Viewed
    </span>
  );
}

/**
 * "Pick up where you left off": the last pages the visitor opened, as a row of small cards
 * that scrolls sideways on phones. Shows nothing for a first visit.
 */
export function RecentStrip({ exclude, only, title = "Pick up where you left off", className = "" }: {
  /** The current page, left out of its own list */
  exclude?: string;
  /** Limit to one directory, e.g. "/machines" */
  only?: string;
  title?: string;
  className?: string;
}) {
  const items = useRecent();
  const shown = (items ?? []).filter((x) => x.href !== exclude && (!only || x.href.startsWith(`${only}/`))).slice(0, 8);
  if (!shown.length) return null;

  return (
    <section aria-label={title} className={`flex flex-col gap-3 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 font-display text-base font-bold text-heading sm:text-lg">
          <History aria-hidden className="h-[18px] w-[18px] text-accent" />{title}
        </h2>
        <button type="button" onClick={() => write([])} className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-brand">
          <X aria-hidden className="h-3.5 w-3.5" />Clear
        </button>
      </div>
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {shown.map((x) => (
          <li key={x.href} className="w-[220px] shrink-0 snap-start sm:w-[240px]">
            <Link href={x.href} className="group flex h-full items-center gap-3 rounded-2xl border border-line bg-white p-2.5 pr-3 text-ink transition hover:border-brand hover:text-ink">
              {x.picture ? (
                // eslint-disable-next-line @next/next/no-img-element -- editor-entered address
                <img src={x.picture} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-xl bg-page object-cover" />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand"><Icon name={x.icon} className="h-6 w-6" /></span>
              )}
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[11px] font-semibold text-accent-dark">{x.kind}</span>
                <span className="line-clamp-2 text-[13px] font-bold leading-snug text-heading group-hover:text-brand">{x.title.replace(/^Sample:\s*/i, "")}</span>
                <span className="text-[11px] text-ink-muted">{ago(x.at)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Long text cut to a few lines with "Read more", so a phone screen shows the point first.
 * Short text is shown in full with no button.
 */
export function ReadMore({ text, lines = 4, className = "" }: { text: string; lines?: number; className?: string }) {
  const [open, setOpen] = useState(false);
  // Roughly what fits in the clamp on a phone; longer text gets the button.
  const long = text.length > lines * 90 || text.split("\n").length > lines;
  return (
    <div className="flex flex-col items-start gap-2">
      <p
        className={`whitespace-pre-line text-[15px] leading-relaxed text-ink-soft ${className}`}
        style={long && !open ? { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" } : undefined}
      >
        {text}
      </p>
      {long ? (
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="inline-flex min-h-[40px] items-center text-sm font-bold text-brand hover:text-brand-dark">
          {open ? "Show less ↑" : "Read more ↓"}
        </button>
      ) : null}
    </div>
  );
}

/**
 * A section that starts closed (less to read), with a clear tap target. Opens itself when a
 * link jumps to it, e.g. the "All details" tab.
 */
export function Expand({ id, summary, count, children, defaultOpen = false }: { id: string; summary: string; count?: number; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    const check = () => { if (window.location.hash === `#${id}`) setOpen(true); };
    check();
    window.addEventListener("hashchange", check);
    // Clicking the same tab twice doesn't change the hash, so listen for the click too.
    const click = (e: MouseEvent) => { if ((e.target as HTMLElement).closest?.(`a[href="#${id}"]`)) setOpen(true); };
    document.addEventListener("click", click);
    return () => { window.removeEventListener("hashchange", check); document.removeEventListener("click", click); };
  }, [id]);

  return (
    <section id={id} className="flex scroll-mt-36 flex-col overflow-hidden rounded-2xl border border-line bg-white">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-[64px] items-center justify-between gap-3 px-5 py-4 text-left sm:px-6">
        <span className="flex items-center gap-2.5">
          <span className="font-display text-lg font-bold text-heading">{summary}</span>
          {count ? <span className="rounded-full bg-brand-tint px-2 py-0.5 text-xs font-bold text-brand">{count}</span> : null}
        </span>
        <span aria-hidden className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-page text-heading transition-transform ${open ? "rotate-180" : ""}`}>↓</span>
      </button>
      {open ? <div className="border-t border-line p-4 sm:p-6">{children}</div> : null}
    </section>
  );
}
