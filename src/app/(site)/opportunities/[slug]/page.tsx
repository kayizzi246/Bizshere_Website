import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { date, money } from "@/lib/format";
import { Gate } from "@/components/Gate";
import { CheckBadges } from "@/components/Checks";
import { Card, Connected, Crumbs, Evidence, Facts, FakeRows, Identity, Prose, Rows, TwoColumn, trackView } from "@/components/DetailParts";
import { ChildSections, loadChildSections } from "@/components/ChildSections";

export const dynamic = "force-dynamic";

export default async function OpportunityPage({ params }: { params: { slug: string } }) {
  const viewer = await getViewer();
  const item = await prisma.contentItem.findFirst({
    where: { slug: params.slug, contentType: "INVESTMENT_OPPORTUNITY", publicationStatus: viewer.isStaff ? undefined : "PUBLISHED" },
    include: { checks: true, primaryCategory: true, investmentOpportunity: { include: { promoterOrganization: true } } },
  });
  if (!item?.investmentOpportunity) notFound();
  const o = item.investmentOpportunity;
  const gated = item.accessLevel !== "PUBLIC" && !viewer.isMember;
  const path = `/opportunities/${item.slug}`;
  await trackView(viewer, item.id, path);
  const media = await loadChildSections("INVESTMENT_OPPORTUNITY", { record: o!.id, item: item.id, org: null });

  return (
    <div className="container-site flex flex-col gap-7 py-6">
      <Crumbs trail={[["/funding", "Funding sources"], ["/opportunities", "Investment opportunities"]]} title={item.title} />
      <Identity eyebrow={`Investment opportunity${o.sector ? ` · ${o.sector}` : ""}`} title={item.title} summary={item.shortSummary}>
        <span className="text-ink-muted">Promoted by {o.promoterOrganization?.tradingName ?? o.promoterOrganization?.legalName ?? o.promoter ?? "—"}</span>
        <CheckBadges checks={item.checks} />
      </Identity>

      <Facts items={[
        ["Capital sought", money(o.capitalSought, o.currency)],
        ["Minimum participation", money(o.minimumParticipation, o.currency)],
        ["Business stage", o.businessStage ?? "—"],
        ["Deadline", o.deadline ? date(o.deadline) : "—"],
      ]} />

      <div className="rounded-2xl border border-[#E8C979] bg-warn-bg p-6 text-sm text-warn-fg">
        <strong>Read before you invest.</strong> Figures on this page come from the promoter unless marked otherwise.
        Projected returns are claims, not established outcomes. BizSphere-Ug does not give investment advice. Get independent
        legal and financial advice before committing money.
      </div>

      <TwoColumn
        main={<>
          <Card title="The project">
            <Prose text={o.projectDescription ?? item.overview} />
            <Rows rows={[["Type", o.opportunityType], ["Location", item.coverageNotes], ["Intended use of funds", o.useOfFunds]]} />
          </Card>
          <Card title="Proposed terms">
            {gated ? (
              <Gate title="See the proposed terms" text="Investment structure, investor rights, revenue model, term and exit." modalTitle="Subscribe to see full opportunity terms" teaser={<FakeRows n={4} label="Term hidden for visitors" value="—" />} />
            ) : (
              <Rows rows={[
                ["Investment structure", o.investmentStructure], ["Investor rights", o.investorRights], ["Revenue model", o.revenueModel],
                ["Term", o.term], ["Exit arrangements", o.exitArrangements],
              ]} />
            )}
          </Card>
          <Card title="Assessment">
            {gated ? (
              <Gate compact button="Show evidence and risks" modalTitle="Subscribe to see full opportunity terms" teaser={<FakeRows n={3} label="Hidden" value="—" />} />
            ) : (
              <>
                <Rows rows={[["Financial evidence available", o.financialEvidence], ["Assumptions", o.assumptions], ["Independent evidence", o.independentEvidence]]} />
                {o.risks ? <><h3 className="font-bold">Risks</h3><Prose text={o.risks} /></> : null}
                {o.promoterReturnClaim ? (
                  <div className="rounded-xl border border-line bg-page p-4 text-sm">
                    <span className="badge-warn mb-2">Promoter claim</span>
                    <p className="mt-2"><strong>The promoter states:</strong> {o.promoterReturnClaim}</p>
                    <p className="mt-1 text-ink-muted">Calculation basis: {o.calculationBasis ?? "not provided"} · Verification: {o.claimVerificationStatus ?? "not verified"}</p>
                  </div>
                ) : null}
              </>
            )}
          </Card>
        </>}
        aside={<>
          <Card title="How to apply" className="p-6">
            <Rows rows={[["Opens", o.opensAt ? date(o.opensAt) : null], ["Deadline", o.deadline ? date(o.deadline) : null]]} />
            {gated ? <Gate compact button="Show process and contact" modalTitle="Subscribe to see full opportunity terms" /> : (
              <>
                <Prose text={o.applicationProcess} />
                {o.requiredDocuments.length ? <><h3 className="font-bold">Documents</h3><ul className="list-disc pl-5 text-sm text-ink-soft">{o.requiredDocuments.map((d) => <li key={d}>{d}</li>)}</ul></> : null}
                <Prose text={o.contactNotes} />
              </>
            )}
          </Card>
          <ChildSections sections={media} gated={gated} back={path} />
          <Evidence contentItemId={item.id} lastReviewedAt={item.lastReviewedAt} nextReviewDueAt={item.nextReviewDueAt} viewer={viewer} back={path} />
          <Connected contentItemId={item.id} />
        </>}
      />
    </div>
  );
}
