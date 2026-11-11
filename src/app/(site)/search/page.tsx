import Link from "next/link";
import { GlassSelect } from "@/components/GlassSelect";
import { LockKeyhole, SlidersHorizontal } from "lucide-react";
import { DIRECTORIES } from "@/config/directories";
import { getViewer } from "@/lib/access";
import { googleEnabled } from "@/lib/auth";
import { cachedMemberPlan } from "@/lib/cached";
import { prisma } from "@/lib/prisma";
import { contentTypeLabel, date, itemHref, money } from "@/lib/format";
import { searchPrices } from "@/lib/directory-search";
import {
  advancedSearch, CONDITIONS, FUNDING_TYPES, GROUPS, hasAdvanced, PAGE_SIZE, parseSearch, PRICES_GROUP,
  searchChoices, SORTS, STAGES, TOPICS, UPDATED, type ResultRow, type SearchParams,
} from "@/lib/advanced-search";
import { saveSearch } from "@/app/actions/member";
import { AutoSubmit } from "@/components/AutoSubmit";
import { Gate } from "@/components/Gate";
import { Icon } from "@/components/Icon";
import { IdeaPhoto } from "@/components/IdeaParts";
import { OnboardingGate } from "@/components/Onboarding";
import { WishlistHeart } from "@/components/Wishlist";
import { popupPlan } from "@/lib/billing";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search" };

const cap = (s?: string | null) => (s ? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ") : null);

/**
 * Search everything: a search bar with an advanced panel (words, phrase, directory, industry,
 * district, stage, budget, freshness), then the results with a tab per section and how many each has
 * (client, 11 Nov 2026: a visitor must find what they came for). Machine condition and funding type show
 * as chips when that section is chosen. With nothing typed yet, every section is offered as a tile.
 * Contacts, prices and amounts stay member-only.
 */
// Links here don't prefetch: a page of results, topics and filters prefetched dozens of pages at once and
// ran the database out of connections (live logs, 7 Nov 2026). They open as soon as they are clicked.
export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const viewer = await getViewer();
  const p = parseSearch(searchParams);
  const pricesOnly = p.show.length === 1 && p.show[0] === PRICES_GROUP.id;
  const withPrices = p.show.includes(PRICES_GROUP.id) && (pricesOnly || p.q);

  // Searching in one section: the other tabs still need their counts, from the same search across every section
  const narrowed = p.show.length < GROUPS.length;
  const [{ total, rows, loose, counts: ownCounts }, prices, choices, memberPlan, savedIds, everywhere] = await Promise.all([
    pricesOnly ? Promise.resolve({ total: 0, rows: [] as ResultRow[], loose: false, counts: {} as Record<string, number> }) : advancedSearch(p, { member: viewer.isMember }),
    withPrices ? searchPrices(p.q, {}) : Promise.resolve([]),
    searchChoices(),
    cachedMemberPlan(),
    viewer.userId ? prisma.savedItem.findMany({ where: { userId: viewer.userId }, select: { contentItemId: true } }).then((r) => new Set(r.map((s) => s.contentItemId))) : Promise.resolve(new Set<string>()),
    narrowed ? advancedSearch({ ...p, show: GROUPS.map((g) => g.id), cond: [], ftype: [], page: 1 }, { member: viewer.isMember, countsOnly: true }) : null,
  ]);
  const counts = everywhere?.counts ?? ownCounts;
  const everyTotal = everywhere?.total ?? total;
  // Nothing asked yet: offer every section instead of a long list of everything
  const starting = !p.q && !p.topic && !hasAdvanced(p) && !narrowed;
  const count = pricesOnly ? prices.length : total;
  if (p.page === 1) await prisma.searchEvent.create({ data: { userId: viewer.userId, query: p.q, filters: searchParams as object, resultsCount: count } }).catch(() => undefined);

  // Links that change one thing and keep the rest of the search.
  const base = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) for (const x of Array.isArray(v) ? v : v ? [v] : []) if (x && k !== "page") base.append(k, x);
  const url = (drop: [string, string?][], set: Record<string, string> = {}) => {
    const u = new URLSearchParams(base);
    for (const [k, v] of drop) {
      if (v === undefined) u.delete(k);
      else { const rest = u.getAll(k).filter((x) => x !== v); u.delete(k); rest.forEach((x) => u.append(k, x)); }
    }
    for (const [k, v] of Object.entries(set)) u.set(k, v);
    const s = u.toString();
    return s ? `/search?${s}` : "/search";
  };

  const name = (list: { id: string; name: string }[], id: string) => list.find((x) => x.id === id)?.name ?? id;
  const allShown = p.show.length >= GROUPS.length && !p.show.includes(PRICES_GROUP.id) || p.show.length === GROUPS.length + 1;
  const chips: { label: string; href: string }[] = [
    ...(p.q ? [{ label: `“${p.q}”`, href: url([["q"]]) }] : []),
    ...(p.topic ? [{ label: `Topic: ${TOPICS.find((t) => t.id === p.topic)!.label}`, href: url([["topic"]]) }] : []),
    ...(p.all ? [{ label: `All of: ${p.all}`, href: url([["all"]]) }] : []),
    ...(p.phrase ? [{ label: `Phrase: “${p.phrase}”`, href: url([["phrase"]]) }] : []),
    ...(p.none ? [{ label: `Without: ${p.none}`, href: url([["none"]]) }] : []),
    ...(!allShown ? p.show.map((s) => ({ label: [...GROUPS, PRICES_GROUP].find((g) => g.id === s)!.label, href: url([["show", s], ["dir"]]) })) : []),
    ...(p.category ? [{ label: name(choices.categories, p.category), href: url([["category"]]) }] : []),
    ...(p.district ? [{ label: name(choices.districts, p.district), href: url([["district"]]) }] : []),
    ...(p.stage ? [{ label: STAGES.find(([k]) => k === p.stage)![1], href: url([["stage"]]) }] : []),
    ...(p.updated ? [{ label: UPDATED.find(([k]) => k === p.updated)![1], href: url([["updated"]]) }] : []),
    ...(viewer.isMember && p.budgetMin !== null ? [{ label: `From ${money(p.budgetMin)}`, href: url([["budgetMin"]]) }] : []),
    ...(viewer.isMember && p.budgetMax !== null ? [{ label: `Up to ${money(p.budgetMax)}`, href: url([["budgetMax"]]) }] : []),
    ...(p.checked ? [{ label: "Checked contacts", href: url([["checked"]]) }] : []),
    ...(p.openRounds ? [{ label: "Open rounds", href: url([["open"]]) }] : []),
    ...(p.install ? [{ label: "Installation support", href: url([["install"]]) }] : []),
    ...p.cond.map((c) => ({ label: CONDITIONS.find(([k]) => k === c)![1], href: url([["cond", c]]) })),
    ...p.ftype.map((c) => ({ label: FUNDING_TYPES.find(([k]) => k === c)![1], href: url([["ftype", c]]) })),
  ];
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const dir = typeof searchParams.dir === "string" ? searchParams.dir : "";
  // Closed until asked for (the Advanced search button); open by itself when an advanced field is in use, or ?advanced=1.
  const advancedOpen = hasAdvanced(p) || p.advanced;
  const plan = popupPlan(memberPlan);

  return (
    <form action="/search" className="bg-page">
      <AutoSubmit />

      {/* ── Search bar and advanced panel ── */}
      <section className="under-header hero-glow hero-still bg-navy">
        <div className="container-site flex flex-col gap-4 py-6 lg:py-8">
          <div className="flex flex-col gap-1">
            <h1 className="text-page-title text-white">What are you looking for?</h1>
            <p className="text-[15px] text-white/75">Type a word, like <em>flour</em>, <em>loan</em> or <em>bakery</em>. We look in every part of the website at once.</p>
          </div>
          {/* A plain checkbox (no name, so it isn't sent) opens and closes the panel without JavaScript */}
          <div className="group/adv flex flex-col">
            <input id="adv-toggle" type="checkbox" defaultChecked={advancedOpen} className="peer sr-only" />
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <span className="flex min-h-[52px] min-w-0 flex-1 items-center gap-3 rounded-xl border border-line-strong bg-white px-4 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
                <Icon name="search" className="h-5 w-5 shrink-0 text-ink-muted" />
                <input name="q" type="search" defaultValue={p.q} aria-label="Search" placeholder="Search ideas, machines, suppliers, funding, experts…" className="w-full min-w-0 bg-transparent text-base outline-none placeholder:text-ink-muted" />
              </span>
              <div className="flex gap-2.5">
                <button className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-[10px] bg-accent px-7 text-[15px] font-bold text-ink transition-colors hover:bg-white sm:flex-none">Search</button>
                <label htmlFor="adv-toggle" className="btn-outline min-h-[52px] flex-1 cursor-pointer whitespace-nowrap bg-white peer-focus-visible:ring-4 sm:flex-none">
                  <SlidersHorizontal aria-hidden className="h-4 w-4" />
                  <span className="group-has-[#adv-toggle:checked]/adv:hidden">Advanced search</span>
                  <span className="hidden group-has-[#adv-toggle:checked]/adv:inline">Hide advanced search</span>
                </label>
              </div>
            </div>

            {/* What people come to do: one tap shows every page about that task, across all directories */}
            <div className="mt-4 flex flex-col gap-2">
              <span className="text-[14px] font-semibold text-white">What do you need to do?</span>
              <ul aria-label="Topics" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible">
                {TOPICS.map((t) => {
                  const on = p.topic === t.id;
                  return (
                    <li key={t.id} className="shrink-0">
                      <Link prefetch={false} href={url([["topic"], ["page"]], on ? {} : { topic: t.id })} aria-current={on ? "true" : undefined}
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${on ? "border-accent bg-accent text-ink hover:text-ink" : "border-white bg-white text-ink-soft hover:text-brand"}`}>
                        {t.label}{on ? <span aria-hidden>×</span> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div data-manual="" className="mt-4 hidden rounded-2xl border border-line bg-white group-has-[#adv-toggle:checked]/adv:block">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-4 sm:px-6">
                <h2 className="text-base font-extrabold text-heading">Advanced search</h2>
                <p className="text-[13px] text-ink-muted">Combine words, directories and filters</p>
              </div>
              <div className="flex flex-col gap-4 p-5 sm:p-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="All of these words"><input name="all" defaultValue={p.all} placeholder="e.g. maize flour" className="input w-full" /></Field>
                  <Field label="This exact phrase"><input name="phrase" defaultValue={p.phrase} placeholder="e.g. hammer mill" className="input w-full" /></Field>
                  <Field label="None of these words"><input name="none" defaultValue={p.none} placeholder="e.g. used" className="input w-full" /></Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Directory">
<GlassSelect name="dir" label="Directory" defaultValue={dir} className="h-11 rounded-xl border border-line bg-white px-3 text-[14px] font-medium text-heading hover:border-brand" options={[{ value: "", label: "All directories" }, ...GROUPS.map((g) => ({ value: g.id, label: g.label })), { value: PRICES_GROUP.id, label: PRICES_GROUP.label }]} />
                  </Field>
                  <Field label="Industry">
<GlassSelect name="category" label="Industry" defaultValue={p.category ?? ""} className="h-11 rounded-xl border border-line bg-white px-3 text-[14px] font-medium text-heading hover:border-brand" options={[{ value: "", label: "Any industry" }, ...choices.categories.map((c) => ({ value: c.id, label: c.name }))]} />
                  </Field>
                  <Field label="District">
<GlassSelect name="district" label="District" defaultValue={p.district ?? ""} className="h-11 rounded-xl border border-line bg-white px-3 text-[14px] font-medium text-heading hover:border-brand" options={[{ value: "", label: "Any district" }, ...choices.districts.map((c) => ({ value: c.id, label: c.name }))]} />
                  </Field>
                  <Field label="Business stage">
<GlassSelect name="stage" label="Business stage" defaultValue={p.stage ?? ""} className="h-11 rounded-xl border border-line bg-white px-3 text-[14px] font-medium text-heading hover:border-brand" options={[{ value: "", label: "Any stage" }, ...STAGES.map(([k, l]) => ({ value: k, label: l }))]} />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Budgets match machine prices and funding amounts, which only members can see */}
                  <Field label={<>Budget from (UGX){viewer.isMember ? null : <Lock />}</>}>
                    <input name="budgetMin" inputMode="numeric" defaultValue={viewer.isMember ? p.budgetMin ?? "" : ""} disabled={!viewer.isMember} placeholder={viewer.isMember ? "e.g. 1,000,000" : "Members only"} className="input w-full disabled:bg-page" />
                  </Field>
                  <Field label={<>Budget to (UGX){viewer.isMember ? null : <Lock />}</>}>
                    <input name="budgetMax" inputMode="numeric" defaultValue={viewer.isMember ? p.budgetMax ?? "" : ""} disabled={!viewer.isMember} placeholder={viewer.isMember ? "e.g. 10,000,000" : "Members only"} className="input w-full disabled:bg-page" />
                  </Field>
                  <Field label="Updated within">
<GlassSelect name="updated" label="Updated within" defaultValue={p.updated ?? ""} className="h-11 rounded-xl border border-line bg-white px-3 text-[14px] font-medium text-heading hover:border-brand" options={UPDATED.map(([k, l]) => ({ value: k, label: l }))} />
                  </Field>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-3 pt-1">
                  <Check name="checked" checked={p.checked}>Checked contacts only</Check>
                  <Check name="open" checked={p.openRounds}>Open funding rounds only</Check>
                  <Check name="install" checked={p.install}>Local installation support</Check>
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2.5 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
                <Link prefetch={false} href="/search?adv=1" className="btn min-h-[44px] text-ink-soft hover:text-brand sm:mr-auto">Clear all</Link>
                <button formAction={saveSearch} className="btn-outline"><Icon name="bell" className="h-4 w-4" />Save this search</button>
                <button className="btn-primary px-7">Apply filters</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <OnboardingGate signedIn={Boolean(viewer.userId)} isMember={viewer.isMember} googleEnabled={googleEnabled} plan={plan}>
      <div className="container-site flex flex-col gap-5 py-6 lg:py-8">
        {/* ── Nothing typed yet: every section as a tile ── */}
        {starting ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-extrabold text-heading">Or pick a section</h2>
            <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {DIRECTORIES.map((d) => (
                <li key={d.href}>
                  <Link prefetch={false} href={d.href} className="group flex h-full items-start gap-3 rounded-2xl border border-line bg-white p-3.5 text-ink transition-colors hover:border-brand hover:text-ink">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand group-hover:bg-brand group-hover:text-white"><Icon name={d.icon} className="h-5 w-5" /></span>
                    <span className="flex min-w-0 flex-col gap-0.5"><span className="font-display text-[14px] font-bold leading-tight text-heading">{d.title}</span><span className="line-clamp-2 text-[12px] leading-snug text-ink-muted">{d.text}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* ── Results ── */}
        <section className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-heading">{p.q ? <>Results for “{p.q}”</> : p.topic ? TOPICS.find((t) => t.id === p.topic)!.label : starting ? "Recently checked by our team" : "All results"}</h2>
              <p className="mt-0.5 text-sm text-ink-muted">{count.toLocaleString()} {count === 1 ? "result" : "results"}{pages > 1 ? ` · page ${p.page} of ${pages}` : ""}</p>
            </div>
            {!pricesOnly ? (
              <div className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
                <span aria-hidden>Sort by</span>
                <GlassSelect name="sort" label="Sort by" defaultValue={p.sort ?? ""} panelClassName="right-0 left-auto" className="h-10 min-w-[10rem] rounded-xl border border-line bg-white px-3 text-sm font-semibold text-heading hover:border-brand" options={SORTS.map(([k, l]) => ({ value: k, label: l }))} />
              </div>
            ) : null}
          </div>

          {/* A tab per section, with how many results each has: one tap narrows the results */}
          {!starting && everyTotal > 0 ? (
            <nav aria-label="Sections" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
              <ul className="flex gap-2 sm:flex-wrap">
                <li><Tab href={url([["dir"], ["show"], ["cond"], ["ftype"]])} on={!narrowed} label="Everything" n={everyTotal} /></li>
                {GROUPS.filter((g) => counts[g.id] || p.show.length === 1 && p.show[0] === g.id).map((g) => (
                  <li key={g.id}><Tab href={url([["dir"], ["show"], ["cond"], ["ftype"]], { dir: g.id })} on={p.show.length === 1 && p.show[0] === g.id} label={g.label} n={counts[g.id] ?? 0} /></li>
                ))}
                {p.q ? <li><Tab href={url([["dir"], ["show"], ["cond"], ["ftype"]], { dir: PRICES_GROUP.id })} on={pricesOnly} label={PRICES_GROUP.label} /></li> : null}
              </ul>
            </nav>
          ) : null}

          {/* The filters of one section, only when that section is chosen */}
          {p.show.length === 1 && p.show[0] === "machines" ? <Chips label="Condition" name="cond" list={CONDITIONS} on={p.cond} url={url} /> : null}
          {p.show.length === 1 && p.show[0] === "funding" ? <Chips label="Type of money" name="ftype" list={FUNDING_TYPES.filter(([k]) => k !== "OTHER")} on={p.ftype} url={url} /> : null}

          {chips.length ? (
            <ul className="flex flex-wrap gap-2">
              {chips.map((c) => (
                <li key={c.href + c.label}>
                  <Link prefetch={false} href={c.href} className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand-tint py-1 pl-3 pr-2 text-xs font-semibold text-brand-dark hover:border-brand hover:text-brand-dark">
                    {c.label}<Icon name="close" className="h-3 w-3" /><span className="sr-only">Remove filter</span>
                  </Link>
                </li>
              ))}
              {chips.length > 1 ? <li><Link prefetch={false} href="/search" className="inline-flex px-2 py-1 text-xs font-semibold">Clear all</Link></li> : null}
            </ul>
          ) : null}

          {prices.length ? <PriceTable prices={pricesOnly ? prices.slice(0, 60) : prices.slice(0, 5)} member={viewer.isMember} more={pricesOnly ? null : url([["show"], ["dir"]], { show: PRICES_GROUP.id })} /> : null}

          {loose && count > 0 ? (
            <p role="status" className="rounded-xl border border-accent/40 bg-accent-tint px-4 py-3 text-sm text-ink-soft">
              <strong className="font-semibold text-heading">No page matches all of your words.</strong> These are the closest matches, best first.
            </p>
          ) : null}

          {count === 0 ? (
            <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-tint text-brand"><Icon name="search" className="h-6 w-6" /></span>
              <p className="mt-1 font-display text-lg font-bold text-heading">We couldn&apos;t find that yet</p>
              <p className="max-w-md text-sm text-ink-muted">Try a shorter search, check the spelling, or remove a filter. You can also try one of these:</p>
              <ul className="flex max-w-xl flex-wrap justify-center gap-2">
                {["register a business", "file tax returns", "EFRIS", "maize mill", "SME loan", "poultry"].map((t) => (
                  <li key={t}><Link prefetch={false} href={`/search?q=${encodeURIComponent(t)}`} className="inline-flex rounded-full border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink hover:border-brand hover:text-brand">{t}</Link></li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-ink-muted">Still can&apos;t find it? <Link prefetch={false} href="/contact" className="font-semibold">Tell our team what you need</Link> and we&apos;ll point you to it or add it.</p>
            </div>
          ) : null}

          <ul className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-4">
            {rows.map((r) => <li key={r.id}><ResultCard r={r} member={viewer.isMember} saved={savedIds.has(r.id)} back={url([], p.page > 1 ? { page: String(p.page) } : {})} /></li>)}
          </ul>

          {pages > 1 ? (
            <nav aria-label="Pages" className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
              {p.page > 1 ? <PageLink href={url([], { page: String(p.page - 1) })}>← Previous</PageLink> : null}
              {pageList(p.page, pages).map((n, k) => n === null ? <span key={`gap${k}`} className="px-1 text-ink-muted">…</span> : (
                <PageLink key={n} href={url([], { page: String(n) })} current={n === p.page}>{n}</PageLink>
              ))}
              {p.page < pages ? <PageLink href={url([], { page: String(p.page + 1) })}>Next →</PageLink> : null}
            </nav>
          ) : null}
        </section>
      </div>
      </OnboardingGate>
    </form>
  );
}

/** 1 … 4 5 6 … 20 */
function pageList(page: number, pages: number): (number | null)[] {
  const keep = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const sorted = [...keep].sort((a, b) => a - b);
  return sorted.flatMap((n, i) => (i && n - sorted[i - 1] > 1 ? [null, n] : [n]));
}

function PageLink({ href, current, children }: { href: string; current?: boolean; children: React.ReactNode }) {
  return (
    <Link prefetch={false} href={href} aria-current={current ? "page" : undefined}
      className={`inline-flex h-10 min-w-[40px] items-center justify-center rounded-[10px] border px-3 text-sm font-semibold ${current ? "border-brand bg-brand text-white hover:text-white" : "border-line bg-white text-ink hover:border-brand hover:text-brand"}`}>
      {children}
    </Link>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return <label className="label min-w-0 text-[13px]"><span className="inline-flex items-center gap-1.5">{label}</span>{children}</label>;
}

function Check({ name, value = "1", checked, auto, children }: { name: string; value?: string; checked: boolean; auto?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex min-h-[28px] cursor-pointer items-center gap-2.5 text-sm text-ink-soft">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} data-auto={auto ? "" : undefined} className="h-[18px] w-[18px] shrink-0 cursor-pointer rounded accent-brand" />
      {children}
    </label>
  );
}

const Lock = () => <LockKeyhole aria-label="Members only" className="h-3.5 w-3.5 text-accent-dark" />;

/** One section tab: its name and how many results it has. */
function Tab({ href, on, label, n }: { href: string; on: boolean; label: string; n?: number }) {
  return (
    <Link prefetch={false} href={href} aria-current={on ? "page" : undefined}
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-[14px] font-semibold transition-colors ${on ? "border-brand bg-brand text-white hover:text-white" : "border-line bg-white text-ink hover:border-brand hover:text-brand"}`}>
      {label}{n !== undefined ? <span className={`rounded-full px-2 py-px text-[12px] font-bold ${on ? "bg-white/25 text-white" : "bg-page text-ink-soft"}`}>{n}</span> : null}
    </Link>
  );
}

/** A section's own filter as chips (machine condition, type of money): tap to add or remove. */
function Chips({ label, name, list, on, url }: { label: string; name: string; list: [string, string][]; on: string[]; url: (drop: [string, string?][], set?: Record<string, string>) => string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[13px] font-semibold text-ink-soft">{label}:</span>
      {list.map(([k, l]) => {
        const active = on.includes(k);
        // Adding keeps the others: the link carries every chosen value plus this one
        const add = (() => { const u = new URL(url([]), "http://x"); u.searchParams.append(name, k); u.searchParams.delete("page"); return u.pathname + u.search; })();
        return (
          <Link key={k} prefetch={false} href={active ? url([[name, k]]) : add} aria-pressed={active}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold ${active ? "border-brand bg-brand-tint text-brand-dark" : "border-line bg-white text-ink hover:border-brand hover:text-brand"}`}>
            {active ? "✓ " : ""}{l}
          </Link>
        );
      })}
    </div>
  );
}

const LABEL_TONE: Record<string, string> = { FUNDING_PROGRAMME: "text-accent-dark", INVESTMENT_OPPORTUNITY: "text-accent-dark", CONSULTANT: "text-accent-dark" };
const ICON: Record<string, string> = { BUSINESS_IDEA: "idea", MACHINE: "machine", SUPPLIER: "supplier", FUNDING_PROGRAMME: "funding", GUIDE: "guide", CONSULTANT: "expert", TOOL: "tool", WEBSITE: "link", NEWS: "news", BUSINESS_TIP: "tip", INVESTMENT_OPPORTUNITY: "funding" };

/** One result: picture (or icon), type, title, facts, a per-directory extra and the actions. */
function ResultCard({ r, member, saved, back }: { r: ResultRow; member: boolean; saved: boolean; back: string }) {
  const href = itemHref(r);
  const org = r.fundingProgramme?.provider.organization;
  const round = r.fundingProgramme?.rounds[0];
  const check = r.checks[0];
  const picture = r.businessIdea?.pictureUrl ?? r.machine?.pictureUrl;
  const photo = r.consultant?.photoUrl;
  const m = r.machine;
  const offers = m?._count.offers ?? 0;
  const facts = ([
    r.primaryCategory?.name,
    ...(r.businessIdea ? [r.businessIdea.businessType, cap(r.businessIdea.experienceLevel), r.businessIdea.scenarios.length ? `${r.businessIdea.scenarios.length} start-up plans` : null]
      : m ? [m.machineType, m.capacityMin || m.capacityMax ? `${[m.capacityMin, m.capacityMax].filter(Boolean).join("–")} ${m.capacityUnit ?? ""}`.trim() : null, cap(m.powerSource)]
      : r.supplier ? [cap(r.supplier.supplierType), r.supplier.country, r.supplier.items.slice(0, 3).join(", ")]
      : r.fundingProgramme ? [cap(r.fundingProgramme.fundingType), org?.tradingName ?? org?.legalName]
      : r.consultant ? [r.consultant.specialties.slice(0, 3).join(", "), [r.consultant.district, r.consultant.country].filter(Boolean).join(", ")]
      : r.investmentOpportunity ? [r.investmentOpportunity.sector, cap(r.investmentOpportunity.opportunityType)]
      : r.guide ? [r.guide.resourceType, r.guide.jurisdiction]
      : r.tool ? [cap(r.tool.toolType)]
      : r.website ? [r.website.siteType, r.website.mainFunction]
      : r.news ? [cap(r.news.articleType), r.news.publisher]
      : []),
  ] as (string | null | undefined)[]).filter((f): f is string => Boolean(f));

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl bg-surface transition-colors sm:border sm:border-line sm:hover:border-brand/40">
      {/* Every card has a picture area, so the grid lines up: photo, expert portrait, or the directory icon */}
      <Link prefetch={false} href={href} tabIndex={-1} aria-hidden className="relative block overflow-hidden sm:border-b sm:border-line">
        {photo ? (
          <span className="flex aspect-[16/10] items-center justify-center bg-accent-tint">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="" loading="lazy" className="h-[56%] w-auto rounded-full border-4 border-white object-cover" style={{ aspectRatio: "1" }} />
          </span>
        ) : picture || r.businessIdea || m ? (
          <IdeaPhoto src={picture} alt="" className="aspect-[16/10] transition duration-300 group-hover:scale-[1.03]" />
        ) : (
          <span className={`flex aspect-[16/10] items-center justify-center ${LABEL_TONE[r.contentType] ? "bg-accent-tint text-accent-dark" : "bg-brand-tint text-brand"}`}><Icon name={ICON[r.contentType] ?? "link"} className="h-9 w-9 sm:h-11 sm:w-11" strokeWidth={1.5} /></span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5 p-2.5 sm:gap-1 sm:p-3">
        <span className={`font-display text-[10px] font-bold uppercase tracking-wider sm:text-[11px] ${LABEL_TONE[r.contentType] ?? "text-brand"}`}>{contentTypeLabel[r.contentType]}</span>
        <h3 className="line-clamp-2 text-[14px] font-extrabold leading-snug text-heading sm:text-[16px]"><Link prefetch={false} href={href} className="text-heading hover:text-brand">{r.title}</Link></h3>
        {check && (r.supplier || r.consultant) ? <span className="badge-ok self-start whitespace-normal"><Icon name="check" className="h-3 w-3 shrink-0" />Contact checked {date(check.checkedAt)}</span> : null}
        {round ? <span className="badge self-start whitespace-normal bg-accent-tint text-accent-dark"><span className="live-dot h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />Open{round.isRolling ? " · rolling" : round.closesAt ? ` · closes ${date(round.closesAt)}` : ""}</span> : null}
        {r.investmentOpportunity?.deadline ? <span className="badge-warn self-start">Deadline {date(r.investmentOpportunity.deadline)}</span> : null}
        {facts.length ? <p className="line-clamp-1 text-[12px] text-ink-muted sm:text-[13px]">{facts.join(" · ")}</p> : null}
        {r.shortSummary ? <p className="hidden text-sm text-ink-soft sm:line-clamp-2">{r.shortSummary}</p> : null}

        {m ? <p className="text-[12px] font-semibold text-ink-soft sm:text-[13px]">{offers ? `${offers} supplier ${offers === 1 ? "offer" : "offers"}${m.offers[0]?.quotedAt ? ` · quoted ${date(m.offers[0].quotedAt)}` : ""}` : "No supplier offers yet"}</p> : null}
        {r.fundingProgramme?.eligibleBusinessTypes.length ? <p className="line-clamp-2 text-[12px] text-ink-soft sm:text-[13px]"><strong className="font-semibold text-ink">Eligible:</strong> {r.fundingProgramme.eligibleBusinessTypes.slice(0, 4).join(", ")}</p> : null}
        {r.guide || r.tool || r.website ? <p className="text-[12px] text-ink-muted sm:text-[13px]">Reviewed {date(r.lastReviewedAt, "not yet")}</p> : null}
        {r.supplier ? <Contact label="Phone" value={member ? r.supplier.phone : null} fake="+256 7•• ••• •••" href={href} /> : null}
        {r.consultant ? <Contact label="Email" value={member ? r.consultant.email : null} fake="name@example.co.ug" href={href} /> : null}

        <div className="mt-auto flex items-center gap-1.5 pt-2 sm:gap-2">
          <Link prefetch={false} href={href} className="btn-primary min-h-[38px] flex-1 px-3 text-[13px]"><span>View<span className="hidden sm:inline"> details</span></span></Link>
          <WishlistHeart id={r.id} className="h-[38px] w-[38px] shrink-0 rounded-lg border border-line" />
        </div>
      </div>
    </article>
  );
}

/** A contact: shown to members, blurred with a "Show contact" button (sign up and pay) for others. */
function Contact({ label, value, fake, href }: { label: string; value: string | null | undefined; fake: string; href: string }) {
  if (value) return <p className="text-[13px] text-ink-soft"><strong className="font-semibold text-ink">{label}:</strong> {value}</p>;
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-soft sm:text-[13px]">
      <span><strong className="font-semibold text-ink">{label}:</strong> <span className="blurred" aria-hidden>{fake}</span></span>
      <Link prefetch={false} href={href} data-onboard="" className="inline-flex items-center gap-1 font-semibold text-brand hover:text-brand-dark"><LockKeyhole aria-hidden className="h-3.5 w-3.5" />Show contact</Link>
    </p>
  );
}

type Price = Awaited<ReturnType<typeof searchPrices>>[number];

function PriceTable({ prices, member, more }: { prices: Price[]; member: boolean; more: string | null }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <h3 className="font-display text-sm font-extrabold text-heading">Markets and Prices</h3>
        {more ? <Link prefetch={false} href={more} className="text-[13px] font-semibold">See all prices</Link> : null}
      </div>
      <div className="overflow-x-auto">
        <table className="table-base min-w-[620px]">
          <thead><tr><th>Product</th><th>Market</th><th>District</th><th>Price</th><th>Observed</th></tr></thead>
          <tbody>
            {prices.map((p) => (
              <tr key={p.id}>
                <td className="font-semibold">{p.product.name}<span className="block text-xs font-normal text-ink-muted">{p.quotedUnit}</span></td>
                <td>{p.market.name}</td>
                <td className="text-ink-muted">{p.market.location?.type === "DISTRICT" ? p.market.location.name : "—"}</td>
                <td className="font-semibold">{member ? `${money(p.priceMin, p.currency, "—")} – ${money(p.priceMax, p.currency, "—")}` : <span className="inline-flex items-center gap-1 text-xs font-normal text-ink-muted"><LockKeyhole aria-hidden className="h-3.5 w-3.5" />Members only</span>}</td>
                <td className="whitespace-nowrap text-ink-muted">{date(p.observedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!member ? <div className="border-t border-line p-4"><Gate compact button="Show prices" modalTitle="Subscribe to see market prices" /></div> : null}
    </div>
  );
}
