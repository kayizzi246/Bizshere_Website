import Link from "next/link";
import { notFound } from "next/navigation";
import { LockKeyhole, MessageCircle, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { date } from "@/lib/format";
import { ago, shortName } from "@/lib/forum";
import { addTipRemark } from "@/app/actions/community";
import { Crumbs, trackView } from "@/components/DetailParts";
import { RememberVisit } from "@/components/Recent";

export const dynamic = "force-dynamic";

const PREVIEW = 280;

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const t = await prisma.contentItem.findFirst({ where: { slug: params.slug, contentType: "BUSINESS_TIP", publicationStatus: "PUBLISHED" }, select: { title: true } });
  return { title: t?.title ?? "Business Tips" };
}

/**
 * One business tip: title, category, the details, then members' remarks. Free to read unless the team
 * made it members-only (Who sees the full details?): then visitors see the start of it. Only members
 * can add a remark; remarks show at once and the team can hide one at /admin/forum.
 */
export default async function TipPage({ params, searchParams }: { params: { slug: string }; searchParams: { remark?: string } }) {
  const viewer = await getViewer();
  const item = await prisma.contentItem.findFirst({
    where: { slug: params.slug, contentType: "BUSINESS_TIP", publicationStatus: viewer.isStaff ? undefined : "PUBLISHED" },
    select: {
      id: true, slug: true, title: true, shortSummary: true, overview: true, accessLevel: true, publishedAt: true, updatedAt: true,
      primaryCategory: { select: { name: true } },
      businessTip: { select: { id: true, remarks: { where: { hiddenAt: null }, orderBy: { createdAt: "asc" }, take: 200, select: { id: true, body: true, createdAt: true, author: { select: { name: true, role: true } } } } } },
    },
  });
  if (!item?.businessTip) notFound();
  const path = `/tips/${item.slug}`;
  await trackView(viewer, item.id, path);
  const gated = item.accessLevel !== "PUBLIC" && !viewer.isMember;
  const details = item.overview ?? "";
  const shown = gated ? `${details.slice(0, PREVIEW).trimEnd()}${details.length > PREVIEW ? "…" : ""}` : details;
  const remarks = item.businessTip.remarks;
  const note = searchParams.remark;

  return (
    <div className="container-site flex max-w-3xl flex-col gap-6 py-6">
      <Crumbs trail={[["/tips", "Business Tips"]]} title={item.title} />
      <article className="flex flex-col gap-4">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#FCE7F1] px-3 py-1 text-[13px] font-bold text-[#BE185D]"><Sparkles aria-hidden className="h-4 w-4" />{item.primaryCategory?.name ?? "Business tip"}</span>
        <h1 className="text-page-title">{item.title}</h1>
        {item.shortSummary ? <p className="max-w-3xl text-[17px] leading-relaxed text-ink-soft">{item.shortSummary}</p> : null}
        <span className="text-sm text-ink-muted">Published {date(item.publishedAt ?? item.updatedAt)}</span>
        <RememberVisit tone="light" item={{ href: path, title: item.title, kind: "Business tip", icon: "tip" }} />
        <div className="card relative overflow-hidden p-6 sm:p-7">
          <p className="whitespace-pre-line text-[16px] leading-relaxed text-ink sm:text-[17px]">{shown}</p>
          {gated && details.length > PREVIEW ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-brand-tint p-4 text-sm font-semibold text-brand-dark">
              <LockKeyhole aria-hidden className="h-4 w-4" />The rest of this tip is for members.
              <Link href={viewer.userId ? "/membership" : `/login?callbackUrl=${encodeURIComponent(path)}`} className="btn-primary min-h-[40px] px-5 text-sm">{viewer.userId ? "Become a member" : "Log in"}</Link>
            </div>
          ) : null}
        </div>
      </article>

      {/* Members' remarks */}
      <section id="remarks" className="flex scroll-mt-28 flex-col gap-4">
        <h2 className="flex items-center gap-2 font-display text-[20px] font-extrabold text-heading"><MessageCircle aria-hidden className="h-5 w-5 text-[#BE185D]" />Members&apos; remarks <span className="text-base font-semibold text-ink-muted">({remarks.length})</span></h2>
        {note === "sent" ? <p role="status" className="rounded-xl bg-brand-tint p-3 text-sm font-bold text-brand-dark">Thank you. Your remark is up.</p> : note ? <p role="alert" className="rounded-xl bg-bad-bg p-3 text-sm font-semibold text-bad-fg">Not added. {note}</p> : null}
        {remarks.length ? (
          <ol className="flex flex-col gap-3">
            {remarks.map((r) => {
              const team = r.author.role === "ADMIN" || r.author.role === "EDITOR";
              return (
                <li key={r.id} className="flex gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-extrabold ${team ? "bg-brand text-white" : "bg-[#FCE7F1] text-[#BE185D]"}`}>{(team ? "B" : shortName(r.author.name).charAt(0)).toUpperCase()}</span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-3">
                    <span className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-[14px] font-bold text-heading">{team ? "BizSphere team" : shortName(r.author.name)}</span>
                      <time dateTime={r.createdAt.toISOString()} className="text-[12px] text-ink-muted">{ago(r.createdAt)}</time>
                    </span>
                    <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ink-soft">{r.body}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : <p className="text-sm text-ink-muted">No remarks yet.{viewer.isMember ? " Be the first." : ""}</p>}

        {viewer.isMember ? (
          <form action={addTipRemark} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
            <input type="hidden" name="tipId" value={item.businessTip.id} />
            <label className="label">Add your remark
              <textarea name="body" required maxLength={1000} rows={3} placeholder="Has this worked for you? Add what you have learned." className="input py-2.5" />
            </label>
            <button className="btn-primary self-end bg-[#BE185D] px-6 hover:bg-[#9D174D]">Post remark</button>
          </form>
        ) : (
          <p className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-line-strong p-4 text-sm text-ink-soft">
            Members can add remarks.
            <Link href={viewer.userId ? "/membership" : `/login?callbackUrl=${encodeURIComponent(path + "#remarks")}`} className="btn-primary min-h-[40px] px-5 text-sm">{viewer.userId ? "Become a member" : "Log in"}</Link>
          </p>
        )}
      </section>
    </div>
  );
}
