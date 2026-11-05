import Link from "next/link";
import { staffAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { date } from "@/lib/format";
import { PARTNER_CODES } from "@/lib/membership";
import { approvePartner } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Registrations" };

/**
 * Suppliers and experts who registered themselves (src/lib/partners.ts). A paid listing waits here
 * for the team to check it and put it live. Staff see the kinds their areas allow.
 */
export default async function PartnersPage({ searchParams }: { searchParams: { saved?: string } }) {
  const staff = await staffAccess();
  const codes = [...(staff.can("suppliers") ? [PARTNER_CODES.supplier] : []), ...(staff.can("experts") ? [PARTNER_CODES.expert] : [])];
  const item = { select: { id: true, title: true, slug: true, publicationStatus: true } };
  const subs = await prisma.subscription.findMany({
    where: { plan: { code: { in: codes } }, organizationId: { not: null } },
    include: {
      plan: { select: { code: true } },
      user: { select: { phone: true } },
      organization: { select: { status: true, supplier: { select: { contentItem: item } }, consultants: { select: { contentItem: item }, take: 1 } } },
    },
    orderBy: { startedAt: "desc" },
    take: 200,
  });
  const rows = subs.map((s) => {
    const listing = s.organization?.supplier?.contentItem ?? s.organization?.consultants[0]?.contentItem ?? null;
    const paid = s.status === "ACTIVE" && s.currentPeriodEnd !== null && s.currentPeriodEnd > new Date();
    const state = !listing ? "Removed" : listing.publicationStatus === "PUBLISHED" ? "Live" : listing.publicationStatus === "IN_REVIEW" ? "Paid: check and approve" : s.organization?.status === "SUSPENDED" ? "Lapsed: hidden until renewed" : listing.publicationStatus === "DRAFT" ? "Not paid yet" : "Archived";
    return { s, listing, paid, state, kind: s.plan.code === PARTNER_CODES.expert ? "Expert" : "Supplier" };
  });
  // The ones needing the team come first
  rows.sort((a, b) => Number(b.listing?.publicationStatus === "IN_REVIEW") - Number(a.listing?.publicationStatus === "IN_REVIEW"));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-heading">Registrations</h1>
        <p className="text-sm text-ink-muted">Suppliers and experts who registered and paid for themselves. Check the details, then approve to put the page live. Prices are at <Link href="/admin/plans">Prices</Link>.</p>
      </div>
      {searchParams.saved ? <p role="status" className="rounded-lg bg-brand-tint px-4 py-2.5 text-sm font-semibold text-brand-dark">Approved. The page is live and they have been told.</p> : null}
      {rows.length === 0 ? <p className="rounded-2xl border border-dashed border-line-strong bg-surface px-5 py-8 text-center text-sm text-ink-muted">No registrations yet.</p> : null}
      <ul className="flex flex-col gap-3">
        {rows.map(({ s, listing, paid, state, kind }) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-4">
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-bold text-heading">{listing?.title ?? "Removed listing"}</span>
              <span className="text-xs text-ink-muted">{kind} · {s.user?.phone ?? "No phone"} · {paid && s.currentPeriodEnd ? `Paid until ${date(s.currentPeriodEnd)}` : "Not paid"}</span>
            </span>
            <span className="rounded-full bg-page px-3 py-1 text-xs font-semibold text-ink-soft">{state}</span>
            {listing ? <Link href={`/admin/content/${listing.id}`} className="text-sm font-semibold">Check details</Link> : null}
            {listing?.publicationStatus === "IN_REVIEW" && paid ? (
              <form action={approvePartner}>
                <input type="hidden" name="subscriptionId" value={s.id} />
                <button className="btn-primary min-h-[40px] px-4 text-sm">Approve</button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
