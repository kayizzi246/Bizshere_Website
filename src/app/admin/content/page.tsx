import Link from "next/link";
import type { ContentType, Prisma, PublicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { date, itemHref } from "@/lib/format";
import { archiveContent, deleteContentBulk, sendForReReview } from "../actions";
import { staffAccess } from "@/lib/access";
import { contentArea } from "@/lib/admin-areas";
import { redirect } from "next/navigation";
import { SERVICE_STYLE, STATUS_WORDS } from "@/lib/service-style";
import { SelectAllRows, SelectedActions } from "./SelectRows";

export const dynamic = "force-dynamic";
export const metadata = { title: "Content" };

const DIRS: ["" | ContentType, string][] = [["", "All"], ["BUSINESS_IDEA", "Business Ideas"], ["MACHINE", "Business Machines"], ["SUPPLIER", "Trusted Suppliers"], ["FUNDING_PROGRAMME", "Funding Sources"], ["INVESTMENT_OPPORTUNITY", "Opportunities"], ["GUIDE", "Business Guides"], ["CONSULTANT", "Business Experts"], ["TOOL", "Business Tools"], ["WEBSITE", "Useful Websites"], ["NEWS", "Business News"], ["BUSINESS_TIP", "Business Tips"]];
// What the team looks for: what is live, what isn't yet, and what is due a check
const SHOW: [string, string, PublicationStatus | "CHECK" | null][] = [["all", "Everything", null], ["live", "Live", "PUBLISHED"], ["draft", "Drafts", "DRAFT"], ["waiting", "Waiting for a check", "IN_REVIEW"], ["hidden", "Hidden", "ARCHIVED"], ["check", "Due a check", "CHECK"]];

/**
 * Admin > All content: every page the staff member may edit, newest change first. Each row says what it
 * is (in its service colour), whether it is live, and when it last changed, with Edit and View. Tick
 * rows to take them off the site or delete them.
 */
export default async function ContentPage({ searchParams }: { searchParams: { type?: string; show?: string; q?: string; deleted?: string } }) {
  const user = await staffAccess();
  // Only the directories this staff member may edit (sub-admins: their areas).
  const mine = DIRS.filter(([t]) => !t || user.can(contentArea(t))).filter(([t], _n, all) => t || all.length > 1);
  const allowed = mine.filter(([t]) => t).map(([t]) => t as ContentType);
  if (!allowed.length) redirect("/admin?denied=content");
  const type = mine.some(([t]) => t === searchParams.type) ? (searchParams.type as ContentType | "") : "";
  const show = SHOW.find(([k]) => k === searchParams.show) ?? SHOW[0];
  const q = searchParams.q?.trim() ?? "";
  const now = new Date();
  const base: Prisma.ContentItemWhereInput = { contentType: type || { in: allowed }, ...(q ? { title: { contains: q, mode: "insensitive" } } : {}) };
  const statusWhere = (s: (typeof SHOW)[number][2]): Prisma.ContentItemWhereInput => (s === "CHECK" ? { nextReviewDueAt: { lt: now } } : s ? { publicationStatus: s } : {});
  const where: Prisma.ContentItemWhereInput = { ...base, ...statusWhere(show[2]) };
  const [items, total, counts] = await Promise.all([
    prisma.contentItem.findMany({ where, select: { id: true, slug: true, title: true, contentType: true, publicationStatus: true, updatedAt: true, nextReviewDueAt: true }, orderBy: { updatedAt: "desc" }, take: 100 }),
    prisma.contentItem.count({ where }),
    Promise.all(SHOW.map(([, , s]) => prisma.contentItem.count({ where: { ...base, ...statusWhere(s) } }))),
  ]);
  const href = (set: Record<string, string>) => "?" + new URLSearchParams(Object.entries({ type, show: show[0], q, ...set }).filter(([, v]) => v && v !== "all")).toString();
  const keep = href({}).slice(1);
  const addLabel = type ? SERVICE_STYLE[type].name.toLowerCase() : "content";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="font-display text-[22px] font-extrabold tracking-tight text-heading">All content</h1><p className="text-sm text-ink-muted">Find a page, then Edit or View it.</p></div>
        <Link href={`/admin/content/new${type ? `?type=${type}` : ""}`} className="btn-primary">+ Add {addLabel}</Link>
      </div>

      {searchParams.deleted ? <p role="status" className="rounded-xl bg-brand-tint p-4 text-sm font-semibold text-brand-dark">Deleted {searchParams.deleted}.</p> : null}

      {/* Which service */}
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0"><div role="tablist" className="inline-flex gap-0.5 rounded-full border border-line bg-surface p-1">
        {mine.map(([t, l]) => (
          <Link key={t} role="tab" aria-selected={type === t} href={href({ type: t })} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] ${type === t ? "bg-brand-deep font-semibold text-white hover:text-white" : "font-medium text-ink-soft hover:bg-page hover:text-heading"}`}>
            {t ? <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: SERVICE_STYLE[t].colour }} /> : null}{l}
          </Link>
        ))}
      </div></div>

      {/* Live or not, and a search */}
      <div className="flex flex-wrap items-center gap-2">
        {SHOW.map(([k, l], n) => (
          <Link key={k} href={href({ show: k })} aria-current={show[0] === k ? "page" : undefined} className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ${show[0] === k ? "bg-heading text-white hover:text-white" : "border border-line bg-surface text-ink-soft hover:text-heading"}`}>
            {l} <span className={show[0] === k ? "text-white/70" : "text-ink-muted"}>{counts[n]}</span>
          </Link>
        ))}
        <form action="/admin/content" className="ml-auto flex items-center gap-2">
          {type ? <input type="hidden" name="type" value={type} /> : null}
          {show[0] !== "all" ? <input type="hidden" name="show" value={show[0]} /> : null}
          <label htmlFor="content-q" className="sr-only">Search by name</label>
          <input id="content-q" name="q" defaultValue={q} placeholder="Search by name" className="input min-h-[40px] w-[220px]" />
          <button className="btn-outline min-h-[40px] px-4">Search</button>
        </form>
      </div>

      <form className="overflow-hidden rounded-xl border border-line bg-surface">
        {/* After a delete, back to this same list */}
        <input type="hidden" name="back" value={keep} />
        <SelectedActions review={sendForReReview} archive={archiveContent} remove={user.superAdmin ? deleteContentBulk : undefined} />
        {total > items.length ? <p className="border-b border-line bg-page px-3 py-2 text-[13px] text-ink-muted">Showing the newest {items.length} of {total}. Search or pick a service to find others.</p> : null}
        <div className="overflow-x-auto">
          <table className="table-base min-w-[720px]">
            <thead><tr><th className="w-9"><SelectAllRows /></th><th>Name</th><th>Status</th><th>Last changed</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {items.map((i) => {
                const s = SERVICE_STYLE[i.contentType];
                const [word, badge] = STATUS_WORDS[i.publicationStatus];
                const due = i.nextReviewDueAt && i.nextReviewDueAt < now;
                return (
                  <tr key={i.id}>
                    <td><input type="checkbox" name="ids" value={i.id} aria-label={`Select ${i.title}`} className="h-[17px] w-[17px] accent-brand" /></td>
                    <td>
                      <span className="flex flex-col gap-1">
                        <Link href={`/admin/content/${i.id}`} className="font-bold text-heading hover:text-brand">{i.title}</Link>
                        <span className="inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: s.soft, color: s.colour }}>
                          <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: s.colour }} />{s.name}
                        </span>
                      </span>
                    </td>
                    <td><span className="flex flex-col items-start gap-1"><span className={badge}>{word}</span>{due ? <span className="badge-warn">Due a check</span> : null}</span></td>
                    <td className="whitespace-nowrap text-ink-muted">{date(i.updatedAt)}</td>
                    <td>
                      <span className="flex justify-end gap-2">
                        <Link href={`/admin/content/${i.id}`} className="btn-primary min-h-[38px] px-4 text-[13px]">Edit</Link>
                        <Link href={itemHref(i)} target="_blank" className="btn-outline min-h-[38px] px-3 text-[13px]">View ↗</Link>
                      </span>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 ? <tr><td colSpan={5} className="py-8 text-center text-ink-muted">Nothing here yet. <Link href={`/admin/content/new${type ? `?type=${type}` : ""}`} className="font-semibold">Add {addLabel}</Link></td></tr> : null}
            </tbody>
          </table>
        </div>
      </form>
    </>
  );
}
