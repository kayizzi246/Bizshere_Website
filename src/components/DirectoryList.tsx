import Link from "next/link";
import type { ContentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { date, itemHref } from "@/lib/format";

/** Directory landing page: published items of the given types, with optional section tabs. */
export async function DirectoryList({ types, title, intro, tabs, active, meta, variant = "cards" }: {
  types: ContentType[];
  title: string;
  intro: string;
  tabs?: [string, string][];
  active?: string;
  /** Optional one-line detail per card, e.g. yield or deadline. Keyed by content item id. Public fields only. */
  meta?: (ids: string[]) => Promise<Record<string, string>>;
  /** "documents" shows a document library (cover tile per item); `meta` is used as the document type. */
  variant?: "cards" | "documents";
}) {
  const items = await prisma.contentItem.findMany({
    where: { contentType: { in: types }, publicationStatus: "PUBLISHED" },
    include: { primaryCategory: true },
    orderBy: [{ publishedAt: "desc" }],
    take: 60,
  });
  const extra = meta ? await meta(items.map((i) => i.id)) : {};
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
        <Link href={`/search?in=${types[0]}`} className="btn-outline">Filter and search</Link>
      </div>
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
