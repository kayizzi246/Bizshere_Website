import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewer, FREE_PREVIEW } from "@/lib/access";
import { date, money } from "@/lib/format";
import { Gate } from "@/components/Gate";
import { FakeRows, trackView } from "@/components/DetailParts";
import { RecordPage } from "@/components/RecordPage";
import { budgetTotal } from "@/lib/costing";
import type { ScenarioLevel } from "@prisma/client";

export const dynamic = "force-dynamic";

const LEVELS: { id: ScenarioLevel; label: string }[] = [
  { id: "LOW", label: "Low" },
  { id: "STANDARD", label: "Standard" },
  { id: "HIGHER", label: "Higher" },
];

// Client fields: Business Idea Name, Brief, Business Type, Category, Description,
// Key Requirements, Success factors, Startup Budget, Remarks
export default async function IdeaPage({ params, searchParams }: { params: { slug: string }; searchParams: { scenario?: string } }) {
  const viewer = await getViewer();
  const item = await prisma.contentItem.findFirst({
    where: { slug: params.slug, contentType: "BUSINESS_IDEA", publicationStatus: viewer.isStaff ? undefined : "PUBLISHED" },
    include: {
      primaryCategory: true,
      businessIdea: {
        include: {
          steps: { orderBy: { stepNumber: "asc" } },
          scenarios: { include: { location: true, lines: { orderBy: { displayOrder: "asc" } } } },
        },
      },
    },
  });
  if (!item || !item.businessIdea) notFound();
  const idea = item.businessIdea;
  const path = `/business-ideas/${item.slug}`;
  await trackView(viewer, item.id, path);

  const level = (LEVELS.find((l) => l.id === searchParams.scenario)?.id ?? "STANDARD") as ScenarioLevel;
  const scenario = idea.scenarios.find((s) => s.level === level) ?? idea.scenarios[0];

  // Server-side gate: visitors only receive the first lines and steps.
  const gated = item.accessLevel !== "PUBLIC" && !viewer.isMember;
  const lines = scenario ? (gated ? scenario.lines.slice(0, FREE_PREVIEW.budgetLines) : scenario.lines) : [];
  const hiddenLines = scenario ? scenario.lines.length - lines.length : 0;
  const steps = gated ? idea.steps.slice(0, FREE_PREVIEW.steps) : idea.steps;
  const hiddenSteps = idea.steps.length - steps.length;
  const total = !gated && scenario ? budgetTotal(scenario.lines) : null;

  return (
    <RecordPage
      trail={["/business-ideas", "Business ideas and plans"]}
      eyebrow={`Business idea · ${item.primaryCategory?.name ?? "General"}`}
      title={item.title}
      brief={item.shortSummary}
      rows={[
        { label: "Business type", value: idea.businessType },
        { label: "Category", value: item.primaryCategory?.name },
      ]}
      texts={[
        { label: "Description", text: item.overview },
        { label: "Key requirements", text: idea.keyRequirements },
        { label: "Success factors", text: idea.successFactors },
      ]}
      viewer={viewer}
      item={item}
      back={path}
      gateTitle="Subscribe to read the full plan"
    >
      <section className="card flex flex-col gap-3.5 p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold">Startup budget</h2>
          {idea.scenarios.length > 1 ? (
            <div role="group" aria-label="Budget scenario" className="flex gap-1 rounded-[10px] bg-[#F2F1EF] p-1">
              {LEVELS.filter((l) => idea.scenarios.some((s) => s.level === l.id)).map((l) => (
                <Link key={l.id} href={`?scenario=${l.id}`} aria-current={l.id === level ? "true" : undefined} className={`rounded-lg px-4 py-2 text-sm ${l.id === level ? "bg-white font-bold text-brand-dark" : "text-ink-soft"}`}>{l.label}</Link>
              ))}
            </div>
          ) : null}
        </div>
        {scenario ? (
          <>
            <span className="text-sm text-ink-muted">{scenario.name}{scenario.assumptions ? ` · ${scenario.assumptions}` : ""} · {scenario.location?.name ?? "Uganda"}, {scenario.estimateDate ? `estimated ${date(scenario.estimateDate)}` : "estimate date pending"}</span>
            <div>
              {lines.map((l) => (
                <div key={l.id} className="flex justify-between gap-4 border-b border-line py-3 text-[15px]">
                  <span>{l.description}</span>
                  <span className="font-bold">{l.unitCost === null ? <span className="font-normal text-ink-muted">{l.unknownReason ?? "To be confirmed"}</span> : money(Number(l.unitCost) * Number(l.quantity), scenario.currency)}</span>
                </div>
              ))}
              {!gated ? (
                <div className="flex justify-between pt-3 text-[17px] font-extrabold"><span>Total</span><span>{total === null ? "Some lines not yet sourced" : money(total, scenario.currency)}</span></div>
              ) : null}
            </div>
            {gated && hiddenLines > 0 ? (
              <Gate title="See the full budget" text="Every cost line, the total and the assumptions behind it." modalTitle="Subscribe to read the full plan" teaser={<FakeRows n={Math.min(hiddenLines + 1, 5)} label="Cost line hidden for visitors" />} />
            ) : null}
          </>
        ) : (
          <p className="text-sm text-ink-muted">Not added yet.</p>
        )}
      </section>

      {idea.steps.length ? (
        <section className="card flex flex-col gap-3.5 p-7">
          <h2 className="text-lg font-extrabold">How to get started</h2>
          <ol className="flex flex-col gap-3.5">
            {steps.map((s) => (
              <li key={s.id} className="flex gap-3.5 leading-normal">
                <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-brand text-sm font-extrabold text-white">{s.stepNumber}</span>
                <span><strong>{s.title}.</strong> {s.description}</span>
              </li>
            ))}
          </ol>
          {gated && hiddenSteps > 0 ? <Gate compact button={`Show ${hiddenSteps} more step${hiddenSteps > 1 ? "s" : ""}`} modalTitle="Subscribe to read the full plan" teaser={<FakeRows n={hiddenSteps} label="Step hidden for visitors" value="" />} /> : null}
        </section>
      ) : null}

      <section className="card flex flex-col gap-3 p-7">
        <h2 className="text-lg font-extrabold">Remarks</h2>
        {idea.remarks ? <p className="whitespace-pre-line leading-relaxed text-ink-soft">{idea.remarks}</p> : <p className="text-sm text-ink-muted">Not added yet.</p>}
      </section>
    </RecordPage>
  );
}
