import Link from "next/link";
import type { ContentType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { contentTypeLabel, date } from "@/lib/format";
import { archiveContent, deleteContentBulk, sendForReReview } from "../actions";
import { requireStaff } from "@/lib/access";
import { ConfirmButton } from "@/components/ConfirmButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Content" };

const DIRS: ["" | ContentType, string][] = [["", "All"], ["BUSINESS_IDEA", "Business ideas"], ["MACHINE", "Machines"], ["SUPPLIER", "Suppliers"], ["FUNDING_PROGRAMME", "Funding"], ["INVESTMENT_OPPORTUNITY", "Opportunities"], ["GUIDE", "Guides"], ["CONSULTANT", "Experts"], ["TOOL", "Tools"], ["WEBSITE", "Websites"], ["NEWS", "News"]];
const FRESH: [string, string][] = [["any", "Any freshness"], ["due", "Review due in 30 days"], ["over", "Overdue"], ["ok", "Fresh"]];
const STATUS_BADGE: Record<string, string> = { PUBLISHED: "badge-ok", IN_REVIEW: "badge-info", DRAFT: "badge-muted", ARCHIVED: "badge-muted" };

export default async function ContentPage({ searchParams }: { searchParams: { type?: string; fresh?: string; q?: string; deleted?: string } }) {
  const user = await requireStaff();
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
        <div><h1 className="font-sans text-[22px] font-bold tracking-tight text-heading">Content</h1><p className="text-sm text-ink-muted">Every directory, with publishing status, access level and freshness</p></div>
        <Link href={`/admin/content/new${type ? `?type=${type}` : ""}`} className="btn-primary">Add {type ? contentTypeLabel[type].toLowerCase() : "content"}</Link>
      </div>

      {searchParams.deleted ? <p role="status" className="rounded-xl bg-brand-tint p-4 text-sm font-semibold text-brand-dark">Deleted {searchParams.deleted}. It has been removed from the database.</p> : null}

      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0"><div role="tablist" className="inline-flex gap-0.5 rounded-full border border-line bg-surface p-1">
        {DIRS.map(([t, l]) => (
          <Link key={t} role="tab" aria-selected={type === t} href={"?" + new URLSearchParams({ ...(t ? { type: t } : {}), fresh }).toString()} className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] ${type === t ? "bg-brand-deep font-semibold text-white hover:text-white" : "font-medium text-ink-soft hover:bg-page hover:text-heading"}`}>{l}</Link>
        ))}
      </div></div>

      <div className="flex flex-wrap gap-1.5">
        {FRESH.map(([f, l]) => <Link key={f} href={href({ fresh: f })} className={`rounded-full px-3 py-1 text-xs font-semibold ${fresh === f ? "bg-brand-tint text-brand-dark ring-1 ring-brand/20 hover:text-brand-dark" : "border border-line bg-surface text-ink-soft"}`}>{l}</Link>)}
      </div>

      <form className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex flex-wrap items-center justify-end gap-2 border-b border-line p-3 text-sm">
          <span className="text-ink-muted">With selected:</span>
          <button formAction={sendForReReview} className="btn-outline min-h-[44px] px-3">Send for re-review</button>
          <button formAction={archiveContent} className="btn-outline min-h-[44px] px-3">Archive</button>
          {user.role === "ADMIN" ? <ConfirmButton action={deleteContentBulk} title="Delete the selected pages?" message="The ticked pages and everything attached to them will be removed from the database." className="h-[38px]">Delete</ConfirmButton> : null}
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
