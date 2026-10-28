"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Icon } from "./Icon";

type NavLink = { href: string; label: string; badge?: number; icon?: string };
/** A link, a section label, or a folding group of links (e.g. the directories). */
export type NavItem = NavLink | { section: string } | { group: string; icon?: string; items: NavLink[] };

/** How well a link matches the current page: exact (with query) beats a parent path. -1 = no match. */
function score(href: string, path: string, query: string) {
  const [base, q] = href.split("?");
  if (q) return path === base && query === q ? 3 : -1;
  if (base === path) return query ? 1 : 2;
  return base !== "/admin" && path.startsWith(base + "/") ? 0 : -1;
}

const flatLinks = (items: NavItem[]): NavLink[] => items.flatMap((it) => ("href" in it ? [it] : "group" in it ? it.items : []));

/**
 * Sidebar navigation. `dark` is the blue admin sidebar; the light variant is used on account pages
 * and in the phone menu. Only the best-matching link is highlighted.
 */
export function SideNav({ items, dark = false }: { items: NavItem[]; dark?: boolean }) {
  const path = usePathname();
  const query = useSearchParams().toString();
  const best = flatLinks(items).reduce<{ href: string; s: number }>((b, it) => {
    const s = score(it.href, path, query);
    return s > b.s ? { href: it.href, s } : b;
  }, { href: "", s: -1 }).href;

  const link = (it: NavLink, nested = false) => {
    const active = it.href === best;
    const cls = dark
      ? active ? "bg-white/10 font-semibold text-white hover:text-white" : "font-medium text-white/70 hover:bg-white/[0.06] hover:text-white"
      : active ? "bg-brand-tint font-semibold text-brand-dark hover:text-brand-dark" : "font-medium text-ink-soft hover:bg-page hover:text-heading";
    return (
      <Link key={it.href + it.label} href={it.href} aria-current={active ? "page" : undefined}
        className={`group relative flex min-h-[40px] items-center gap-3 rounded-xl px-3 font-display text-[13px] transition-colors ${nested ? "ml-4 min-h-[34px] pl-4" : ""} ${cls}`}>
        {active && dark ? <span aria-hidden className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-accent" /> : null}
        {it.icon && !nested ? <Icon name={it.icon} className={`h-[17px] w-[17px] shrink-0 ${active ? (dark ? "text-accent" : "") : dark ? "text-white/50 group-hover:text-white/80" : "text-ink-muted group-hover:text-brand"}`} /> : null}
        <span className="min-w-0 flex-1 truncate">{it.label}</span>
        {it.badge ? <span className="rounded-full bg-accent px-1.5 py-px text-[11px] font-bold text-ink">{it.badge}</span> : null}
      </Link>
    );
  };

  return (
    <nav aria-label={dark ? "Admin" : "Account"} className="flex flex-col gap-0.5">
      {items.map((it, i) => {
        if ("section" in it) {
          return <span key={i} className={`px-3 pb-1.5 pt-5 text-[10px] font-bold uppercase tracking-[0.16em] ${dark ? "text-white/35" : "text-ink-muted"}`}>{it.section}</span>;
        }
        if ("group" in it) {
          const open = it.items.some((x) => x.href === best);
          return (
            <details key={i} open={open} className="group/g [&_summary::-webkit-details-marker]:hidden">
              <summary className={`flex min-h-[40px] cursor-pointer list-none items-center gap-3 rounded-xl px-3 font-display text-[13px] font-medium transition-colors ${dark ? "text-white/70 hover:bg-white/[0.06] hover:text-white" : "text-ink-soft hover:bg-page hover:text-heading"}`}>
                {it.icon ? <Icon name={it.icon} className={`h-[17px] w-[17px] shrink-0 ${dark ? "text-white/50" : "text-ink-muted"}`} /> : null}
                <span className="flex-1">{it.group}</span>
                <span aria-hidden className="text-xs transition group-open/g:rotate-90">›</span>
              </summary>
              <div className={`mt-0.5 flex flex-col gap-0.5 border-l ${dark ? "border-white/10" : "border-line"} ml-5`}>
                {it.items.map((x) => link(x, true))}
              </div>
            </details>
          );
        }
        return link(it);
      })}
    </nav>
  );
}

/** Phones and tablets: a menu button in the top bar that opens the same navigation, closing on every page change. */
export function MobileNav({ items, footer }: { items: NavItem[]; footer?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const query = useSearchParams().toString();
  useEffect(() => setOpen(false), [path, query]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-heading">
        <Icon name={open ? "close" : "menu"} className="h-4 w-4" />
      </button>
      {open ? (
        <div className="fixed inset-x-0 bottom-0 top-14 z-40 flex flex-col overflow-y-auto bg-brand-deep px-3 pb-8 pt-2">
          <SideNav items={items} dark />
          {footer ? <div className="mt-6 border-t border-white/10 pt-4">{footer}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
