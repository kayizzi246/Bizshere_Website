import Link from "next/link";
import { MessageCircle, Play, Search } from "lucide-react";
import { ListingHeader } from "@/components/DirectoryList";
import { directory, directoryMetadata } from "@/config/directories";
import { date, GUIDE_TABS } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { readMinutes, tipPicture } from "@/lib/tips";

export const dynamic = "force-dynamic";
export const metadata = directoryMetadata("/tips");

const PER_PAGE = 12;

/**
 * Business Tips as posts in an even grid (client, 11 Nov 2026: in a grid, and not looking machine-made).
 * Each card is plain: the tip's own photo or its video's picture (a grey panel with the topic otherwise), then the topic, title,
 * the opening lines and the date. No decorative colours or shapes. Topics are tabs along the top and
 * the search box looks in titles and text; everything is in the address (?topic=…&q=…&page=…).
 */
export default async function TipsPage({ searchParams }: { searchParams: { q?: string | string[]; topic?: string | string[]; category?: string | string[]; page?: string | string[] } }) {
  const one = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v) ?? "";
  const q = one(searchParams.q).trim().slice(0, 80);
  const topic = one(searchParams.topic) || one(searchParams.category);
  const page = Math.max(1, Number.parseInt(one(searchParams.page), 10) || 1);
  const d = directory("/tips");

  const all = await prisma.contentItem.findMany({
    where: { contentType: "BUSINESS_TIP", publicationStatus: "PUBLISHED" },
    select: {
      id: true, slug: true, title: true, shortSummary: true, overview: true, publishedAt: true, updatedAt: true,
      primaryCategory: { select: { id: true, name: true } },
      businessTip: { select: { videoUrl: true, pictureUrl: true, _count: { select: { remarks: { where: { hiddenAt: null } } } } } },
    },
    orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }],
    take: 500,
  });
  const topics = [...new Map(all.filter((t) => t.primaryCategory).map((t) => [t.primaryCategory!.id, t.primaryCategory!.name])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const found = all.filter((t) => (!topic || t.primaryCategory?.id === topic) && words.every((w) => `${t.title} ${t.shortSummary ?? ""} ${t.overview ?? ""} ${t.primaryCategory?.name ?? ""}`.toLowerCase().includes(w)));
  const pages = Math.max(1, Math.ceil(found.length / PER_PAGE));
  const current = Math.min(page, pages);
  const shown = found.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const link = (o: { topic?: string; page?: number }) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    const t = o.topic === undefined ? topic : o.topic;
    if (t) p.set("topic", t);
    if (o.page && o.page > 1) p.set("page", String(o.page));
    const s = p.toString();
    return s ? `/tips?${s}` : "/tips";
  };
  const excerpt = (t: (typeof all)[number]) => (t.shortSummary || t.overview || "").replace(/\s+/g, " ").trim();
  const tab = "whitespace-nowrap border-b-2 px-1 pb-2.5 text-[14px] font-semibold transition-colors";

  return (
    <>
      <ListingHeader title={d.title} intro={d.text} tabs={GUIDE_TABS} active="/tips" />
      <div className="bg-white">
        <div className="container-site flex flex-col gap-6 py-6 sm:gap-8 sm:py-8">
          {/* Topics as plain tabs, and the search box beside them */}
          <div className="flex flex-col gap-4 border-b border-line lg:flex-row lg:items-end lg:justify-between">
            {topics.length ? (
              <nav aria-label="Topics" className="-mx-4 order-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:order-1">
                <ul className="flex gap-6">
                  <li><Link href={link({ topic: "" })} aria-current={topic ? undefined : "page"} className={`${tab} inline-block ${topic ? "border-transparent text-ink-soft hover:text-heading" : "border-heading text-heading"}`}>All tips</Link></li>
                  {topics.map(([id, name]) => (
                    <li key={id}><Link href={link({ topic: id })} aria-current={topic === id ? "page" : undefined} className={`${tab} inline-block ${topic === id ? "border-heading text-heading" : "border-transparent text-ink-soft hover:text-heading"}`}>{name}</Link></li>
                  ))}
                </ul>
              </nav>
            ) : <span className="order-2 lg:order-1" />}
            <form action="/tips" role="search" className="order-1 mb-0 flex w-full items-center gap-2 rounded-xl border border-line bg-page px-3 lg:order-2 lg:mb-3 lg:max-w-xs">
              {topic ? <input type="hidden" name="topic" value={topic} /> : null}
              <Search aria-hidden className="h-4 w-4 shrink-0 text-ink-muted" />
              <input name="q" type="search" defaultValue={q} placeholder="Search the tips" aria-label="Search business tips" className="h-11 w-full min-w-0 bg-transparent text-[14px] text-ink outline-none" />
            </form>
          </div>
          {q ? <p className="-mt-2 text-[14px] text-ink-soft" aria-live="polite"><strong className="font-semibold text-ink">{found.length} tip{found.length === 1 ? "" : "s"}</strong> for “{q}”. <Link href={link({})} className="font-semibold">Clear the search</Link></p> : null}

          {found.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-line px-6 py-14 text-center">
              <p className="text-[15px] font-semibold text-heading">{all.length ? "No tips match that. Try other words or another topic." : "The first tips are being written. Come back soon."}</p>
              {all.length ? <Link href="/tips" className="btn-outline min-h-[44px] px-5 text-sm">Show all tips</Link> : null}
            </div>
          ) : (
            <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((t) => {
                const picture = tipPicture(t.businessTip);
                const video = Boolean(t.businessTip?.videoUrl);
                const remarks = t.businessTip?._count.remarks ?? 0;
                return (
                  <li key={t.id}>
                    <Link href={`/tips/${t.slug}`} className="group flex h-full flex-col gap-3 text-ink hover:text-ink">
                      {picture ? (
                        <span className="relative block aspect-[16/9] overflow-hidden rounded-xl bg-page">
                          {/* eslint-disable-next-line @next/next/no-img-element -- uploaded photo or the YouTube thumbnail */}
                          <img src={picture} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                          {video ? <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/75 px-2.5 py-1 text-[12px] font-semibold text-white"><Play aria-hidden className="h-3 w-3 fill-current" />Video</span> : null}
                        </span>
                      ) : (
                        // No photo or video: a plain panel of the same size, so the grid lines up
                        <span className="flex aspect-[16/9] items-end rounded-xl border border-line bg-page p-4">
                          <span className="font-display text-[15px] font-bold leading-snug text-ink-soft">{t.primaryCategory?.name ?? "Business tip"}</span>
                        </span>
                      )}
                      <span className="flex flex-1 flex-col gap-2">
                        <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-brand-dark">{t.primaryCategory?.name ?? "Business tip"}</span>
                        <h2 className="font-display text-[19px] font-bold leading-snug text-heading group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4">{t.title}</h2>
                        <p className="line-clamp-2 text-[14px] leading-relaxed text-ink-soft">{excerpt(t)}</p>
                        <span className="mt-auto flex flex-wrap items-center gap-x-2 pt-1 text-[12px] text-ink-muted">
                          <span>{date(t.publishedAt ?? t.updatedAt)}</span><span aria-hidden>·</span><span>{readMinutes(t.overview)} min read</span>
                          {remarks ? <><span aria-hidden>·</span><span className="inline-flex items-center gap-1"><MessageCircle aria-hidden className="h-3.5 w-3.5" />{remarks}</span></> : null}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {pages > 1 ? (
            <nav aria-label="Pages" className="flex items-center justify-center gap-3 border-t border-line pt-6">
              {current > 1 ? <Link href={link({ page: current - 1 })} className="btn-outline min-h-[44px] px-5 text-sm">← Newer tips</Link> : null}
              <span className="text-[14px] text-ink-muted">Page {current} of {pages}</span>
              {current < pages ? <Link href={link({ page: current + 1 })} className="btn-outline min-h-[44px] px-5 text-sm">Older tips →</Link> : null}
            </nav>
          ) : null}
        </div>
      </div>
    </>
  );
}
