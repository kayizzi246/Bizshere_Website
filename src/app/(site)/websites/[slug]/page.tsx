import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { date, yesNo } from "@/lib/format";
import { Card, Connected, Crumbs, Evidence, Facts, Identity, Prose, Rows, TwoColumn, trackView } from "@/components/DetailParts";

export const dynamic = "force-dynamic";

export default async function WebsitePage({ params }: { params: { slug: string } }) {
  const viewer = await getViewer();
  const item = await prisma.contentItem.findFirst({
    where: { slug: params.slug, contentType: "WEBSITE", publicationStatus: viewer.isStaff ? undefined : "PUBLISHED" },
    include: { primaryCategory: true, website: true },
  });
  if (!item?.website) notFound();
  const w = item.website;
  const path = `/websites/${item.slug}`;
  await trackView(viewer, item.id, path);
  const linkOk = w.linkStatus === null || (w.linkStatus >= 200 && w.linkStatus < 400);

  return (
    <div className="container-site flex flex-col gap-7 py-6">
      <Crumbs trail={[["/guides", "Guides and tools"], ["/websites", "Useful websites"]]} title={item.title} />
      <Identity eyebrow={`Useful website · ${item.primaryCategory?.name ?? w.siteType ?? "General"}`} title={item.title} summary={item.shortSummary}>
        <div className="flex flex-wrap gap-2">
          {w.officialSite ? <span className="badge-ok">Official site</span> : null}
          {w.isAffiliate ? <span className="badge-warn">Affiliate link</span> : null}
          {!linkOk ? <span className="badge-bad">Link problem found {date(w.lastLinkCheckAt)}</span> : null}
        </div>
      </Identity>
      <Facts items={[
        ["Main use", w.mainFunction ?? "—"],
        ["Cost", w.accessCost ? w.accessCost.toLowerCase() : "—"],
        ["Account needed", yesNo(w.accountRequired)],
        ["Languages", w.languages.join(", ") || "—"],
      ]} />
      <TwoColumn
        main={<>
          <Card title="Why it is useful">
            <Prose text={w.useCase ?? item.overview} />
            <Rows rows={[["Resources available", w.resources], ["Operated by", w.operator], ["Countries served", w.countries.join(", ")], ["Restrictions", w.restrictions]]} />
          </Card>
          {w.editorialAssessment ? <Card title="BizSphere-Ug assessment"><Prose text={w.editorialAssessment} /></Card> : null}
        </>}
        aside={<>
          <Card title="Visit" className="p-6">
            <a href={w.redirectUrl ?? w.canonicalUrl} target="_blank" rel="noreferrer nofollow" className="btn-primary">Open website ↗</a>
            <span className="break-all text-sm text-ink-muted">{w.canonicalUrl}</span>
            {w.pricingUrl ? <a href={w.pricingUrl} target="_blank" rel="noreferrer" className="text-sm font-bold">Pricing ↗</a> : null}
            {w.isAffiliate && w.disclosure ? <p className="text-xs text-ink-muted">{w.disclosure}</p> : null}
          </Card>
          <Evidence contentItemId={item.id} lastReviewedAt={item.lastReviewedAt} nextReviewDueAt={item.nextReviewDueAt} viewer={viewer} back={path}
            extra={<span>Link last checked {date(w.lastLinkCheckAt)} · content last reviewed {date(w.lastContentReviewAt)}{w.ownershipEvidence ? ` · ownership: ${w.ownershipEvidence}` : ""}</span>} />
          <Connected contentItemId={item.id} title="Funding, tools and guides on this site" />
        </>}
      />
    </div>
  );
}
