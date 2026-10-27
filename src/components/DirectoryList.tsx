import Link from "next/link";
import type { ContentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { date, itemHref } from "@/lib/format";
import { DIRECTORIES } from "@/config/directories";
import { Icon } from "./Icon";
import { ServiceSearch } from "./ServiceSearch";

/** Directory landing page: published items of the given types, with optional section tabs. */
export async function DirectoryList({ types, title, intro, tabs, active, meta, variant = "cards", images }: {
  types: ContentType[];
  title: string;
  intro: string;
  tabs?: [string, string][];
  active?: string;
  /** Optional one-line detail per card, e.g. yield or deadline. Keyed by content item id. Public fields only. */
  meta?: (ids: string[]) => Promise<Record<string, string>>;
  /** "documents" shows a document library (cover tile per item); `meta` is used as the document type. */
  variant?: "cards" | "documents";
  /** Photo per card (keyed by content item id). Turns the cards into photo cards. */
  images?: (ids: string[]) => Promise<Record<string, string>>;
}) {
  const items = await prisma.contentItem.findMany({
    where: { contentType: { in: types }, publicationStatus: "PUBLISHED" },
    include: { primaryCategory: true },
    orderBy: [{ publishedAt: "desc" }],
    take: 60,
  });
  const extra = meta ? await meta(items.map((i) => i.id)) : {};
  const pictures = images ? await images(items.map((i) => i.id)) : null;
  const icon = DIRECTORIES.find((d) => d.type === types[0])?.icon ?? "link";
  return (
    <div className="container-site flex flex-col gap-6 py-8">
      {tabs ? (
        <nav aria-label="Sections" className="flex flex-wrap gap-1.5 border-b border-line">
          {tabs.map(([href, label]) => (
            <Link key={href} href={href} aria-current={href === active ? "page" : undefined} className={`-mb-px border-b-[3px] px-3.5 py-3 text-sm ${href === active ? "border-brand font-extrabold text-brand-dark" : "border-transparent font-semibold text-ink-soft"}`}>{label}</Link>
          ))}
        </nav>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
          <p className="text-ink-muted">{intro}</p>
        </div>
      </div>
      <ServiceSearch tab={types[0]} />
      {variant === "documents" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {items.length === 0 ? <p className="card col-span-full p-6 text-sm text-ink-muted">Nothing published here yet.</p> : null}
          {items.map((i) => (
            <Link id={i.slug} key={i.id} href={itemHref(i)} data-reveal className="group flex flex-col gap-2.5 text-ink hover:text-ink">
              <span className="relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-xl border border-line bg-white p-4 transition group-hover:-translate-y-0.5 group-hover:border-brand">
                <span aria-hidden className="absolute right-0 top-0 h-7 w-7 rounded-bl-lg border-b border-l border-line bg-page" />
                <span className="badge-ok self-start">{extra[i.id] || "Document"}</span>
                <span className="flex flex-col gap-1.5" aria-hidden>
                  <span className="h-1.5 w-full rounded bg-line" /><span className="h-1.5 w-5/6 rounded bg-line" /><span className="h-1.5 w-2/3 rounded bg-line" />
                </span>
                <span className="line-clamp-3 font-display text-sm font-extrabold leading-snug">{i.title}</span>
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="line-clamp-2 font-display text-sm font-bold leading-snug group-hover:text-brand">{i.title}</span>
                <span className="text-xs text-ink-muted">{i.primaryCategory?.name ?? "General"}</span>
              </span>
            </Link>
          ))}
        </div>
      ) : pictures ? (
        // Photo cards: the record's picture, or a plain panel with the directory icon until one is added.
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.length === 0 ? <p className="card col-span-full p-6 text-sm text-ink-muted">Nothing published here yet.</p> : null}
          {items.map((i) => (
            <Link id={i.slug} key={i.id} href={itemHref(i)} data-reveal className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white text-ink transition hover:border-ink hover:text-ink">
              <span className="relative block overflow-hidden">
                {pictures[i.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- editor-entered address or /machines/… path
                  <img src={pictures[i.id]} alt={i.title} loading="lazy" className="block aspect-[16/10] w-full bg-page object-cover transition duration-500 group-hover:scale-[1.03]" />
                ) : (
                  <span className="flex aspect-[16/10] w-full items-center justify-center bg-brand-tint text-brand"><Icon name={icon} className="h-10 w-10" strokeWidth={1.5} /></span>
                )}
                {i.primaryCategory ? <span className="absolute left-3 top-3 rounded-md bg-white px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-ink">{i.primaryCategory.name}</span> : null}
              </span>
              <span className="flex flex-1 flex-col gap-1.5 p-4">
                <span className="font-sans text-base font-extrabold leading-snug tracking-tight">{i.title}</span>
                {i.shortSummary ? <span className="line-clamp-2 text-[13px] leading-relaxed text-ink-soft">{i.shortSummary}</span> : null}
                {extra[i.id] ? <span className="line-clamp-2 text-[13px] font-semibold text-ink-soft">{extra[i.id]}</span> : null}
                <span className="mt-auto flex items-center justify-between border-t border-line pt-2.5 text-[13px]">
                  <span className="text-ink-muted">Reviewed {date(i.lastReviewedAt)}</span>
                  <span className="inline-flex items-center gap-1 font-bold group-hover:text-brand">View <Icon name="arrow" className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
                </span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
      <div className="flex flex-wrap gap-4">
        {items.length === 0 ? <p className="card w-full p-6 text-sm text-ink-muted">Nothing published here yet.</p> : null}
        {items.map((i) => (
          <Link id={i.slug} key={i.id} href={itemHref(i)} data-reveal className="card flex flex-[1_1_300px] flex-col gap-2 p-5 text-ink transition hover:-translate-y-1 hover:border-brand/50 hover:text-ink">
            <span className="eyebrow">{i.primaryCategory?.name ?? i.contentType.toLowerCase().replace("_", " ")}</span>
            <span className="title text-base">{i.title}</span>
            {i.shortSummary ? <span className="text-sm text-ink-soft">{i.shortSummary}</span> : null}
            {extra[i.id] ? <span className="text-sm font-semibold text-ink-soft">{extra[i.id]}</span> : null}
            <span className="text-xs text-ink-muted">Reviewed {date(i.lastReviewedAt)}</span>
          </Link>
        ))}
      </div>
      )}
    </div>
  );
}
