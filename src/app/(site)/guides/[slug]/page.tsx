import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewer, FREE_PREVIEW } from "@/lib/access";
import { date, money } from "@/lib/format";
import { Gate } from "@/components/Gate";
import { Downloads } from "@/components/Downloads";
import { Card, Connected, Crumbs, Evidence, Facts, FakeRows, Identity, Prose, Rows, TwoColumn, trackView } from "@/components/DetailParts";

export const dynamic = "force-dynamic";

export default async function GuidePage({ params }: { params: { slug: string } }) {
  const viewer = await getViewer();
  const item = await prisma.contentItem.findFirst({
    where: { slug: params.slug, contentType: "GUIDE", publicationStatus: viewer.isStaff ? undefined : "PUBLISHED" },
    include: {
      primaryCategory: true,
      guide: { include: { steps: { orderBy: { stepNumber: "asc" } }, documents: true, fees: { include: { source: true } } } },
    },
  });
  if (!item?.guide) notFound();
  const g = item.guide;
  const gated = item.accessLevel !== "PUBLIC" && !viewer.isMember;
  const steps = gated ? g.steps.slice(0, FREE_PREVIEW.steps) : g.steps;
  const path = `/guides/${item.slug}`;
  await trackView(viewer, item.id, path);

  return (
    <div className="container-site flex flex-col gap-7 py-6">
      <Crumbs trail={[["/guides", "Guides"]]} title={item.title} />
      <Identity eyebrow={`Guide · ${item.primaryCategory?.name ?? g.resourceType ?? "Procedure"}`} title={item.title} summary={item.shortSummary}>
        {g.superseded ? <span className="badge-bad self-start">Superseded: a newer procedure applies</span> : null}
      </Identity>
      <Facts items={[
        ["Responsible authority", g.responsibleAuthority ?? "—"],
        ["Jurisdiction", g.jurisdiction],
        ["Effective from", g.effectiveDate ? date(g.effectiveDate) : "—"],
        ["Language", g.language],
      ]} />

      <TwoColumn
        main={<>
          <Card title="Before you start">
            <Prose text={g.purpose ?? item.overview} />
            <Rows rows={[["Prerequisites", g.prerequisites], ["Where to submit", g.submissionChannel], ["What you get", g.expectedOutcome]]} />
          </Card>
          <Card title="Steps">
            <ol className="flex flex-col gap-3.5">
              {steps.map((s) => (
                <li key={s.id} className="flex gap-3.5">
                  <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-brand text-sm font-extrabold text-white">{s.stepNumber}</span>
                  <span>{s.instruction}{!s.isOfficial ? <span className="badge-info ml-2">BizSphere tip</span> : null}</span>
                </li>
              ))}
            </ol>
            {steps.length === 0 ? <p className="text-sm text-ink-muted">Steps are being researched.</p> : null}
            {gated && g.steps.length > steps.length ? <Gate compact button={`Show ${g.steps.length - steps.length} more step(s)`} modalTitle="Subscribe for full guides" teaser={<FakeRows n={2} label="Step hidden" value="" />} /> : null}
          </Card>
          <Card title="Documents you need">
            {gated ? <Gate compact button="Show required documents" modalTitle="Subscribe for full guides" /> : g.documents.length ? (
              <ul className="list-disc pl-5 text-ink-soft">{g.documents.map((d) => <li key={d.id}>{d.name}{d.notes ? <span className="text-ink-muted"> ({d.notes})</span> : null}</li>)}</ul>
            ) : <p className="text-sm text-ink-muted">Not yet recorded.</p>}
          </Card>
          <Card title="Official fees and time">
            {g.fees.length === 0 ? <p className="text-sm text-ink-muted">Fees not yet recorded. Check with the authority.</p> : (
              <div>
                {g.fees.map((f) => (
                  <div key={f.id} className="flex flex-wrap justify-between gap-2 border-b border-line py-3 last:border-0">
                    <span className="flex flex-col"><span className="font-semibold">{f.description}</span><span className="text-xs text-ink-muted">{f.feeBasis ?? ""}{f.processingTime ? ` · takes ${f.processingTime}` : ""} · checked {date(f.checkedAt)}{f.source ? ` · ${f.source.sourceTitle}` : ""}</span></span>
                    <span className="font-bold">{money(f.amount, f.currency)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
          {g.practicalNotes || g.commonMistakes ? (
            <Card title="BizSphere-Ug notes">
              <p className="text-xs text-ink-muted">Our explanation, separate from the official instructions above.</p>
              <Prose text={g.practicalNotes} />
              {g.commonMistakes ? <><h3 className="font-bold">Common mistakes</h3><Prose text={g.commonMistakes} /></> : null}
            </Card>
          ) : null}
        </>}
        aside={<>
          <Card title="Official source" className="p-6">
            <Rows rows={[["Issued by", g.issuingBody], ["Published", g.publicationDate ? date(g.publicationDate) : null], ["Version", g.version]]} />
            {g.officialUrl ? <a href={g.officialUrl} target="_blank" rel="noreferrer" className="btn-primary">Go to the official page ↗</a> : null}
            {g.videoUrl ? <a href={g.videoUrl} target="_blank" rel="noreferrer" className="btn-outline">Watch the video ↗</a> : null}
            <Downloads contentItemId={item.id} viewer={viewer} />
          </Card>
          <Evidence contentItemId={item.id} lastReviewedAt={item.lastReviewedAt} nextReviewDueAt={item.nextReviewDueAt} viewer={viewer} back={path} />
          <Connected contentItemId={item.id} />
        </>}
      />
    </div>
  );
}
