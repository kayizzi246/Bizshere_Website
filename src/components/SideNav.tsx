"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; badge?: number } | { section: string };

export function SideNav({ items, dark = false }: { items: NavItem[]; dark?: boolean }) {
  const path = usePathname();
  return (
    <nav aria-label={dark ? "Admin" : "Account"} className="flex flex-col gap-0.5">
      {items.map((it, i) => {
        if ("section" in it) {
          return <span key={i} className={`px-3 pb-1 pt-3.5 text-[11px] font-extrabold uppercase tracking-widest ${dark ? "text-[#9A958F]" : "text-ink-muted"}`}>{it.section}</span>;
        }
        const active = it.href === path || (it.href !== "/admin" && path.startsWith(it.href));
        const base = "flex min-h-[40px] items-center justify-between rounded-[9px] px-3 font-display text-sm";
        const cls = dark
          ? active ? "bg-brand font-bold text-white hover:text-white" : "font-semibold text-[#E7E4E0] hover:bg-[#1F1F1F] hover:text-white"
          : active ? "bg-brand-tint font-bold text-brand-dark" : "font-semibold text-ink-soft hover:bg-page hover:text-ink";
        return (
          <Link key={it.href + it.label} href={it.href} aria-current={active ? "page" : undefined} className={`${base} ${cls}`}>
            {it.label}
            {it.badge ? <span className="rounded-full bg-[#E8A33D] px-2 py-0.5 text-xs font-extrabold text-[#2B1A00]">{it.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
