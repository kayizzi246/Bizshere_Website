import Link from "next/link";
import { MessagesSquare, Pin, Plus, Search } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { directory, directoryMetadata } from "@/config/directories";
import { ago, shortName, TITLE_MAX, BODY_MAX } from "@/lib/forum";
import { startForumTopic } from "@/app/actions/community";

export const dynamic = "force-dynamic";
export const metadata = directoryMetadata("/forum");

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => ((Array.isArray(v) ? v[0] : v) ?? "").trim();

/**
 * The Business Forum: topics as a list of chats, the busiest first (pinned ones on top), each with its
 * last message, like the chat list in WhatsApp. Filter by category, search titles. Members start a
 * topic from the box at the top; everyone can read.
 */
export default async function ForumPage({ searchParams }: { searchParams: SP }) {
  const viewer = await getViewer();
  const q = one(searchParams.q).slice(0, 80);
  const cat = one(searchParams.category);
  const error = one(searchParams.error);
  const d = directory("/forum");

  const categories = await prisma.category.findMany({ where: { kind: "FORUM_CATEGORY" }, orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } });
  const chosen = categories.find((c) => c.slug === cat);
  const where: Prisma.ForumTopicWhereInput = {
    status: { not: "HIDDEN" },
    ...(chosen ? { categoryId: chosen.id } : {}),
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
  };
  const topics = await prisma.forumTopic.findMany({
    where,
    orderBy: [{ isPinned: "desc" }, { lastPostAt: "desc" }],
    take: 100,
    select: {
      id: true, title: true, status: true, isPinned: true, lastPostAt: true,
      category: { select: { name: true } },
      author: { select: { name: true } },
      _count: { select: { posts: { where: { hiddenAt: null } } } },
      posts: { where: { hiddenAt: null }, orderBy: { createdAt: "desc" }, take: 1, select: { body: true, author: { select: { name: true, role: true } } } },
    },
  });
  const link = (set: Record<string, string>) => {
    const u = new URLSearchParams(Object.entries({ q, category: cat, ...set }).filter(([, v]) => v));
    return u.size ? `/forum?${u}` : "/forum";
  };

  return (
    <>
      <header className="under-header hero-glow bg-navy text-white">
        <div className="container-site flex flex-col gap-5 py-10 sm:py-14">
          <div className="flex max-w-3xl flex-col gap-3">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[13px] font-bold text-ink"><MessagesSquare aria-hidden className="h-4 w-4" />{d.title}</span>
            <h1 className="text-hero text-[28px] sm:text-[36px] xl:text-[42px]">Talk business with others</h1>
            <p className="text-[15px] leading-relaxed text-white/80 sm:text-base">{d.text} Anyone can read. Members can start topics and reply.</p>
          </div>
          <form action="/forum" role="search" className="flex w-full max-w-2xl items-center gap-2 rounded-2xl bg-white p-2 text-ink">
            {cat ? <input type="hidden" name="category" value={cat} /> : null}
            <Search aria-hidden className="ml-2 h-5 w-5 shrink-0 text-ink-muted" />
            <label htmlFor="forum-q" className="sr-only">Search topics</label>
            <input id="forum-q" name="q" defaultValue={q} placeholder="Search topics" className="min-h-[44px] min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
            <button className="btn-primary min-h-[44px] px-5">Search</button>
          </form>
        </div>
      </header>

      <div className="container-site flex flex-col gap-5 py-8">
        {/* Start a topic */}
        <details id="start" open={Boolean(error)} className="group scroll-mt-28 rounded-2xl border border-line bg-surface [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-5">
            <span className="inline-flex items-center gap-2 font-display text-base font-extrabold text-heading"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0F5B3E] text-white"><Plus aria-hidden className="h-5 w-5" /></span>Start a new topic</span>
            <span className="text-sm font-semibold text-brand group-open:hidden">Open</span>
          </summary>
          <div className="border-t border-line p-4 sm:p-5">
            {viewer.isMember ? (
              <form action={startForumTopic} className="flex flex-col gap-3">
                {error ? <p role="alert" className="rounded-lg bg-bad-bg px-3 py-2 text-sm font-semibold text-bad-fg">{error}</p> : null}
                <div className="flex flex-wrap gap-3">
                  <label className="label min-w-0 flex-[3_1_320px]">Title *
                    <input name="title" required minLength={5} maxLength={TITLE_MAX} placeholder="e.g. Where do you buy packaging in Kampala?" className="input" />
                  </label>
                  <label className="label min-w-0 flex-[1_1_200px]">Category
                    <select name="categoryId" defaultValue="" className="input">
                      <option value="">General</option>
                      {categories.filter((c) => c.slug !== "general").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </label>
                </div>
                <label className="label">First message *
                  <textarea name="body" required maxLength={BODY_MAX} rows={4} placeholder="Ask your question or share what you know." className="input py-2.5" />
                </label>
                <button className="btn-primary self-end bg-[#0F5B3E] px-8 hover:bg-[#0B4630]">Start topic</button>
              </form>
            ) : (
              <p className="flex flex-wrap items-center gap-3 text-sm text-ink-soft">
                {viewer.userId ? "Starting topics is for members." : "Log in as a member to start a topic."}
                <Link href={viewer.userId ? "/membership" : "/login?callbackUrl=%2Fforum%23start"} className="btn-primary min-h-[40px] px-5 text-sm">{viewer.userId ? "Become a member" : "Log in"}</Link>
              </p>
            )}
          </div>
        </details>

        {/* Categories */}
        <nav aria-label="Categories" className="flex flex-wrap gap-2">
          {[{ slug: "", name: "All topics" }, ...categories].map((c) => {
            const on = c.slug === (chosen?.slug ?? "");
            return <Link key={c.slug || "all"} href={link({ category: c.slug })} aria-current={on ? "page" : undefined} className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${on ? "bg-heading text-white hover:text-white" : "border border-line bg-surface text-ink-soft hover:border-brand hover:text-brand"}`}>{c.name}</Link>;
          })}
        </nav>

        {/* Topics, as a chat list */}
        {topics.length ? (
          <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {topics.map((t) => {
              const last = t.posts[0];
              const who = last ? (last.author.role === "ADMIN" || last.author.role === "EDITOR" ? "BizSphere team" : shortName(last.author.name)) : "";
              return (
                <li key={t.id}>
                  <Link href={`/forum/${t.id}`} className="group flex items-center gap-3 px-4 py-3.5 text-ink hover:bg-page hover:text-ink sm:gap-4 sm:px-5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#DCF3E6] font-display text-[17px] font-extrabold text-[#0F5B3E]">{t.title.charAt(0).toUpperCase()}</span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-center gap-2">
                        {t.isPinned ? <Pin aria-label="Pinned" className="h-3.5 w-3.5 shrink-0 text-accent-dark" /> : null}
                        <span className="truncate font-display text-[15px] font-bold text-heading group-hover:text-brand sm:text-[16px]">{t.title}</span>
                      </span>
                      <span className="truncate text-[13px] text-ink-muted">{last ? <><span className="font-semibold text-ink-soft">{who}:</span> {last.body}</> : `Started by ${shortName(t.author.name)}`}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1 text-[12px] text-ink-muted">
                      <span>{ago(t.lastPostAt)}</span>
                      <span className="flex items-center gap-1.5">
                        {t.status === "CLOSED" ? <span className="badge-muted">Closed</span> : null}
                        {t.category ? <span className="hidden badge-muted sm:inline-flex">{t.category.name}</span> : null}
                        <span className="rounded-full bg-[#0F5B3E] px-2 py-px text-[11px] font-bold text-white">{t._count.posts}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-line-strong p-8 text-center text-ink-muted">{q || chosen ? "No topics match. Try another word or category." : "No topics yet. Start the first one."}</p>
        )}
      </div>
    </>
  );
}
