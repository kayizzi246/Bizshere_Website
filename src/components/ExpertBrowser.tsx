"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { searchTerms } from "@/lib/search-terms";
import { useTypingHint } from "./TypingHint";
import { BrowseHero, Pager, syncAddress } from "./BrowseParts";
import { RecentStrip } from "./Recent";
import { BoardEmpty, DirectoryBoard } from "./DirectoryBoard";

/** One expert as the browser needs it: public fields only (email and phone stay on the member profile). */
export type BrowseExpert = {
  id: string; slug: string; href: string;
  /** The expert's own name, and their business. */
  name: string; business: string | null;
  country: string | null; category: string | null; specialties: string[]; online: boolean; photo: string | null;
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
 * DirectoryBoard: pinned tabs (categories, and "Advises online") with the sort, and the client's table. One box searches names, skills, towns and languages with the site's
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

  // Tabs: each category with its count (most first), then "Advises online"
  const cats = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of experts) if (e.category) m.set(e.category, (m.get(e.category) ?? 0) + 1);
    const list: [string, { name: string; n: number }][] = [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([s, n]) => [s, { name: s, n }]);
    const online = experts.filter((e) => e.online).length;
    return online ? [...list, [ONLINE, { name: "Advises online", n: online }] as [string, { name: string; n: number }]] : list;
  }, [experts]);

  const items = useMemo(() => {
    const terms = searchTerms(q);
    return experts
      .filter((e) => (!category || (category === ONLINE ? e.online : e.category === category || e.specialties.some((s) => s === category))) && terms.every((variants) => variants.some((v) => e.text.includes(v))))
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
        pager={<Pager current={current} pages={pages} goTo={goTo} />}
        listTop={listTop}>
        {items.length === 0 ? <BoardEmpty any={experts.length > 0} onClear={clear} /> : (
          <ExpertTable experts={shown} from={(current - 1) * PER_PAGE + 1} />
        )}
      </DirectoryBoard>
    </>
  );
}

/**
 * The client's table (24 Nov 2026): S/N, expert name, business name, country, category, specialty. The whole row opens
 * the profile. Phones: each expert is a card with the same details by name, as six columns don't fit.
 */
function ExpertTable({ experts, from }: { experts: BrowseExpert[]; from: number }) {
  const th = "px-4 py-3 text-left text-[12px] font-semibold text-white";
  const td = "px-4 py-3.5 align-middle text-[13px] text-ink-soft";
  return (
    <>
      <div className="hidden overflow-x-auto rounded-2xl border border-line bg-white md:block">
        <table className="w-full border-collapse">
          <thead className="bg-brand-deep"><tr>
            <th scope="col" className={`${th} w-14`}>S/N</th><th scope="col" className={th}>Expert name</th><th scope="col" className={th}>Business name</th>
            <th scope="col" className={th}>Country</th><th scope="col" className={th}>Category</th><th scope="col" className={th}>Specialty</th>
          </tr></thead>
          <tbody>
            {experts.map((e, n) => (
              <tr key={e.id} id={e.slug} className="relative border-t border-line transition-colors hover:bg-brand-tint/50">
                <td className={`${td} tabular-nums text-ink-muted`}>{from + n}</td>
                <td className={td}>
                  <span className="flex items-center gap-3">
                    <Face e={e} />
                    {/* The link's ::after covers the row, so a tap anywhere on it opens the profile */}
                    <Link href={e.href} className="font-display text-[14px] font-bold text-heading after:absolute after:inset-0 hover:text-brand">{e.name}</Link>
                  </span>
                </td>
                <td className={`${td} font-medium text-heading`}>{e.business ?? "—"}</td>
                <td className={td}>{e.country ?? "—"}</td>
                <td className={td}>{e.category ?? "—"}</td>
                <td className={td}>{e.specialties.join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ol className="flex flex-col gap-3 md:hidden">
        {experts.map((e, n) => (
          <li key={e.id} className="relative flex flex-col gap-3 rounded-2xl border border-line bg-white p-4">
            <span className="flex items-center gap-3">
              <Face e={e} />
              <span className="flex min-w-0 flex-1 flex-col">
                <Link href={e.href} className="font-display text-[15px] font-bold leading-snug text-heading after:absolute after:inset-0">{e.name}</Link>
                {e.business ? <span className="text-[13px] text-ink-soft">{e.business}</span> : null}
              </span>
              <span className="self-start text-[12px] tabular-nums text-ink-muted">{from + n}</span>
            </span>
            <dl className="grid grid-cols-[84px_minmax(0,1fr)] gap-x-3 gap-y-1.5 border-t border-line pt-3 text-[13px]">
              {([["Country", e.country], ["Category", e.category], ["Specialty", e.specialties.join(", ")]] as const).map(([k, v]) => v ? <Fragment key={k}><dt className="text-ink-muted">{k}</dt><dd className="text-heading">{v}</dd></Fragment> : null)}
            </dl>
          </li>
        ))}
      </ol>
    </>
  );
}

/** The photo or logo, or the initials. */
function Face({ e }: { e: BrowseExpert }) {
  return (
    <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-brand-tint text-[12px] font-bold text-brand">
      {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or editor-entered address */}
      {e.photo ? <img src={e.photo} alt="" loading="lazy" className="h-full w-full object-cover" /> : e.name.split(/ +/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
    </span>
  );
}
