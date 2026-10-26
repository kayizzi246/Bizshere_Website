import Link from "next/link";
import type { ContentType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { contentTypeLabel, date } from "@/lib/format";
import { archiveContent, sendForReReview } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Content" };

const DIRS: ["" | ContentType, string][] = [["", "All"], ["BUSINESS_IDEA", "Business ideas"], ["MACHINE", "Machines"], ["SUPPLIER", "Suppliers"], ["FUNDING_PROGRAMME", "Funding"], ["INVESTMENT_OPPORTUNITY", "Opportunities"], ["GUIDE", "Guides"], ["CONSULTANT", "Experts"], ["RECIPE", "Recipes"], ["TOOL", "Tools"], ["WEBSITE", "Websites"], ["NEWS", "News"]];
const FRESH: [string, string][] = [["any", "Any freshness"], ["due", "Review due in 30 days"], ["over", "Overdue"], ["ok", "Fresh"]];
const STATUS_BADGE: Record<string, string> = { PUBLISHED: "badge-ok", IN_REVIEW: "badge-info", DRAFT: "badge-muted", ARCHIVED: "badge-muted" };

export default async function ContentPage({ searchParams }: { searchParams: { type?: string; fresh?: string; q?: string } }) {
  const type = DIRS.some(([t]) => t === searchParams.type) ? (searchParams.type as ContentType | "") : "";
  const fresh = FRESH.some(([f]) => f === searchParams.fresh) ? searchParams.fresh! : "any";
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 86_400_000);
  const where: Prisma.ContentItemWhereInput = {
    ...(type ? { contentType: type } : {}),
    ...(searchParams.q ? { title: { contains: searchParams.q, mode: "insensitive" } } : {}),
    ...(fresh === "over" ? { nextReviewDueAt: { lt: now } } : {}),
    ...(fresh === "due" ? { nextReviewDueAt: { gte: now, lt: in30 } } : {}),
    ...(fresh === "ok" ? { OR: [{ nextReviewDueAt: { gte: in30 } }, { nextReviewDueAt: null }] } : {}),
  };
  const items = await prisma.contentItem.findMany({ where, include: { createdBy: true, reviewedBy: true }, orderBy: [{ nextReviewDueAt: "asc" }], take: 100 });
  const href = (extra: Record<string, string>) => "?" + new URLSearchParams({ ...(type ? { type } : {}), fresh, ...extra }).toString();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-3xl font-extrabold tracking-tight">Content</h1><p className="text-sm text-ink-muted">Every directory, with publishing status, access level and freshness</p></div>
        <Link href={`/admin/content/new${type ? `?type=${type}` : ""}`} className="btn-primary">Add {type ? contentTypeLabel[type].toLowerCase() : "content"}</Link>
      </div>

      <div role="tablist" className="flex flex-wrap gap-1.5 border-b border-[#D9DDD6]">
        {DIRS.map(([t, l]) => (
          <Link key={t} role="tab" aria-selected={type === t} href={"?" + new URLSearchParams({ ...(t ? { type: t } : {}), fresh }).toString()} className={`-mb-px border-b-[3px] px-3.5 py-3 text-sm ${type === t ? "border-brand font-extrabold text-brand-dark" : "border-transparent font-semibold text-ink-soft"}`}>{l}</Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {FRESH.map(([f, l]) => <Link key={f} href={href({ fresh: f })} className={`rounded-full px-3.5 py-2 text-sm font-bold ${fresh === f ? "bg-ink text-white hover:text-white" : "border border-line-strong bg-white text-ink-soft"}`}>{l}</Link>)}
      </div>

      <form className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-end gap-2 border-b border-line p-3 text-sm">
          <span className="text-ink-muted">With selected:</span>
          <button formAction={sendForReReview} className="btn-outline min-h-[38px] px-3">Send for re-review</button>
          <button formAction={archiveContent} className="btn-outline min-h-[38px] px-3">Archive</button>
        </div>
        <div className="overflow-x-auto">
          <table className="table-base min-w-[880px]">
            <thead><tr><th className="w-9"><span className="sr-only">Select</span></th><th>Title</th><th>Status</th><th>Access</th><th>Last reviewed</th><th>Freshness</th><th>Owner</th></tr></thead>
            <tbody>
              {items.map((i) => {
                const overdue = i.nextReviewDueAt && i.nextReviewDueAt < now;
                const due = i.nextReviewDueAt && !overdue && i.nextReviewDueAt < in30;
                return (
                  <tr key={i.id}>
                    <td><input type="checkbox" name="ids" value={i.id} aria-label={`Select ${i.title}`} className="h-[17px] w-[17px] accent-brand" /></td>
                    <td><span className="flex flex-col"><Link href={`/admin/content/${i.id}`} className="font-bold">{i.title}</Link><span className="text-xs text-ink-muted">{contentTypeLabel[i.contentType]}</span></span></td>
                    <td><span className={STATUS_BADGE[i.publicationStatus]}>{i.publicationStatus.replace("_", " ").toLowerCase()}</span></td>
                    <td className="capitalize">{i.accessLevel.toLowerCase()}</td>
                    <td className="text-ink-muted">{date(i.lastReviewedAt)}</td>
                    <td>{overdue ? <span className="badge-bad">Overdue since {date(i.nextReviewDueAt)}</span> : due ? <span className="badge-warn">Due {date(i.nextReviewDueAt)}</span> : <span className="badge-ok">Fresh</span>}</td>
                    <td className="text-ink-muted">{i.reviewedBy?.name ?? i.createdBy?.name ?? "—"}</td>
                  </tr>
                );
              })}
              {items.length === 0 ? <tr><td colSpan={7} className="text-ink-muted">Nothing here matches this filter.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </form>
    </>
  );
}
