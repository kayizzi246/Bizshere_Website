"use client";

import Link from "next/link";
import { useRef } from "react";
import {
  ArrowUpDown, Banknote, Briefcase, CalendarClock, ChevronRight, Factory, GraduationCap, HandHeart, HeartPulse, Landmark,
  LayoutGrid, LockKeyhole, MapPin, Package, Search, Sprout, Tag, Target, TrendingUp, Users, X,
} from "lucide-react";
import { GlassSelect } from "./GlassSelect";
import { Icon } from "./Icon";
import { SeenBadge } from "./Recent";
import { WishlistHeart } from "./Wishlist";
import type { BrowseListing } from "./ListingBrowser";

/**
 * Every directory page body in one job-board style layout (client, 13 Nov 2026, after an example they sent; first on
 * Funding Sources, then on every service): breadcrumb and a title with the count, a white bar of pill tabs
 * (categories) with the sort that stays pinned to the top while the list scrolls, then one row card per listing
 * and a side column. Small, tight type.
 */
export function DirectoryBoard<T extends string>({ crumb, heading, count, note, cats, category, onCategory, sort, sorts, onSort, top, aside, pager, listTop, children, grid = false }: {
  /** Photo grid (business ideas, machines, suppliers): no side column, so four cards fit a row; the side cards go below. */
  grid?: boolean;
  /** This page's name in the breadcrumb */
  crumb: string;
  heading: string;
  count: number;
  /** A small line under the title (e.g. the investment warning) */
  note?: string | null;
  cats: [string, { name: string; n: number }][];
  category: string;
  onCategory: (id: string) => void;
  sort: T;
  sorts: readonly { value: T; label: string }[];
  onSort: (v: T) => void;
  /** Above the bar (recently viewed) */
  top?: React.ReactNode;
  aside: React.ReactNode;
  pager: React.ReactNode;
  listTop: React.RefObject<HTMLElement>;
  /** The list, or the empty message */
  children: React.ReactNode;
}) {
  return (
    <div className="bg-page">
      <div className="container-site flex flex-col gap-3.5 py-5 sm:gap-4 sm:py-6">
        {top}
        <div className="flex flex-col gap-0.5">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[12px] text-ink-muted">
            <Link href="/" className="text-ink-muted hover:text-brand">Home</Link>
            <ChevronRight aria-hidden className="h-3 w-3" />
            <span className="text-ink-soft">{crumb}</span>
          </nav>
          <h2 id="listings" className="text-[16px] font-bold leading-tight tracking-[-0.02em] text-heading sm:text-[18px]">
            {heading} <span className="font-semibold text-ink-muted" aria-live="polite">({count})</span>
          </h2>
          {note ? <p data-size="" className="text-[12px] text-ink-muted">{note}</p> : null}
        </div>

        <FilterBar cats={cats} category={category} onCategory={onCategory} sort={sort} sorts={sorts} onSort={onSort} />

        <section ref={listTop} aria-labelledby="listings" className={`grid scroll-mt-40 grid-cols-[minmax(0,1fr)] gap-4 ${grid ? "" : "lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start"}`}>
          <div className="flex min-w-0 flex-col gap-2.5">
            {children}
            {pager}
          </div>
          {aside}
        </section>
      </div>
    </div>
  );
}

/** "Nothing matches" in the list. */
export function BoardEmpty({ any, onClear }: { any: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-white px-6 py-12 text-center">
      <p data-size="" className="text-[13px] font-semibold text-heading">{any ? "Nothing matches this search. Try other words or another category." : "Nothing published here yet."}</p>
      {any ? <button type="button" onClick={onClear} className="text-[12px] font-semibold text-brand hover:text-brand-dark">Clear the search</button> : null}
    </div>
  );
}

/** Pill tabs that scroll sideways (arrow on wide screens) and the sort, pinned under the site header. */
function FilterBar<T extends string>({ cats, category, onCategory, sort, sorts, onSort }: {
  cats: [string, { name: string; n: number }][];
  category: string;
  onCategory: (id: string) => void;
  sort: T;
  sorts: readonly { value: T; label: string }[];
  onSort: (v: T) => void;
}) {
  const row = useRef<HTMLUListElement>(null);
  const pill = "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[12px] font-medium transition-colors";
  const off = `${pill} border-line bg-white text-ink-soft hover:border-ink-muted hover:text-heading`;
  const on = `${pill} border-ink bg-ink text-white hover:text-white`;
  return (
    <div data-sticky-search="" className="sticky top-[calc(var(--hh)+0.5rem)] z-30 lg:top-[calc(var(--hh)+2.25rem)]">
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-white/95 p-1.5 backdrop-blur-md">
        <div className="relative min-w-0 flex-1">
          <ul ref={row} aria-label="Categories" className="flex gap-1.5 overflow-x-auto scroll-smooth pr-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <li>
              <button type="button" onClick={() => onCategory("")} aria-pressed={!category} className={category ? off : on}>
                <LayoutGrid aria-hidden className="h-3.5 w-3.5" />All
              </button>
            </li>
            {cats.map(([id, c]) => {
              const active = category === id;
              const CatIcon = iconFor(c.name);
              return (
                <li key={id}>
                  <button type="button" onClick={() => onCategory(active ? "" : id)} aria-pressed={active} className={active ? on : off}>
                    <CatIcon aria-hidden className="h-3.5 w-3.5" />{c.name}
                    {active ? <X aria-label="Clear" className="h-3.5 w-3.5" /> : <span className="text-[11px] text-ink-muted">{c.n}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          {/* Fade and arrow at the end of the row: more tabs this way */}
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white to-transparent" />
          <button type="button" onClick={() => row.current?.scrollBy({ left: 240 })} aria-label="More categories"
            className="absolute right-0 top-1/2 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white text-ink-soft hover:border-ink-muted hover:text-heading sm:flex">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="shrink-0 border-l border-line pl-1.5">
          <GlassSelect label="Sort by" value={sort} onChange={(v) => onSort(v as T)} options={[...sorts]} panelClassName="right-0 left-auto"
            icon={<ArrowUpDown className="h-3.5 w-3.5 text-ink-muted" />}
            className="h-8 w-[8rem] rounded-full px-2.5 text-[12px] font-medium text-ink-soft hover:text-heading sm:w-[10rem]" />
        </div>
      </div>
    </div>
  );
}

/** An icon for a category by its name; a plain tag for anything else. */
function iconFor(name: string) {
  const n = name.toLowerCase();
  if (/health|medic|clinic|pharm/.test(n)) return HeartPulse;
  if (/educat|school|train/.test(n)) return GraduationCap;
  if (/financ|bank|loan|tax|account/.test(n)) return Landmark;
  if (/child|youth|women|people/.test(n)) return Users;
  if (/communit|social|charit/.test(n)) return HandHeart;
  if (/agri|farm|food|poultry|crop|livestock/.test(n)) return Sprout;
  if (/machin|manufact|process|industr|construct/.test(n)) return Factory;
  if (/invest|real estate|property|energy/.test(n)) return TrendingUp;
  if (/business|enterprise|sme|trade|retail|shop/.test(n)) return Briefcase;
  return Tag;
}

// ── Shared card pieces ──
export const chip = "inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-page px-2.5 text-[12px] text-ink-soft";
export const solidButton = "inline-flex h-9 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-ink px-4 text-[12px] font-bold uppercase tracking-[0.06em] text-white hover:bg-brand hover:text-white sm:w-auto";
export const softButton = "inline-flex h-9 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-line bg-white px-4 text-[12px] font-bold uppercase tracking-[0.06em] text-heading hover:border-ink hover:text-heading sm:w-auto";
const clean = (t: string) => t.replace(/^Sample:\s*/i, "");
const initials = (s: string) => s.replace(/^Sample:?\s+/i, "").split(/\s+/).filter((w) => /^[A-Za-z0-9]/.test(w)).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "B";
const checked = (d: string) => (d && d !== "—" ? d : null);

/** The frame every row card shares: picture or tile on the left, the content, heart top right. */
export function RowFrame({ id, href, title, external, thumb, meta, pills, body, actions }: {
  id: string; href: string; title: string; external?: string | null;
  thumb: React.ReactNode; meta: React.ReactNode; pills: React.ReactNode; body: React.ReactNode; actions: React.ReactNode;
}) {
  return (
    <article className="group relative flex gap-3.5 rounded-2xl border border-line bg-white p-3.5 transition-colors hover:border-ink-muted/50 sm:p-4">
      {thumb}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            {external ? (
              <a href={external} target="_blank" rel="noopener noreferrer" className="text-[15px] font-bold leading-snug tracking-[-0.015em] text-heading hover:text-brand sm:text-[16px]">{title}<span aria-hidden className="ml-1 text-brand">↗</span></a>
            ) : (
              <Link href={href} className="text-[15px] font-bold leading-snug tracking-[-0.015em] text-heading hover:text-brand sm:text-[16px]">{title}</Link>
            )}
            <p data-size="" className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] text-ink-muted">{meta}</p>
          </div>
          <span className="flex shrink-0 items-center gap-2">
            <SeenBadge href={href} className="bg-brand-tint" />
            <WishlistHeart id={id} className="border border-line" />
          </span>
        </div>
        {pills ? <ul className="flex flex-wrap gap-1.5">{pills}</ul> : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="flex min-w-0 flex-col gap-1">{body}</div>
          <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">{actions}</div>
        </div>
      </div>
    </article>
  );
}

/** The list as a photo grid beside the side column: two a row on phones, three on tablets, four from 1280px. */
export const gridList = "grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4";

/** A grid card (business ideas, machines, suppliers): photo on top with the heart, then category, name, pills, a short
    description and the buttons along the bottom, so the cards in a row line up. */
export function GridFrame({ id, href, title, src, icon, meta, pills, body, actions, placeholder, cover = false }: {
  id: string; href: string; title: string; src: string | null | undefined; icon: string;
  meta: React.ReactNode; pills: React.ReactNode; body: React.ReactNode; actions: React.ReactNode;
  /** Shown instead of the icon when there is no photo (experts: their initials) */
  placeholder?: React.ReactNode;
  /** Fill the frame with the photo (portraits) instead of showing it whole */
  cover?: boolean;
}) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white transition-colors hover:border-ink-muted/50">
      <div className="relative">
        <Link href={href} tabIndex={-1} aria-hidden className="relative block aspect-[4/3] overflow-hidden border-b border-line bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or editor-entered address */}
          {src ? <img src={src} alt="" loading="lazy" className={`absolute inset-0 h-full w-full transition duration-300 group-hover:scale-[1.04] ${cover ? "object-cover object-top" : "object-contain"}`} /> : (
            <span className="flex h-full w-full items-center justify-center bg-brand-tint/60 text-brand/50">{placeholder ?? <Icon name={icon} className="h-9 w-9" strokeWidth={1.5} />}</span>
          )}
        </Link>
        <span className="absolute right-2 top-2 flex items-center gap-1.5">
          <SeenBadge href={href} className="bg-white/95" />
          <WishlistHeart id={id} />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2.5 sm:p-3">
        <p data-size="" className="flex min-w-0 items-center gap-1.5 truncate text-[11px] text-ink-muted">{meta}</p>
        <Link href={href} className="line-clamp-2 text-[14px] font-bold leading-snug tracking-[-0.015em] text-heading hover:text-brand">{title}</Link>
        {pills ? <ul className="flex flex-wrap gap-1">{pills}</ul> : null}
        {body}
        <div className="mt-auto flex gap-1.5 pt-1.5 [&>*]:h-8 [&>*]:flex-1 [&>*]:px-2 [&>*]:text-[11px]">{actions}</div>
      </div>
    </article>
  );
}

/** A smaller pill for grid cards */
export const gridChip = "inline-flex h-6 max-w-full items-center gap-1 rounded-full border border-line bg-page px-2 text-[11px] text-ink-soft";

/** Machines and suppliers as grid cards. */
export function ListingTile({ i, icon, variant }: { i: BrowseListing; icon: string; variant: string }) {
  return (
    <GridFrame id={i.id} href={i.href} title={clean(i.title)} src={i.picture} icon={icon}
      meta={<>
        <span className="truncate font-semibold text-accent-dark">{i.primaryCategory?.name ?? "General"}</span>
        {i.extra ? <><span aria-hidden>·</span><span className="truncate">{i.extra}</span></> : null}
      </>}
      pills={i.locked || i.price || i.country ? <>
        {i.locked ? <li className={`${gridChip} font-semibold text-ink-muted`}><LockKeyhole aria-hidden className="h-3 w-3 shrink-0" /><span className="truncate">Price for members</span></li>
          : i.price ? <li className={`${gridChip} font-semibold text-heading`}><Banknote aria-hidden className="h-3 w-3 shrink-0 text-ink-muted" /><span className="truncate">{i.price}</span></li> : null}
        {i.country ? <li className={gridChip}><MapPin aria-hidden className="h-3 w-3 shrink-0 text-ink-muted" /><span className="truncate">{i.country}</span></li> : null}
      </> : null}
      body={i.sells ? (
        <p data-size="" className="line-clamp-2 text-[12px] leading-snug text-ink-soft"><Package aria-hidden className="mr-1 inline h-3 w-3 text-ink-muted" />{i.sells}</p>
      ) : i.summary ? <p data-size="" className="line-clamp-2 text-[12px] leading-snug text-ink-muted">{i.summary}</p> : null}
      actions={<Link href={i.href} className={solidButton}>{variant === "suppliers" ? "Products" : "View"}</Link>}
    />
  );
}

/** A photo on the left of a row (machines, suppliers, ideas): smaller on phones. */
export function RowPhoto({ href, src, icon = "link" }: { href: string; src: string | null | undefined; icon?: string }) {
  return (
    <Link href={href} tabIndex={-1} aria-hidden className="relative block h-[72px] w-[84px] shrink-0 overflow-hidden rounded-xl border border-line bg-white sm:h-[96px] sm:w-[128px]">
      {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or editor-entered address */}
      {src ? <img src={src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-contain transition duration-300 group-hover:scale-[1.04]" /> : (
        <span className="flex h-full w-full items-center justify-center text-brand/60"><Icon name={icon} className="h-7 w-7" strokeWidth={1.5} /></span>
      )}
    </Link>
  );
}

/** A small tile on the left of a row without a photo (initials or the directory's icon). Wide screens only. */
function RowTile({ text, icon }: { text?: string; icon?: string }) {
  return (
    <span aria-hidden className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-[13px] font-bold tracking-[-0.02em] text-brand-dark sm:flex">
      {text ?? <Icon name={icon ?? "link"} className="h-5 w-5 text-brand" strokeWidth={1.75} />}
    </span>
  );
}

/**
 * One listing as a row card. Funding and investment rows read their details from `cells` (By, Type, Where,
 * Sector, Amount, Deadline, Stage, For); the others use what the directory sends (photo, source and price,
 * country, what they sell, one-line detail). Member detail is never sent: a lock says so instead.
 */
export function ListingRow({ i, icon, variant }: { i: BrowseListing; icon: string; variant: string }) {
  const title = clean(i.title);
  if (i.cells) return <CellsRow i={i} />;
  const about = i.description || i.summary;
  const photo = i.picture !== null || variant === "suppliers" || (i.source !== undefined || i.locked);
  const host = i.external ? i.external.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") : null;
  return (
    <RowFrame id={i.id} href={i.href} title={title} external={i.external}
      thumb={photo ? <RowPhoto href={i.href} src={i.picture} icon={icon} /> : <RowTile icon={icon} />}
      meta={<>
        <span className="font-semibold text-accent-dark">{i.primaryCategory?.name ?? "General"}</span>
        {i.extra ? <><span aria-hidden>·</span><span>{i.extra}</span></> : null}
        {host ? <><span aria-hidden>·</span><span className="truncate">{host}</span></> : null}
        {checked(i.reviewed) ? <><span aria-hidden>·</span><span>Checked {i.reviewed}</span></> : null}
      </>}
      pills={i.locked || i.source || i.price || i.country || i.sells ? <>
        {i.locked ? <li className={`${chip} font-semibold text-ink-muted`}><LockKeyhole aria-hidden className="h-3 w-3" />Source and price for members</li> : <>
          {i.price ? <li className={`${chip} font-semibold text-heading`}><Banknote aria-hidden className="h-3 w-3 text-ink-muted" />{i.price}</li> : null}
          {i.source ? <li className={chip}><Factory aria-hidden className="h-3 w-3 text-ink-muted" />{i.source}</li> : null}
        </>}
        {i.country ? <li className={chip}><MapPin aria-hidden className="h-3 w-3 text-ink-muted" />{i.country}</li> : null}
        {i.sells ? <li className={`${chip} max-w-full`}><Package aria-hidden className="h-3 w-3 shrink-0 text-ink-muted" /><span className="truncate">{i.sells}</span></li> : null}
      </> : null}
      body={about ? <p data-size="" className="line-clamp-2 max-w-[62ch] text-[13px] leading-relaxed text-ink-soft">{about}</p> : null}
      actions={i.external ? (
        <a href={i.external} target="_blank" rel="noopener noreferrer" className={solidButton}>Visit<span aria-hidden>↗</span></a>
      ) : (
        <Link href={i.href} className={solidButton}>{variant === "suppliers" ? "Products" : variant === "documents" ? "Open" : "View"}</Link>
      )}
    />
  );
}

/** Funding and investment rows. */
function CellsRow({ i }: { i: BrowseListing }) {
  const cell = (label: string) => i.cells?.find((c) => c.label === label);
  const by = cell("By")?.value ?? null;
  const type = cell("Type")?.value ?? null;
  const where = cell("Where")?.value ?? null;
  const sector = cell("Sector")?.value ?? null;
  const amount = cell("Amount");
  const deadline = cell("Deadline")?.value ?? null;
  const stage = cell("Stage")?.value ?? null;
  const purpose = cell("For")?.value ?? null;
  const about = i.summary || i.description;
  return (
    <RowFrame id={i.id} href={i.href} title={clean(i.title)}
      thumb={<RowTile text={initials(by ?? i.title)} />}
      meta={<>
        {by ? <span className="font-semibold text-accent-dark">{clean(by)}</span> : null}
        {type ? <><span aria-hidden>·</span><span>{type}</span></> : null}
        {checked(i.reviewed) ? <><span aria-hidden>·</span><span>Checked {i.reviewed}</span></> : null}
      </>}
      pills={<>
        {where ? <li className={chip}><MapPin aria-hidden className="h-3 w-3 text-ink-muted" />{where}</li> : null}
        {amount?.locked ? (
          <li className={`${chip} font-semibold text-ink-muted`}><LockKeyhole aria-hidden className="h-3 w-3" />Amount for members</li>
        ) : amount?.value ? (
          <li className={`${chip} font-semibold text-heading`}><Banknote aria-hidden className="h-3 w-3 text-ink-muted" />{amount.value}</li>
        ) : null}
        {sector ?? i.primaryCategory ? <li className={chip}><Briefcase aria-hidden className="h-3 w-3 text-ink-muted" />{sector ?? i.primaryCategory?.name}</li> : null}
        {stage ? <li className={chip}><TrendingUp aria-hidden className="h-3 w-3 text-ink-muted" />{stage}</li> : null}
        {deadline ? <li className={chip}><CalendarClock aria-hidden className="h-3 w-3 text-ink-muted" />Closes {deadline}</li> : null}
      </>}
      body={<>
        {about ? <p data-size="" className="line-clamp-2 max-w-[62ch] text-[13px] leading-relaxed text-ink-soft">{about}</p> : null}
        {purpose ? <p data-size="" className="flex items-start gap-1.5 text-[12px] text-ink-muted"><Target aria-hidden className="mt-0.5 h-3 w-3 shrink-0" /><span className="line-clamp-1"><span className="font-medium text-ink-soft">For:</span> {purpose}</span></p> : null}
      </>}
      actions={i.apply ? (
        <a href={i.apply} target="_blank" rel="noopener noreferrer" className={solidButton}>Apply<span aria-hidden>↗</span></a>
      ) : i.applyLocked ? (
        <Link href={`/membership?onboard=pay&next=${encodeURIComponent(i.href)}`} data-pay="" data-next={i.href} className={solidButton}><LockKeyhole aria-hidden className="h-3 w-3" />Apply</Link>
      ) : (
        <Link href={i.href} className={solidButton}>View</Link>
      )}
    />
  );
}

/**
 * The side column: what members get (only when something on the page is locked), a business expert for help,
 * and the other section(s) of this page's tabs. No prices.
 */
export function BoardAside({ path, tabs, active, locked, members, help, row = false, helpLink = ["/experts", "Find an expert"] }: {
  /** The help card's button: [href, label] (default: find an expert) */
  helpLink?: [string, string];
  /** Under a photo grid: the cards side by side in a row instead of a pinned column */
  row?: boolean;
  path: string;
  tabs?: [string, string][];
  active?: string;
  locked: boolean;
  members?: { title: string; text: string };
  help?: { title: string; text: string };
}) {
  const others = (tabs ?? []).filter(([href]) => href !== active);
  const m = members ?? { title: "See every detail", text: "Members see the full details on every page: prices, sources and contacts." };
  const h = help ?? { title: "Need advice?", text: "A business expert can help you choose well and get started." };
  return (
    <aside className={row ? "grid grid-cols-[minmax(0,1fr)] items-stretch gap-2.5 pt-2 sm:grid-cols-2 lg:grid-cols-3 [&>*]:justify-center" : "flex flex-col gap-2.5 lg:sticky lg:top-[calc(var(--hh)+6.5rem)]"}>
      {locked ? (
        <div className="flex flex-col gap-2.5 rounded-2xl bg-navy p-4 text-white">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent"><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />Members</span>
          <h3 className="text-[16px] font-bold leading-tight tracking-[-0.02em] text-white">{m.title}</h3>
          <p data-size="" className="text-[13px] leading-relaxed text-white/75">{m.text}</p>
          <Link href={`/membership?onboard=pay&next=${encodeURIComponent(path)}`} data-pay="" data-next={path} className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-[13px] font-bold text-ink hover:bg-[#FFA54A] hover:text-ink">Become a member</Link>
        </div>
      ) : null}
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-white p-4 text-center">
        <h3 className="text-[16px] font-bold leading-tight tracking-[-0.02em] text-heading">{h.title}</h3>
        <p data-size="" className="text-[13px] leading-relaxed text-ink-muted">{h.text}</p>
        <Link href={helpLink[0]} className="mt-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 text-[13px] font-bold text-white hover:bg-brand-dark hover:text-white"><Users aria-hidden className="h-3.5 w-3.5" />{helpLink[1]}</Link>
      </div>
      {(others.length ? others : [["/search", "Search everything"] as [string, string]]).map(([href, label]) => (
        <Link key={href} href={href} className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-3.5 text-ink hover:border-ink-muted/50 hover:text-ink">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-tint text-accent-dark">{href === "/search" ? <Search aria-hidden className="h-4 w-4" /> : <Tag aria-hidden className="h-4 w-4" />}</span>
          <span className="min-w-0 flex-1 text-[14px] font-bold leading-tight tracking-[-0.01em] text-heading">{label}</span>
          <ChevronRight aria-hidden className="h-4 w-4 text-ink-muted transition group-hover:translate-x-0.5" />
        </Link>
      ))}
    </aside>
  );
}
