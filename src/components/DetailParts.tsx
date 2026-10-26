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
    <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
      <Link href="/">Home</Link>
      {trail.map(([href, label]) => <span key={href}> / <Link href={href}>{label}</Link></span>)}
      {" / "}<span className="text-ink">{title}</span>
    </nav>
  );
}

export function Identity({ eyebrow, title, summary, children }: { eyebrow: string; title: string; summary?: string | null; children?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <span className="eyebrow">{eyebrow}</span>
      <h1 className="text-4xl font-extrabold tracking-tight">{title}</h1>
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
          <span className="text-lg font-extrabold">{value}</span>
        </div>
      ))}
    </section>
  );
}

export function Card({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card flex flex-col gap-3 p-7 ${className}`}>
      {title ? <h2 className="text-xl font-extrabold">{title}</h2> : null}
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
    <section className="card flex flex-col gap-2.5 p-6 text-sm text-ink-muted">
      <h2 className="text-base font-extrabold text-ink">Evidence and freshness</h2>
      <span>Last reviewed {date(lastReviewedAt)} · next review due {date(nextReviewDueAt)}</span>
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
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <form action={toggleSave}>
          <input type="hidden" name="contentItemId" value={contentItemId} />
          <input type="hidden" name="back" value={back} />
          <button className="btn-outline min-h-[38px] px-3">{saved ? "★ Saved" : "☆ Save"}</button>
        </form>
        <Link href={`/corrections?item=${contentItemId}`} className="font-bold">Report a correction</Link>
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
    <section className="card flex flex-col p-6">
      <h2 className="mb-2 text-lg font-extrabold">{title}</h2>
      {items.length === 0 ? <p className="text-sm text-ink-muted">Linked resources coming soon.</p> : null}
      {items.map((i) => (
        <Link key={i.id} href={itemHref(i)} className="flex min-h-[56px] items-center justify-between gap-3 border-t border-line text-ink hover:text-brand">
          <span className="flex flex-col"><span className="font-bold">{i.title}</span><span className="text-xs text-ink-muted">{contentTypeLabel[i.contentType]}</span></span>
          <span aria-hidden className="text-brand">→</span>
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
