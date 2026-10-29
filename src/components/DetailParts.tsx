import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { contentTypeLabel, date, itemHref } from "@/lib/format";
import { toggleSave } from "@/app/actions/member";

/**
 * Building blocks for detail pages. Every detail page follows the blueprint (16) order:
 * 1 identity, 2 key facts, 3 practical detail, 4 evidence, 5 action, 6 connected resources.
 */

export function Crumbs({ trail, title }: { trail: [string, string][]; title: string }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[13px] text-ink-muted">
      <Link href="/" className="text-ink-muted hover:text-brand">Home</Link>
      {trail.map(([href, label]) => <span key={href} className="flex items-center gap-1.5"><span aria-hidden className="text-line-strong">/</span><Link href={href} className="text-ink-muted hover:text-brand">{label}</Link></span>)}
      <span aria-hidden className="text-line-strong">/</span><span className="max-w-[40ch] truncate text-ink">{title}</span>
    </nav>
  );
}

export function Identity({ eyebrow, title, summary, children }: { eyebrow: string; title: string; summary?: string | null; children?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <span className="eyebrow">{eyebrow}</span>
      <h1 className="text-page-title">{title}</h1>
      {summary ? <p className="max-w-3xl text-lg leading-relaxed text-ink-soft">{summary}</p> : null}
      {children}
    </section>
  );
}

export function Facts({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <section className="flex flex-wrap gap-3.5">
      {items.map(([label, value]) => (
        <div key={label} className="card flex flex-[1_1_200px] flex-col gap-1.5 px-5 py-4">
          <span className="text-sm text-ink-muted">{label}</span>
          <span className="text-lg font-bold">{value}</span>
        </div>
      ))}
    </section>
  );
}

export function Card({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card flex flex-col gap-3 p-7 ${className}`}>
      {title ? <h2 className="text-lg font-bold">{title}</h2> : null}
      {children}
    </section>
  );
}

/** Label/value rows. Rows with an empty value are skipped. */
export function Rows({ rows }: { rows: [string, React.ReactNode][] }) {
  const shown = rows.filter(([, v]) => v !== null && v !== undefined && v !== "" && v !== "—");
  if (!shown.length) return <p className="text-sm text-ink-muted">Not yet recorded.</p>;
  return (
    <div>
      {shown.map(([k, v]) => (
        <div key={k} className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-b border-line py-3 text-[15px] last:border-0">
          <span className="text-ink-muted">{k}</span>
          <span className="max-w-[60%] text-right font-semibold">{v}</span>
        </div>
      ))}
    </div>
  );
}

export function Prose({ text }: { text?: string | null }) {
  return text ? <p className="whitespace-pre-line leading-relaxed text-ink-soft">{text}</p> : null;
}

export function TwoColumn({ main, aside }: { main: React.ReactNode; aside: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start gap-7">
      <div className="flex min-w-0 flex-[999_1_640px] flex-col gap-5">{main}</div>
      <aside className="flex flex-[1_1_320px] flex-col gap-5">{aside}</aside>
    </div>
  );
}

/** 4. Evidence: sources, dates and freshness. Also hosts the Save and Report actions. */
export async function Evidence({ contentItemId, lastReviewedAt, nextReviewDueAt, viewer, back, extra }: {
  contentItemId: string;
  lastReviewedAt: Date | null;
  nextReviewDueAt: Date | null;
  viewer: Viewer;
  back: string;
  extra?: React.ReactNode;
}) {
  const [sources, saved] = await Promise.all([
    prisma.evidenceLink.findMany({ where: { contentItemId }, include: { source: true } }),
    viewer.userId ? prisma.savedItem.findUnique({ where: { userId_contentItemId: { userId: viewer.userId, contentItemId } } }) : null,
  ]);
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-6 text-sm text-ink-muted">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-sans text-xl font-bold tracking-[-0.01em] text-heading">Sources and checks</h2>
        {nextReviewDueAt && nextReviewDueAt < new Date()
          ? <span className="rounded-full bg-warn-bg px-2.5 py-1 text-xs font-semibold text-warn-fg">Review overdue</span>
          : <span className="rounded-full bg-brand-tint px-2.5 py-1 text-xs font-semibold text-brand-dark">Up to date</span>}
      </div>
      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-page p-3"><dt className="text-[11px] text-ink-muted">Last reviewed</dt><dd className="text-sm font-semibold text-ink">{date(lastReviewedAt)}</dd></div>
        <div className="rounded-xl bg-page p-3"><dt className="text-[11px] text-ink-muted">Next review due</dt><dd className="text-sm font-semibold text-ink">{date(nextReviewDueAt)}</dd></div>
      </dl>
      {extra}
      {sources.length ? (
        <ul className="flex flex-col gap-1.5">
          {sources.map((e) => (
            <li key={e.id}>
              <span className="badge-muted mr-1.5">{claimLabel[e.claimType]}</span>
              {e.source.sourceUrl ? <a href={e.source.sourceUrl} target="_blank" rel="noreferrer">{e.source.sourceTitle}</a> : e.source.sourceTitle}
              {e.source.publisherName ? `, ${e.source.publisherName}` : ""}
              {e.source.accessedAt ? ` (accessed ${date(e.source.accessedAt)})` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <form action={toggleSave}>
          <input type="hidden" name="contentItemId" value={contentItemId} />
          <input type="hidden" name="back" value={back} />
          <button className="inline-flex h-11 items-center gap-1.5 rounded-[10px] border border-line px-4 text-[13px] font-semibold text-ink hover:border-brand hover:text-brand">{saved ? "★ Saved" : "☆ Save"}</button>
        </form>
        <Link href={`/corrections?item=${contentItemId}`} className="inline-flex h-11 items-center rounded-[10px] px-3 text-[13px] font-semibold text-ink-soft hover:text-brand">Report a correction</Link>
      </div>
    </section>
  );
}

const claimLabel: Record<string, string> = {
  SOURCE_FACT: "Source",
  EDITOR_EXPLANATION: "Editor note",
  ESTIMATE: "Estimate",
  PROMOTER_CLAIM: "Promoter claim",
};

/** 6. Connected resources in both directions (idea → machine, and machine → idea). */
export async function Connected({ contentItemId, title = "Connected resources" }: { contentItemId: string; title?: string }) {
  const [from, to] = await Promise.all([
    prisma.relatedContent.findMany({ where: { fromItemId: contentItemId, toItem: { publicationStatus: "PUBLISHED" } }, include: { toItem: true }, orderBy: { displayOrder: "asc" } }),
    prisma.relatedContent.findMany({ where: { toItemId: contentItemId, fromItem: { publicationStatus: "PUBLISHED" } }, include: { fromItem: true }, orderBy: { displayOrder: "asc" } }),
  ]);
  const items = [...from.map((r) => r.toItem), ...to.map((r) => r.fromItem)].filter((v, i, a) => a.findIndex((x) => x.id === v.id) === i);
  return (
    <section className="flex flex-col gap-1 rounded-2xl border border-line bg-white p-6">
      <h2 className="mb-1 font-display text-sm font-bold text-heading">{title}</h2>
      {items.length === 0 ? <p className="text-[13px] text-ink-muted">Linked resources coming soon.</p> : null}
      {items.map((i) => (
        <Link key={i.id} href={itemHref(i)} className="group -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-ink hover:bg-page hover:text-ink">
          <span className="flex min-w-0 flex-col"><span className="truncate text-[13px] font-semibold group-hover:text-brand">{i.title}</span><span className="text-[11px] text-ink-muted">{contentTypeLabel[i.contentType]}</span></span>
          <span aria-hidden className="text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-brand">→</span>
        </Link>
      ))}
    </section>
  );
}

/** Records a page view for usage analysis. Never blocks rendering on failure. */
export async function trackView(viewer: Viewer, contentItemId: string, path: string) {
  await prisma.usageEvent.create({ data: { userId: viewer.userId, event: "view", contentItemId, path } }).catch(() => undefined);
}

/** Filler rows rendered under the blur. Contains no real data. */
export function FakeRows({ n, label = "Hidden for visitors", value = "UGX 0,000,000" }: { n: number; label?: string; value?: string }) {
  return (
    <div>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex justify-between border-b border-line py-3"><span>{label}</span><span>{value}</span></div>
      ))}
    </div>
  );
}
