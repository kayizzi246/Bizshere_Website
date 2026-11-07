import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireArea } from "@/lib/access";
import { ago } from "@/lib/forum";
import { setMessage, setRemark, setTopic } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Forum and remarks" };

const TABS = [["topics", "Topics"], ["messages", "Latest messages"], ["remarks", "Tip remarks"]] as const;
const STATUS: Record<string, string> = { OPEN: "badge-ok", CLOSED: "badge-muted", HIDDEN: "badge-bad" };

/**
 * The Business Forum and the remarks under Business Tips, for the team: close, hide or pin topics,
 * and hide single messages or remarks. Members' full names are shown here (the website shows a short
 * name), so the team knows who wrote what. Nothing is deleted; hidden things can be shown again.
 */
export default async function AdminForumPage({ searchParams }: { searchParams: { show?: string; done?: string } }) {
  await requireArea("community");
  const tab = TABS.find(([k]) => k === searchParams.show)?.[0] ?? "topics";
  const button = (label: string, tone = "btn-outline") => <button className={`${tone} min-h-[36px] px-3 text-[13px]`}>{label}</button>;
  const control = (action: (f: FormData) => Promise<void>, id: string, act: string, label: string, tone?: string) => (
    <form action={action}><input type="hidden" name="id" value={id} /><input type="hidden" name="act" value={act} />{button(label, tone)}</form>
  );

  const [topics, messages, remarks] = await Promise.all([
    tab === "topics" ? prisma.forumTopic.findMany({ orderBy: [{ isPinned: "desc" }, { lastPostAt: "desc" }], take: 200, select: { id: true, title: true, status: true, isPinned: true, lastPostAt: true, category: { select: { name: true } }, author: { select: { name: true } }, _count: { select: { posts: true } } } }) : [],
    tab === "messages" ? prisma.forumPost.findMany({ orderBy: { createdAt: "desc" }, take: 200, select: { id: true, body: true, createdAt: true, hiddenAt: true, author: { select: { name: true } }, topic: { select: { id: true, title: true } } } }) : [],
    tab === "remarks" ? prisma.businessTipRemark.findMany({ orderBy: { createdAt: "desc" }, take: 200, select: { id: true, body: true, createdAt: true, hiddenAt: true, author: { select: { name: true } }, tip: { select: { contentItem: { select: { title: true, slug: true } } } } } }) : [],
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-[22px] font-extrabold tracking-tight text-heading">Forum and remarks</h1>
        <p className="text-sm text-ink-muted">Everything members write shows at once. Hide anything that shouldn&apos;t be there; it can be shown again.</p>
      </div>
      {searchParams.done ? <p role="status" className="rounded-lg bg-brand-tint px-4 py-2.5 text-sm font-semibold text-brand-dark">{searchParams.done}.</p> : null}
      <nav className="flex flex-wrap gap-2">
        {TABS.map(([k, label]) => <Link key={k} href={`/admin/forum?show=${k}`} aria-current={k === tab ? "page" : undefined} className={`rounded-full px-4 py-2 text-sm font-semibold ${k === tab ? "bg-brand text-white hover:text-white" : "border border-line bg-surface text-ink-soft hover:text-brand"}`}>{label}</Link>)}
        <Link href="/forum" target="_blank" className="ml-auto self-center text-sm font-semibold">Open the forum ↗</Link>
      </nav>

      {tab === "topics" ? (
        topics.length ? (
          <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="table-base min-w-[760px]">
              <thead><tr><th>Topic</th><th>Started by</th><th>Messages</th><th>Last message</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {topics.map((t) => (
                  <tr key={t.id}>
                    <td className="max-w-[320px]"><Link href={`/forum/${t.id}`} target="_blank" className="font-bold">{t.isPinned ? "📌 " : ""}{t.title}</Link><span className="block text-xs text-ink-muted">{t.category?.name ?? "General"}</span></td>
                    <td>{t.author.name}</td>
                    <td>{t._count.posts}</td>
                    <td className="whitespace-nowrap text-ink-muted">{ago(t.lastPostAt)}</td>
                    <td><span className={STATUS[t.status]}>{t.status.toLowerCase()}</span></td>
                    <td><span className="flex flex-wrap justify-end gap-1.5">
                      {control(setTopic, t.id, t.isPinned ? "unpin" : "pin", t.isPinned ? "Unpin" : "Pin")}
                      {t.status !== "OPEN" ? control(setTopic, t.id, "open", "Open") : control(setTopic, t.id, "close", "Close")}
                      {t.status !== "HIDDEN" ? control(setTopic, t.id, "hide", "Hide", "btn-danger") : null}
                    </span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-ink-muted">No topics yet.</p>
      ) : null}

      {tab === "messages" || tab === "remarks" ? (
        (tab === "messages" ? messages.length : remarks.length) ? (
          <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
            {(tab === "messages"
              ? messages.map((m) => ({ id: m.id, body: m.body, at: m.createdAt, hidden: Boolean(m.hiddenAt), who: m.author.name, where: m.topic.title, href: `/forum/${m.topic.id}` }))
              : remarks.map((r) => ({ id: r.id, body: r.body, at: r.createdAt, hidden: Boolean(r.hiddenAt), who: r.author.name, where: r.tip.contentItem.title, href: `/tips/${r.tip.contentItem.slug}#remarks` }))
            ).map((x) => (
              <li key={x.id} className={`flex flex-wrap items-start justify-between gap-3 p-4 ${x.hidden ? "bg-page/70" : ""}`}>
                <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-1">
                  <span className="text-xs text-ink-muted"><strong className="text-ink">{x.who}</strong> in <Link href={x.href} target="_blank">{x.where}</Link> · {ago(x.at)}{x.hidden ? <span className="badge-bad ml-2">Hidden</span> : null}</span>
                  <p className={`whitespace-pre-wrap break-words text-sm ${x.hidden ? "text-ink-muted line-through" : "text-ink"}`}>{x.body}</p>
                </div>
                {control(tab === "messages" ? setMessage : setRemark, x.id, x.hidden ? "show" : "hide", x.hidden ? "Show again" : "Hide", x.hidden ? "btn-outline" : "btn-danger")}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-ink-muted">Nothing yet.</p>
      ) : null}
    </div>
  );
}
