import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { date, yesNo } from "@/lib/format";
import { Gate } from "@/components/Gate";
import { Card, Connected, Crumbs, Evidence, Facts, Identity, Prose, Rows, TwoColumn, trackView } from "@/components/DetailParts";
import { Downloads } from "@/components/Downloads";

export const dynamic = "force-dynamic";

export default async function ToolPage({ params }: { params: { slug: string } }) {
  const viewer = await getViewer();
  const item = await prisma.contentItem.findFirst({
    where: { slug: params.slug, contentType: "TOOL", publicationStatus: viewer.isStaff ? undefined : "PUBLISHED" },
    include: { primaryCategory: true, tool: { include: { versions: { orderBy: { releasedAt: "desc" }, include: { testCases: { select: { lastValidatedAt: true } } } } } } },
  });
  if (!item?.tool) notFound();
  const t = item.tool;
  const current = t.versions.find((v) => !v.superseded) ?? t.versions[0];
  const lastValidated = current?.testCases.map((c) => c.lastValidatedAt).filter(Boolean).sort().at(-1) ?? null;
  const gated = item.accessLevel !== "PUBLIC" && !viewer.isMember;
  const path = `/tools/${item.slug}`;
  await trackView(viewer, item.id, path);

  return (
    <div className="container-site flex flex-col gap-7 py-6">
      <Crumbs trail={[["/guides", "Guides and tools"], ["/tools", "Tools and templates"]]} title={item.title} />
      <Identity eyebrow={`${t.toolType.toLowerCase()} · ${item.primaryCategory?.name ?? "Business tool"}`} title={item.title} summary={item.shortSummary} />
      <Facts items={[
        ["Current version", current ? `v${current.versionNumber}` : "—"],
        ["Released", current ? date(current.releasedAt) : "—"],
        ["Format", t.fileFormat ?? (t.calculatorRoute ? "Online calculator" : "—")],
        ["Jurisdiction", t.jurisdiction ?? "—"],
      ]} />

      <TwoColumn
        main={<>
          <Card title="What it is for">
            <Prose text={t.purpose ?? item.overview} />
            <Rows rows={[["Intended user", t.intendedUser], ["Required inputs", t.requiredInputs]]} />
          </Card>
          <Card title="How to use it">
            {gated ? <Gate compact button="Show instructions and worked example" modalTitle="Subscribe for tools and templates" /> : (
              <>
                <Prose text={t.usageSteps} />
                {t.workedExample ? <><h3 className="font-bold">Worked example</h3><Prose text={t.workedExample} /></> : null}
              </>
            )}
          </Card>
          {t.limitations ? <Card title="Limitations"><Prose text={t.limitations} /></Card> : null}
          <Card title="Version history">
            {t.versions.length === 0 ? <p className="text-sm text-ink-muted">No released versions yet.</p> : (
              <ul className="flex flex-col">
                {t.versions.map((v) => (
                  <li key={v.id} className="flex flex-wrap justify-between gap-2 border-b border-line py-2.5 last:border-0">
                    <span><strong>v{v.versionNumber}</strong> {v.superseded ? <span className="badge-muted ml-1">Superseded</span> : <span className="badge-ok ml-1">Current</span>}{v.changeNotes ? <span className="block text-sm text-ink-muted">{v.changeNotes}</span> : null}</span>
                    <span className="text-sm text-ink-muted">{date(v.releasedAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>}
        aside={<>
          <Card title="Get the tool" className="p-6">
            <Rows rows={[["Software", t.supportedSoftware], ["Editable", yesNo(t.editable)], ["Contains macros", yesNo(t.hasMacros)], ["Licence", t.licence], ["Publisher", t.publisher]]} />
            {t.calculatorRoute && !gated ? <a href={t.calculatorRoute} className="btn-primary">Open calculator</a> : null}
            <Downloads contentItemId={item.id} viewer={viewer} />
          </Card>
          {t.toolType === "CALCULATOR" ? (
            <Card title="Calculation rules" className="p-6 text-sm">
              <Rows rows={[["Rules effective from", t.effectiveDate ? date(t.effectiveDate) : null], ["Last validated", lastValidated ? date(lastValidated) : null]]} />
              {t.ruleSourceUrl ? <a href={t.ruleSourceUrl} target="_blank" rel="noreferrer">Official rule source ↗</a> : null}
              <span className="text-ink-muted">Saved results stay tied to the rule version used at the time.</span>
            </Card>
          ) : null}
          <Evidence contentItemId={item.id} lastReviewedAt={item.lastReviewedAt} nextReviewDueAt={item.nextReviewDueAt} viewer={viewer} back={path} />
          <Connected contentItemId={item.id} />
        </>}
      />
    </div>
  );
}
