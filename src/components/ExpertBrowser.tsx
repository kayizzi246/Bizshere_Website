"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, MonitorSmartphone } from "lucide-react";
import { searchTerms } from "@/lib/search-terms";
import { useTypingHint } from "./TypingHint";
import { BrowseHero, Pager, syncAddress } from "./BrowseParts";
import { RecentStrip } from "./Recent";
import { BoardAside, BoardEmpty, DirectoryBoard, GridFrame, gridChip, gridList, solidButton } from "./DirectoryBoard";

/** One expert as the browser needs it: public fields only (email and phone stay on the member profile). */
export type BrowseExpert = {
  id: string; slug: string; href: string; name: string; about: string | null; place: string | null;
  category: string | null; specialties: string[]; online: boolean; photo: string | null;
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

/** One expert as a grid card: photo (or initials), category and town, name, specialties, a short line, Profile. */
function ExpertTile({ e }: { e: BrowseExpert }) {
  const initials = e.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <GridFrame id={e.id} href={e.href} title={e.name} src={e.photo} icon="expert" cover
      placeholder={<span className="text-[34px] font-extrabold tracking-[-0.03em] text-brand/70">{initials}</span>}
      meta={<>
        <span className="truncate font-semibold text-accent-dark">{e.category ?? "Business expert"}</span>
        {e.place ? <><span aria-hidden>·</span><span className="truncate">{e.place}</span></> : null}
      </>}
      pills={<>
        {e.specialties.slice(0, 2).map((s) => <li key={s} className={gridChip}><BadgeCheck aria-hidden className="h-3 w-3 shrink-0 text-ink-muted" /><span className="truncate">{s}</span></li>)}
        {e.online ? <li className={gridChip}><MonitorSmartphone aria-hidden className="h-3 w-3 shrink-0 text-ink-muted" />Online</li> : null}
      </>}
      body={e.about ? <p data-size="" className="line-clamp-2 text-[12px] leading-snug text-ink-muted">{e.about}</p> : null}
      actions={<Link href={e.href} className={solidButton}>Profile</Link>}
    />
  );
}
