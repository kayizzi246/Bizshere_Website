import Link from "next/link";
import { ArrowRight, Clock, MessageCircle, Search, Sparkles } from "lucide-react";
import { ListingHeader } from "@/components/DirectoryList";
import { directory, directoryMetadata } from "@/config/directories";
import { date, GUIDE_TABS } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { tipCover, readMinutes } from "@/lib/tips";

export const dynamic = "force-dynamic";
export const metadata = directoryMetadata("/tips");

const PER_PAGE = 13; // the newest one large, then twelve cards

/**
 * Business Tips, laid out as a blog (client, 11 Nov 2026): the newest tip large at the top, then the
 * others as post cards, each with its topic, date, reading time, the opening lines and "Read the tip".
 * Topics are chips along the top; the search box looks in titles and text. Everything is in the address
 * (?topic=…&q=…&page=…), so a list can be shared.
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
      id: true, slug: true, title: true, shortSummary: true, overview: true, accessLevel: true, publishedAt: true, updatedAt: true,
      primaryCategory: { select: { id: true, name: true } },
      businessTip: { select: { _count: { select: { remarks: { where: { hiddenAt: null } } } } } },
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
  // The newest tip leads the first page, unless the visitor is searching
  const lead = current === 1 && !q ? shown[0] : undefined;
  const rest = lead ? shown.slice(1) : shown;
  const link = (o: { topic?: string; page?: number }) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    const t = o.topic === undefined ? topic : o.topic;
    if (t) p.set("topic", t);
    if (o.page && o.page > 1) p.set("page", String(o.page));
    const s = p.toString();
    return s ? `/tips?${s}` : "/tips";
  };
  const excerpt = (t: (typeof all)[number], max: number) => {
    const text = (t.shortSummary || t.overview || "").replace(/\s+/g, " ").trim();
    return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
  };
  const Meta = ({ t, light = false }: { t: (typeof all)[number]; light?: boolean }) => (
    <span className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] ${light ? "text-white/80" : "text-ink-muted"}`}>
      <span>{date(t.publishedAt ?? t.updatedAt)}</span>
      <span className="inline-flex items-center gap-1"><Clock aria-hidden className="h-3.5 w-3.5" />{readMinutes(t.overview)} min read</span>
      {t.businessTip?._count.remarks ? <span className="inline-flex items-center gap-1"><MessageCircle aria-hidden className="h-3.5 w-3.5" />{t.businessTip._count.remarks}</span> : null}
    </span>
  );
  const chip = "whitespace-nowrap rounded-full border px-4 py-2 text-[14px] font-semibold transition-colors";

  return (
    <>
      <ListingHeader title={d.title} intro={d.text} tabs={GUIDE_TABS} active="/tips" />
      <div className="bg-[#F1F4F8]">
        <div className="container-site flex flex-col gap-6 py-6 sm:gap-8 sm:py-8">
          {/* Search, and the topics as chips */}
          <div className="flex flex-col gap-3">
            <form action="/tips" role="search" className="flex w-full max-w-xl items-center gap-2 rounded-2xl border border-line bg-white p-1.5">
              {topic ? <input type="hidden" name="topic" value={topic} /> : null}
              <Search aria-hidden className="ml-3 h-5 w-5 shrink-0 text-ink-muted" />
              <input name="q" type="search" defaultValue={q} placeholder="Search the tips, e.g. customers, stock, saving" aria-label="Search business tips" className="h-11 w-full min-w-0 bg-transparent text-[15px] text-ink outline-none" />
              <button className="btn-primary min-h-[44px] shrink-0 rounded-xl px-5 text-[14px]">Search</button>
            </form>
            {topics.length ? (
              <nav aria-label="Topics" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
                <ul className="flex gap-2 sm:flex-wrap">
                  <li><Link href={link({ topic: "" })} aria-current={topic ? undefined : "page"} className={`${chip} inline-flex ${topic ? "border-line bg-white text-ink hover:border-brand hover:text-brand" : "border-brand bg-brand text-white hover:text-white"}`}>All tips</Link></li>
                  {topics.map(([id, name]) => (
                    <li key={id}><Link href={link({ topic: id })} aria-current={topic === id ? "page" : undefined} className={`${chip} inline-flex ${topic === id ? "border-brand bg-brand text-white hover:text-white" : "border-line bg-white text-ink hover:border-brand hover:text-brand"}`}>{name}</Link></li>
                  ))}
                </ul>
              </nav>
            ) : null}
            {q || topic ? <p className="text-[14px] text-ink-soft" aria-live="polite"><strong className="font-semibold text-ink">{found.length} tip{found.length === 1 ? "" : "s"}</strong>{q ? <> for “{q}”</> : null}. <Link href="/tips" className="font-semibold">Show all tips</Link></p> : null}
          </div>

          {found.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl bg-white px-6 py-14 text-center">
              <p className="text-[15px] font-semibold text-heading">{all.length ? "No tips match that. Try other words or another topic." : "The first tips are being written. Come back soon."}</p>
              {all.length ? <Link href="/tips" className="btn-primary min-h-[44px] px-5 text-sm">Show all tips</Link> : null}
            </div>
          ) : null}

          {/* The newest tip, large */}
          {lead ? (
            <Link href={`/tips/${lead.slug}`} className="group grid overflow-hidden rounded-3xl bg-white text-ink hover:text-ink md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
              <span className={`relative flex min-h-[180px] flex-col justify-between gap-6 p-6 text-white sm:p-8 ${tipCover(lead.primaryCategory?.name)}`}>
                <Sparkles aria-hidden className="pointer-events-none absolute -bottom-8 -right-6 h-44 w-44 text-white/15" strokeWidth={1} />
                <span className="relative w-fit rounded-full bg-white px-3 py-1 text-[12px] font-bold text-heading">Newest tip</span>
                <span className="relative flex flex-col gap-2">
                  <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-white/85">{lead.primaryCategory?.name ?? "Business tip"}</span>
                  <Meta t={lead} light />
                </span>
              </span>
              <span className="flex flex-col items-start justify-center gap-3 p-6 sm:p-8">
                <h2 className="text-hero text-[24px] leading-[1.2] text-black group-hover:text-brand sm:text-[30px]">{lead.title}</h2>
                <p className="text-[15px] leading-relaxed text-ink-soft sm:text-[16px]">{excerpt(lead, 260)}</p>
                <span className="mt-1 inline-flex h-11 items-center gap-1.5 rounded-full bg-brand px-5 text-[14px] font-semibold text-white">Read the tip<ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
              </span>
            </Link>
          ) : null}

          {/* The other posts */}
          {rest.length ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
              {rest.map((t) => (
                <li key={t.id}>
                  <Link href={`/tips/${t.slug}`} className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white text-ink transition-transform duration-200 hover:text-ink motion-safe:hover:-translate-y-1">
                    <span className={`relative flex h-24 items-end overflow-hidden p-4 ${tipCover(t.primaryCategory?.name)}`}>
                      <Sparkles aria-hidden className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 text-white/20" strokeWidth={1} />
                      <span className="relative rounded-full bg-white px-3 py-1 text-[12px] font-bold text-heading">{t.primaryCategory?.name ?? "Business tip"}</span>
                    </span>
                    <span className="flex flex-1 flex-col gap-2.5 p-5">
                      <Meta t={t} />
                      <h2 className="font-display text-[18px] font-extrabold leading-snug text-heading group-hover:text-brand">{t.title}</h2>
                      <p className="line-clamp-3 text-[14px] leading-relaxed text-ink-soft">{excerpt(t, 200)}</p>
                      <span className="mt-auto inline-flex items-center gap-1 pt-2 text-[14px] font-semibold text-brand">Read the tip<ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          {pages > 1 ? (
            <nav aria-label="Pages" className="flex items-center justify-center gap-3">
              {current > 1 ? <Link href={link({ page: current - 1 })} className="btn-outline min-h-[44px] bg-white px-5 text-sm">← Newer tips</Link> : null}
              <span className="text-[14px] text-ink-muted">Page {current} of {pages}</span>
              {current < pages ? <Link href={link({ page: current + 1 })} className="btn-outline min-h-[44px] bg-white px-5 text-sm">Older tips →</Link> : null}
            </nav>
          ) : null}
        </div>
      </div>
    </>
  );
}
