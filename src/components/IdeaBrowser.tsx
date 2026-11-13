"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { type CardIdea } from "./IdeaParts";
import { compactRange } from "@/lib/format";
import { BoardAside, BoardEmpty, DirectoryBoard, GridFrame, gridChip, gridList, softButton, solidButton } from "./DirectoryBoard";
import { useTypingHint } from "./TypingHint";
import { BrowseHero, Pager, countCategories, syncAddress } from "./BrowseParts";
import { RecentStrip } from "./Recent";

/** A card plus what the in-page search and sort need. `order` is the newest-first position. */
export type BrowseIdea = CardIdea & { order: number; reqs: number; capital: number | null; text: string };

const PER_PAGE = 12;
const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "capital-low", label: "Lowest capital" },
  { value: "capital-high", label: "Highest capital" },
  { value: "requirements", label: "Most requirements" },
  { value: "az", label: "A to Z" },
] as const;
type Sort = (typeof SORTS)[number]["value"];

const name = (i: BrowseIdea) => i.title.replace(/^Sample:\s*/i, "");
// Unpriced ideas go last whichever way capital is sorted.
const byCapital = (dir: 1 | -1) => (a: BrowseIdea, b: BrowseIdea) =>
  a.capital === null ? (b.capital === null ? 0 : 1) : b.capital === null ? -1 : dir * (a.capital - b.capital);
const SORTERS: Record<Sort, (a: BrowseIdea, b: BrowseIdea) => number> = {
  newest: (a, b) => a.order - b.order,
  "capital-low": byCapital(1),
  "capital-high": byCapital(-1),
  requirements: (a, b) => b.reqs - a.reqs || a.order - b.order,
  az: (a, b) => name(a).localeCompare(name(b)),
};

/**
 * Business ideas page body: hero with the search box, category chips, sort and the paged card grid.
 * Searching, filtering and sorting all happen on the page (no reload); the address bar keeps the
 * choices (?q=…&category=…&sort=…&page=…) so a search can be shared or bookmarked.
 */
export function IdeaBrowser({ ideas, intro, initial }: {
  ideas: BrowseIdea[];
  intro: string;
  initial: { q: string; category: string; sort: string; page: number };
}) {
  const [q, setQ] = useState(initial.q);
  const [category, setCategory] = useState(initial.category);
  const [sort, setSort] = useState<Sort>(SORTS.some((s) => s.value === initial.sort) ? (initial.sort as Sort) : "newest");
  const [page, setPage] = useState(initial.page);
  const listTop = useRef<HTMLElement>(null);

  const cats = useMemo(() => countCategories(ideas), [ideas]);

  // Every word typed must appear somewhere in the idea (name, summary, category, requirements).
  const items = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return ideas
      .filter((i) => (!category || i.primaryCategory?.id === category) && words.every((w) => i.text.includes(w)))
      .sort(SORTERS[sort]);
  }, [ideas, q, category, sort]);

  const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const current = Math.min(page, pages);
  const shown = items.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const chosenName = cats.find(([id]) => id === category)?.[1].name;
  // Examples for the search box and the "Popular" links: the newest ideas' names.
  const examples = useMemo(() => ideas.slice(0, 6).map((i) => name(i).toLowerCase()), [ideas]);
  const hint = useTypingHint(examples.length ? examples : ["bakery"], { prefix: "Search business ideas, e.g. ", paused: Boolean(q) });

  useEffect(() => syncAddress("/business-ideas", { q, category, sort, defaultSort: "newest", page: current }), [q, category, sort, current]);

  const toList = () => listTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const goTo = (n: number) => { setPage(n); toList(); };
  const clear = () => { setQ(""); setCategory(""); setPage(1); };
  const pick = (id: string) => { setCategory(id); setPage(1); };
  const order = (v: Sort) => { setSort(v); setPage(1); };

  return (
    <>
      <BrowseHero
        title="Business ideas to start in Uganda"
        intro={intro}
        q={q}
        onSearch={(v) => { setQ(v); setPage(1); }}
        onSubmit={toList}
        hint={hint}
        label="Search business ideas"
        popular={[]}
        cats={cats}
        category={category}
        onCategory={pick}
        sort={sort}
        sorts={SORTS}
        onSort={order}
        compact
      />
      {/* The same job-board style list as every directory (DirectoryBoard; client, 13 Nov 2026) */}
      <DirectoryBoard crumb="Business Ideas" count={items.length} cats={cats} category={category} onCategory={pick} sort={sort} sorts={SORTS} onSort={order}
        heading={q.trim() ? `Results for “${q.trim()}”${chosenName ? ` in ${chosenName}` : ""}` : chosenName ? `${chosenName} business ideas` : "Businesses you can start"}
        top={<RecentStrip only="/business-ideas" />}
        aside={<BoardAside path="/business-ideas" locked={false} tabs={[["/machines", "Business machines"], ["/funding", "Funding Sources"]]}
          help={{ title: "Not sure where to start?", text: "A business expert can help you pick an idea and plan your budget." }} />}
        pager={<Pager current={current} pages={pages} goTo={goTo} />}
        listTop={listTop}>
        {/* A photo grid beside the side column, four a row from 1280px (client, 13 Nov 2026) */}
        {items.length === 0 ? <BoardEmpty any={ideas.length > 0} onClear={clear} /> : (
          <ul className={gridList}>
            {shown.map((i) => <li key={i.id} id={i.slug}><IdeaTile idea={i} /></li>)}
          </ul>
        )}
      </DirectoryBoard>
    </>
  );
}

/** One business idea as a grid card: photo, category and requirements, name, start-up capital, summary, Budget and Details. */
function IdeaTile({ idea }: { idea: BrowseIdea }) {
  const href = `/business-ideas/${idea.slug}`;
  const bi = idea.businessIdea;
  const cost = bi ? compactRange(bi.capitalMin, bi.capitalMax, bi.currency) : null;
  const hasBudget = Boolean(bi?.scenarios.some((sc) => sc._count.lines > 0));
  return (
    <GridFrame id={idea.id} href={href} title={name(idea)} src={bi?.pictureUrl} icon="idea"
      meta={<>
        <span className="truncate font-semibold text-accent-dark">{idea.primaryCategory?.name ?? "Business idea"}</span>
        {idea.reqs ? <><span aria-hidden>·</span><span className="shrink-0">{idea.reqs} requirement{idea.reqs === 1 ? "" : "s"}</span></> : null}
      </>}
      pills={<li className={`${gridChip} ${cost ? "font-semibold text-heading" : ""}`}><Wallet aria-hidden className="h-3 w-3 shrink-0 text-ink-muted" /><span className="truncate">{cost ?? "Being priced"}</span></li>}
      body={idea.shortSummary ? <p data-size="" className="line-clamp-2 text-[12px] leading-snug text-ink-muted">{idea.shortSummary}</p> : null}
      actions={<>
        {hasBudget ? <Link href={`${href}/requirements`} className={softButton}>Budget</Link> : null}
        <Link href={href} className={solidButton}>Details</Link>
      </>}
    />
  );
}
