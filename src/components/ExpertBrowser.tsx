"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, LockKeyhole, MonitorSmartphone, Star } from "lucide-react";
import { searchTerms } from "@/lib/search-terms";
import { useTypingHint } from "./TypingHint";
import { BrowseHero, Pager, syncAddress } from "./BrowseParts";
import { RecentStrip } from "./Recent";
import { BoardAside, BoardEmpty, DirectoryBoard, gridList } from "./DirectoryBoard";

/** One expert as the browser needs it: public fields only (email and phone stay on the member profile). */
export type BrowseExpert = {
  id: string; slug: string; href: string; name: string; about: string | null; place: string | null;
  category: string | null; specialties: string[]; online: boolean; photo: string | null;
  /** Contact person shown as the seller, when set. */
  person: string | null;
  /** Starting fee for members (e.g. "From UGX 50,000 per hour"); null when unknown. */
  fee: string | null;
  /** True when a fee exists but the viewer isn't a member (shown as a lock). */
  feeLocked: boolean;
  /** Average review rating (1–5, one decimal) and how many approved reviews, for the Fiverr-style card. */
  rating: number | null; reviews: number;
  /** Newest-first position */
  order: number;
  /** Everything the search looks in, lower case: name, business, title, summary, category, town, country, skills, languages */
  text: string;
};

const PER_PAGE = 24;
const ONLINE = "online";
const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "az", label: "A to Z" },
] as const;
type Sort = (typeof SORTS)[number]["value"];

/**
 * Business Experts laid out like Business Ideas (client, 13 Nov 2026): a short hero with the search, then the
 * DirectoryBoard: pinned tabs (specialties, most common first, and "Advises online") with the sort, a photo grid
 * four a row beside the side column. One box searches names, skills, towns and languages with the site's
 * forgiving search words; it all happens on the page and the address keeps the choices.
 */
export function ExpertBrowser({ experts, intro, initial }: {
  experts: BrowseExpert[];
  intro: string;
  initial: { q: string; category: string; sort: string; page: number };
}) {
  const [q, setQ] = useState(initial.q);
  const [category, setCategory] = useState(initial.category);
  const [sort, setSort] = useState<Sort>(SORTS.some((s) => s.value === initial.sort) ? (initial.sort as Sort) : "newest");
  const [page, setPage] = useState(initial.page);
  const listTop = useRef<HTMLElement>(null);

  // Tabs: each specialty with its count (most common first), then "Advises online"
  const cats = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of experts) for (const s of e.specialties) m.set(s, (m.get(s) ?? 0) + 1);
    const list: [string, { name: string; n: number }][] = [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([s, n]) => [s, { name: s, n }]);
    const online = experts.filter((e) => e.online).length;
    return online ? [...list, [ONLINE, { name: "Advises online", n: online }] as [string, { name: string; n: number }]] : list;
  }, [experts]);

  const items = useMemo(() => {
    const terms = searchTerms(q);
    return experts
      .filter((e) => (!category || (category === ONLINE ? e.online : e.specialties.some((s) => s === category))) && terms.every((variants) => variants.some((v) => e.text.includes(v))))
      .sort(sort === "az" ? (a, b) => a.name.localeCompare(b.name) : (a, b) => a.order - b.order);
  }, [experts, q, category, sort]);

  const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const current = Math.min(page, pages);
  const shown = items.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const chosenName = cats.find(([id]) => id === category)?.[1].name;
  const hint = useTypingHint(["tax Kampala", "export", "accounting", "farming"], { prefix: "Name, skill or town, e.g. ", paused: Boolean(q) });

  useEffect(() => syncAddress("/experts", { q, category, sort, defaultSort: "newest", page: current }), [q, category, sort, current]);

  const toList = () => listTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const goTo = (n: number) => { setPage(n); toList(); };
  const clear = () => { setQ(""); setCategory(""); setPage(1); };
  const pick = (id: string) => { setCategory(id); setPage(1); };
  const order = (v: Sort) => { setSort(v); setPage(1); };
  const heading = q.trim() ? `Results for “${q.trim()}”${chosenName ? ` in ${chosenName}` : ""}` : category === ONLINE ? "Experts who advise online" : chosenName ? `${chosenName} experts` : "Advisors you can talk to";

  return (
    <>
      <BrowseHero title="Find the right expert" intro={intro} q={q} onSearch={(v) => { setQ(v); setPage(1); }} onSubmit={toList}
        hint={hint} label="Search experts" popular={[]} cats={[]} category={category} onCategory={pick} sort={sort} sorts={SORTS} onSort={order} compact />
      <DirectoryBoard crumb="Business Experts" heading={heading} count={items.length} cats={cats} category={category} onCategory={pick} sort={sort} sorts={SORTS} onSort={order}
        top={<RecentStrip only="/experts" />}
        aside={<BoardAside path="/experts" locked={false} tabs={[["/experts/join", "Become an Expert"], ["/business-ideas", "Business Ideas"]]}
          help={{ title: "Can't find who you need?", text: "Tell our team what you need help with and we'll find the right person." }} helpLink={["/contact", "Tell our team"]} />}
        pager={<Pager current={current} pages={pages} goTo={goTo} />}
        listTop={listTop}>
        {items.length === 0 ? <BoardEmpty any={experts.length > 0} onClear={clear} /> : (
          <ul className={gridList}>
            {shown.map((e) => <li key={e.id} id={e.slug}><ExpertTile e={e} /></li>)}
          </ul>
        )}
      </DirectoryBoard>
    </>
  );
}

/**
 * One expert as a Fiverr-style gig card (client, 14 Nov 2026): a cover photo with a save heart, the
 * seller row (avatar + contact person or business, and their line of work), the gig title (the services
 * or short description), the rating, then the starting fee. The whole card links to the profile.
 */
function ExpertTile({ e }: { e: BrowseExpert }) {
  const initials = e.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const seller = e.person ?? e.name;
  const line = e.category ?? "Business expert";
  const gig = (e.specialties.length ? e.specialties.join(", ") : e.about) || `${e.name} — ${line}`;
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-md border border-line bg-surface transition-colors hover:border-brand">
      {/* Cover photo */}
      <Link href={e.href} aria-label={e.name} className="relative block aspect-[4/3] overflow-hidden bg-page">
        {e.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.photo} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-brand-tint text-[34px] font-extrabold tracking-[-0.03em] text-brand/70">{initials}</span>
        )}
        <span className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface/90 text-ink-soft" aria-hidden><Heart className="h-4 w-4" /></span>
        {e.online ? <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-surface/90 px-2 py-0.5 text-[11px] font-semibold text-ink-soft"><MonitorSmartphone className="h-3 w-3" />Online</span> : null}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3">
        {/* Seller row */}
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-tint text-[10px] font-bold text-brand">
            {e.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={e.photo} alt="" className="h-full w-full object-cover" />
            ) : initials}
          </span>
          <span className="truncate text-[13px] font-semibold text-heading">{seller}</span>
          <span aria-hidden className="text-ink-muted">·</span>
          <span className="truncate text-[12px] text-ink-muted">{line}</span>
        </div>

        {/* Gig title */}
        <Link href={e.href} className="line-clamp-2 min-h-[2.4em] text-[13px] font-medium leading-snug text-ink hover:text-brand">{gig}</Link>

        {/* Rating */}
        <div className="flex items-center gap-1 text-[12px]">
          {e.rating != null ? (
            <><Star className="h-3.5 w-3.5 fill-[#ffb33e] text-[#ffb33e]" aria-hidden /><span className="font-bold text-heading">{e.rating.toFixed(1)}</span><span className="text-ink-muted">({e.reviews})</span></>
          ) : <span className="text-ink-muted">New expert</span>}
          {e.place ? <><span aria-hidden className="text-ink-muted">·</span><span className="truncate text-ink-muted">{e.place}</span></> : null}
        </div>

        {/* Footer: starting fee */}
        <div className="mt-auto flex items-center justify-between border-t border-line pt-2">
          {e.feeLocked ? (
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink-muted"><LockKeyhole className="h-3.5 w-3.5" />Price for members</span>
          ) : e.fee ? (
            <span className="text-[11px] uppercase tracking-wide text-ink-muted">Starting at <strong className="ml-1 text-[14px] normal-case tracking-normal text-heading">{e.fee.replace(/^From\s*/i, "")}</strong></span>
          ) : <span className="text-[12px] text-ink-muted">Contact for a quote</span>}
          <Link href={e.href} aria-label={`View ${e.name}`} className="text-[12px] font-semibold text-brand hover:text-brand-dark">View →</Link>
        </div>
      </div>
    </div>
  );
}
