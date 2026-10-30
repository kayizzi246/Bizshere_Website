import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { date } from "@/lib/format";
import { Card, Connected, Crumbs, Evidence, Prose, Rows, TwoColumn, trackView } from "@/components/DetailParts";
import { ChildSections, loadChildSections } from "@/components/ChildSections";

export const dynamic = "force-dynamic";

export default async function NewsPage({ params }: { params: { slug: string } }) {
  const viewer = await getViewer();
  const item = await prisma.contentItem.findFirst({
    where: { slug: params.slug, contentType: "NEWS", publicationStatus: viewer.isStaff ? undefined : "PUBLISHED" },
    include: { primaryCategory: true, news: { include: { organizations: { include: { organization: true } } } } },
  });
  if (!item?.news) notFound();
  const n = item.news;
  const path = `/news/${item.slug}`;
  await trackView(viewer, item.id, path);
  const media = await loadChildSections("NEWS", { record: n!.id, item: item.id, org: null });

  return (
    <div className="container-site flex flex-col gap-7 py-6">
      <Crumbs trail={[["/guides", "Guides and tools"], ["/news", "Business news"]]} title={item.title} />
      <article className="flex flex-col gap-3">
        <span className="eyebrow">{n.articleType.toLowerCase()} · {item.primaryCategory?.name ?? "Business"}</span>
        <h1 className="text-page-title max-w-4xl">{item.title}</h1>
        {n.standfirst ? <p className="max-w-3xl text-base leading-relaxed text-ink-soft">{n.standfirst}</p> : null}
        <span className="text-sm text-ink-muted">
          {[n.author, n.publisher].filter(Boolean).join(", ") || "BizSphere-Ug"} · Published {date(item.publishedAt)}
          {item.updatedAt > (item.publishedAt ?? item.updatedAt) ? ` · Updated ${date(item.updatedAt)}` : ""}
        </span>
        {n.correctionStatus ? <span className="badge-warn self-start">Correction: {n.correctionStatus}</span> : null}
      </article>

      <TwoColumn
        main={<>
          {n.whatChanged || n.whoAffected || n.nextAction ? (
            <section className="card flex flex-col gap-1 border-brand bg-brand-tint p-6">
              <h2 className="text-lg font-bold text-heading">What this means for your business</h2>
              <Rows rows={[
                ["What changed", n.whatChanged],
                ["Who is affected", n.whoAffected],
                ["Takes effect", n.effectiveDate ? date(n.effectiveDate) : null],
                ["Event date", n.eventDate ? date(n.eventDate) : null],
                ["Suggested next step", n.nextAction],
              ]} />
            </section>
          ) : null}
          <Card><Prose text={n.body ?? item.overview} /></Card>
          {n.updateNotes ? <Card title="Updates"><Prose text={n.updateNotes} /></Card> : null}
        </>}
        aside={<>
          <Card title="Sources" className="p-6 text-sm">
            {n.originalUrl ? <a href={n.originalUrl} target="_blank" rel="noreferrer">Original article ↗</a> : null}
            {n.sourceLinks.map((s) => <a key={s} href={s} target="_blank" rel="noreferrer" className="break-all">{s}</a>)}
            {n.imageCredit ? <span className="text-ink-muted">Image: {n.imageCredit}</span> : null}
            {n.organizations.length ? <span className="text-ink-muted">Concerns: {n.organizations.map((o) => o.organization.tradingName ?? o.organization.legalName).join(", ")}</span> : null}
          </Card>
          <ChildSections sections={media} gated={false} back={path} />
          <Evidence contentItemId={item.id} lastReviewedAt={item.lastReviewedAt} nextReviewDueAt={item.nextReviewDueAt} viewer={viewer} back={path} />
          <Connected contentItemId={item.id} title="Related funding, guides and markets" />
        </>}
      />
    </div>
  );
}
