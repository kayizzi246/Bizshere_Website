import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewer, FREE_PREVIEW } from "@/lib/access";
import { date, money, contentTypeLabel, contentTypePath } from "@/lib/format";
import { Gate } from "@/components/Gate";
import { Evidence } from "@/components/DetailParts";
import { budgetTotal } from "@/lib/costing";
import type { ScenarioLevel } from "@prisma/client";

export const dynamic = "force-dynamic";

const LEVELS: { id: ScenarioLevel; label: string }[] = [
  { id: "LOW", label: "Low" },
  { id: "STANDARD", label: "Standard" },
  { id: "HIGHER", label: "Higher" },
];

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
      relatedFrom: { include: { toItem: true }, orderBy: { displayOrder: "asc" } },
    },
  });
  if (!item || !item.businessIdea) notFound();
  const idea = item.businessIdea;

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
    <div className="container-site flex flex-col gap-7 py-6">
      <nav className="text-sm text-ink-muted"><Link href="/">Home</Link> / <Link href="/business-ideas">Business ideas</Link> / <span className="text-ink">{item.title}</span></nav>

      <section className="flex flex-col gap-3.5">
        <span className="eyebrow">Business idea · {item.primaryCategory?.name ?? "General"}</span>
        <h1 className="text-5xl font-extrabold tracking-tight">{item.title}</h1>
        {item.shortSummary ? <p className="max-w-3xl text-lg leading-relaxed text-ink-soft">{item.shortSummary}</p> : null}
      </section>

      <section className="flex flex-wrap gap-3.5">
        <Fact label="Experience needed" value={idea.experienceLevel ? idea.experienceLevel.toLowerCase() : "—"} />
        <Fact label="Premises" value={idea.premisesRequirements ?? "—"} />
        <Fact label="Home-based possible" value={idea.homeBasedSuitable === null ? "—" : idea.homeBasedSuitable ? "Yes" : "No"} />
        <Fact label="Staff" value={idea.staffCount !== null ? `${idea.staffCount} people` : "—"} />
      </section>

      <div className="flex flex-wrap items-start gap-7">
        <div className="flex min-w-0 flex-[999_1_640px] flex-col gap-5">
          {item.overview ? (
            <section className="card flex flex-col gap-3 p-7">
              <h2 className="text-xl font-extrabold">Overview</h2>
              <p className="whitespace-pre-line leading-relaxed text-ink-soft">{item.overview}</p>
            </section>
          ) : null}

          <section className="card flex flex-col gap-3.5 p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-extrabold">Startup budget</h2>
              <div role="group" aria-label="Budget scenario" className="flex gap-1 rounded-[10px] bg-[#EEF0EC] p-1">
                {LEVELS.filter((l) => idea.scenarios.some((s) => s.level === l.id)).map((l) => (
                  <Link key={l.id} href={`?scenario=${l.id}`} aria-current={l.id === level ? "true" : undefined} className={`rounded-lg px-4 py-2 text-sm ${l.id === level ? "bg-white font-bold text-brand-dark shadow-[0_0_0_1px_#1D6B45]" : "text-ink-soft"}`}>{l.label}</Link>
                ))}
              </div>
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
                  <Gate
                    title="See the full budget"
                    text="Every cost line, the total and the assumptions behind it."
                    modalTitle="Subscribe to read the full plan"
                    teaser={<FakeRows n={Math.min(hiddenLines + 1, 5)} />}
                  />
                ) : null}
              </>
            ) : (
              <p className="text-sm text-ink-muted">Budget is being researched.</p>
            )}
          </section>

          <section className="card flex flex-col gap-3.5 p-7">
            <h2 className="text-xl font-extrabold">Steps to start</h2>
            <ol className="flex flex-col gap-3.5">
              {steps.map((s) => (
                <li key={s.id} className="flex gap-3.5 leading-normal">
                  <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-brand text-sm font-extrabold text-white">{s.stepNumber}</span>
                  <span><strong>{s.title}.</strong> {s.description}</span>
                </li>
              ))}
            </ol>
            {gated && hiddenSteps > 0 ? <Gate compact button={`Show ${hiddenSteps} more step${hiddenSteps > 1 ? "s" : ""}`} modalTitle="Subscribe to read the full plan" teaser={<FakeRows n={hiddenSteps} />} /> : null}
          </section>

          <Evidence contentItemId={item.id} lastReviewedAt={item.lastReviewedAt} nextReviewDueAt={item.nextReviewDueAt} viewer={viewer} back={`/business-ideas/${item.slug}`} />
        </div>

        <aside className="flex flex-[1_1_340px] flex-col gap-5">
          <section className="card flex flex-col p-6">
            <h2 className="mb-2 text-lg font-extrabold">What you need</h2>
            {item.relatedFrom.length === 0 ? <p className="text-sm text-ink-muted">Linked resources coming soon.</p> : null}
            {item.relatedFrom.map((r) => (
              <Link key={r.toItemId + r.relationshipType} href={`${contentTypePath[r.toItem.contentType]}/${r.toItem.slug}`} className="flex min-h-[56px] items-center justify-between border-t border-line text-ink hover:text-brand">
                <span className="flex flex-col"><span className="font-bold">{r.toItem.title}</span><span className="text-xs text-ink-muted">{contentTypeLabel[r.toItem.contentType]}</span></span>
                <span aria-hidden className="text-brand">→</span>
              </Link>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="card flex flex-[1_1_220px] flex-col gap-1.5 px-5 py-4">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="text-lg font-extrabold capitalize">{value}</span>
    </div>
  );
}

/** Filler rows rendered under the blur. Contains no real data. */
function FakeRows({ n }: { n: number }) {
  return (
    <div>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex justify-between border-b border-line py-3"><span>Cost line hidden for visitors</span><span>UGX 0,000,000</span></div>
      ))}
    </div>
  );
}
