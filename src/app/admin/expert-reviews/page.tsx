import Link from "next/link";
import { Check, X } from "lucide-react";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { date } from "@/lib/format";
import { moderateReview } from "@/app/actions/reviews";

export const dynamic = "force-dynamic";
export const metadata = { title: "Expert reviews" };

/**
 * Reviews users wrote on experts' pages. They show on the expert's page only once approved here.
 * The team can also add reviews itself in each expert's "Client reviews" in the content editor.
 */
export default async function ExpertReviewsPage({ searchParams }: { searchParams: { done?: string } }) {
  await requireRole(["EDITOR", "ADMIN"]);
  const waiting = await prisma.consultantReview.findMany({
    where: { moderation: "PENDING" },
    include: { consultant: { include: { contentItem: { select: { title: true, slug: true } } } }, author: { select: { name: true, phone: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-heading">Expert reviews</h1>
        <p className="text-sm text-ink-muted">Reviews users wrote. Approve to show them on the expert&apos;s page.</p>
      </div>
      {searchParams.done ? <p role="status" className="rounded-lg bg-brand-tint px-4 py-2.5 text-sm font-semibold text-brand-dark">Review {searchParams.done}.</p> : null}
      {waiting.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong bg-surface px-5 py-10 text-center text-sm text-ink-muted">No reviews waiting.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {waiting.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
              <span className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/experts/${r.consultant.contentItem.slug}`} className="font-bold">{r.consultant.contentItem.title}</Link>
                <span className="text-accent">{"★".repeat(r.rating)}<span className="text-line-strong">{"★".repeat(5 - r.rating)}</span></span>
              </span>
              {r.body ? <p className="whitespace-pre-line text-sm text-ink-soft">{r.body}</p> : null}
              <span className="text-xs text-ink-muted">By {r.author?.name ?? r.author?.phone ?? r.author?.email ?? "a user"} · {date(r.createdAt)}</span>
              <span className="flex gap-2">
                <form action={moderateReview}>
                  <input type="hidden" name="id" value={r.id} /><input type="hidden" name="decision" value="approve" />
                  <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-sm font-bold text-white hover:bg-brand-dark"><Check aria-hidden className="h-4 w-4" />Approve</button>
                </form>
                <form action={moderateReview}>
                  <input type="hidden" name="id" value={r.id} /><input type="hidden" name="decision" value="reject" />
                  <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold text-bad-fg hover:bg-bad-bg"><X aria-hidden className="h-4 w-4" />Reject</button>
                </form>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
