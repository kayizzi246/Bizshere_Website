import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, LockKeyhole, MessageCircle, Sparkles } from "lucide-react";
import { tipCover, readMinutes } from "@/lib/tips";
import { ShareButton } from "@/components/ShareButton";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { date } from "@/lib/format";
import { ago, shortName } from "@/lib/forum";
import { addTipRemark } from "@/app/actions/community";
import { trackView } from "@/components/DetailParts";
import { RememberVisit } from "@/components/Recent";

export const dynamic = "force-dynamic";

const PREVIEW = 280;

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const t = await prisma.contentItem.findFirst({ where: { slug: params.slug, contentType: "BUSINESS_TIP", publicationStatus: "PUBLISHED" }, select: { title: true } });
  return { title: t?.title ?? "Business Tips" };
}

/**
 * Laid out as a blog post (client, 11 Nov 2026): a coloured cover with the topic, title, date and reading
 * time; the text in a narrow, easy-to-read column, paragraph by paragraph; then more tips to read next, and
 * the members' remarks as the comments.
 *
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
  // Paragraphs as typed in the admin (an empty line between them); a line starting with - or • is a list point
  const paragraphs = shown.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  // What to read next: the same topic first, then the newest
  const others = await prisma.contentItem.findMany({
    where: { contentType: "BUSINESS_TIP", publicationStatus: "PUBLISHED", id: { not: item.id } },
    select: { slug: true, title: true, overview: true, publishedAt: true, updatedAt: true, primaryCategory: { select: { name: true } } },
    orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }], take: 30,
  });
  const next = [...others.filter((o) => o.primaryCategory?.name === item.primaryCategory?.name), ...others.filter((o) => o.primaryCategory?.name !== item.primaryCategory?.name)].slice(0, 3);
  const note = searchParams.remark;

  return (
    <div className="bg-[#F1F4F8]">
      {/* The cover: topic, title, date and reading time */}
      <header className={`under-header relative overflow-hidden text-white ${tipCover(item.primaryCategory?.name)}`}>
        <Sparkles aria-hidden className="pointer-events-none absolute -bottom-10 -right-8 h-64 w-64 text-white/10" strokeWidth={1} />
        <div className="container-site relative flex max-w-3xl flex-col gap-4 pb-10 pt-6 sm:pb-14 sm:pt-8">
          <Link href="/tips" className="inline-flex w-fit items-center gap-1.5 text-[14px] font-semibold text-white/85 hover:text-white"><ArrowLeft aria-hidden className="h-4 w-4" />All business tips</Link>
          <span className="w-fit rounded-full bg-white px-3 py-1 text-[12px] font-bold text-heading">{item.primaryCategory?.name ?? "Business tip"}</span>
          <h1 className="text-hero text-[30px] leading-[1.15] text-white sm:text-[42px]">{item.title}</h1>
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-white/85">
            <span>{date(item.publishedAt ?? item.updatedAt)}</span>
            <span className="inline-flex items-center gap-1.5"><Clock aria-hidden className="h-4 w-4" />{readMinutes(details)} min read</span>
            <a href="#remarks" className="inline-flex items-center gap-1.5 text-white/85 hover:text-white"><MessageCircle aria-hidden className="h-4 w-4" />{remarks.length} remark{remarks.length === 1 ? "" : "s"}</a>
          </span>
        </div>
      </header>

      <div className="container-site flex max-w-3xl flex-col gap-8 py-6 sm:py-10">
      <article className="flex flex-col gap-5 rounded-3xl bg-white p-6 sm:p-10">
        <RememberVisit tone="light" item={{ href: path, title: item.title, kind: "Business tip", icon: "tip" }} />
        {item.shortSummary ? <p className="border-l-4 border-accent pl-4 text-[18px] font-medium leading-relaxed text-heading sm:text-[20px]">{item.shortSummary}</p> : null}
        <div className="flex flex-col gap-5 text-[17px] leading-[1.75] text-ink sm:text-[18px]">
          {paragraphs.map((p, n) => {
            const lines = p.split("\n").map((l) => l.trim()).filter(Boolean);
            const list = lines.length > 1 && lines.every((l) => /^([-•*]|\d+[.)])\s+/.test(l));
            return list
              ? <ul key={n} className="flex flex-col gap-2 pl-1">{lines.map((l) => <li key={l} className="flex gap-3"><span aria-hidden className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{l.replace(/^([-•*]|\d+[.)])\s+/, "")}</li>)}</ul>
              : <p key={n} className="whitespace-pre-line">{p}</p>;
          })}
        </div>
        {gated && details.length > PREVIEW ? (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-brand-tint p-5 text-[15px] font-semibold text-brand-dark">
            <LockKeyhole aria-hidden className="h-5 w-5" />The rest of this tip is for members.
            <Link href={viewer.userId ? "/membership" : `/login?callbackUrl=${encodeURIComponent(path)}`} className="btn-primary min-h-[44px] px-5 text-sm">{viewer.userId ? "Become a member" : "Log in"}</Link>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <span className="text-[14px] text-ink-muted">Was this useful? Share it with another business owner.</span>
          <ShareButton title={item.title} path={path} />
        </div>
      </article>

      {/* What to read next */}
      {next.length ? (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-[20px] font-extrabold text-heading">Read next</h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {next.map((o) => (
              <li key={o.slug}>
                <Link href={`/tips/${o.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white text-ink hover:text-ink">
                  <span className={`h-2 w-full ${tipCover(o.primaryCategory?.name)}`} />
                  <span className="flex flex-1 flex-col gap-2 p-4">
                    <span className="text-[12px] text-ink-muted">{o.primaryCategory?.name ?? "Business tip"} · {readMinutes(o.overview)} min read</span>
                    <span className="font-display text-[15px] font-bold leading-snug text-heading group-hover:text-brand">{o.title}</span>
                    <span className="mt-auto inline-flex items-center gap-1 pt-1 text-[13px] font-semibold text-brand">Read<ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
    </div>
  );
}
