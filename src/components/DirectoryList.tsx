import Link from "next/link";
import type { ContentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { date, itemHref } from "@/lib/format";

/** Directory landing page: published items of the given types, with optional section tabs. */
export async function DirectoryList({ types, title, intro, tabs, active, meta }: {
  types: ContentType[];
  title: string;
  intro: string;
  tabs?: [string, string][];
  active?: string;
  /** Optional one-line detail per card, e.g. yield or deadline. Keyed by content item id. */
  meta?: (ids: string[]) => Promise<Record<string, string>>;
}) {
  const items = await prisma.contentItem.findMany({
    where: { contentType: { in: types }, publicationStatus: "PUBLISHED" },
    include: { primaryCategory: true },
    orderBy: [{ publishedAt: "desc" }],
    take: 60,
  });
  const extra = meta ? await meta(items.map((i) => i.id)) : {};
  return (
    <div className="container-site flex flex-col gap-6 py-10">
      {tabs ? (
        <nav aria-label="Sections" className="flex flex-wrap gap-1.5 border-b border-line">
          {tabs.map(([href, label]) => (
            <Link key={href} href={href} aria-current={href === active ? "page" : undefined} className={`-mb-px border-b-[3px] px-3.5 py-3 text-sm ${href === active ? "border-brand font-extrabold text-brand-dark" : "border-transparent font-semibold text-ink-soft"}`}>{label}</Link>
          ))}
        </nav>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-4xl font-extrabold tracking-tight">{title}</h1>
          <p className="text-ink-muted">{intro}</p>
        </div>
        <Link href={`/search?adv=1&types=${types.join("&types=")}`} className="btn-outline">Filter and search</Link>
      </div>
      <div className="flex flex-wrap gap-4">
        {items.length === 0 ? <p className="card w-full p-6 text-sm text-ink-muted">Nothing published here yet.</p> : null}
        {items.map((i) => (
          <Link id={i.slug} key={i.id} href={itemHref(i)} className="card flex flex-[1_1_300px] flex-col gap-2 p-5 text-ink hover:border-brand hover:text-ink">
            <span className="eyebrow">{i.primaryCategory?.name ?? i.contentType.toLowerCase().replace("_", " ")}</span>
            <span className="text-lg font-extrabold">{i.title}</span>
            {i.shortSummary ? <span className="text-sm text-ink-soft">{i.shortSummary}</span> : null}
            {extra[i.id] ? <span className="text-sm font-semibold text-ink-soft">{extra[i.id]}</span> : null}
            <span className="text-xs text-ink-muted">Reviewed {date(i.lastReviewedAt)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
