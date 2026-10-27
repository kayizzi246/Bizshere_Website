import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, LockKeyhole } from "lucide-react";
import type { ScenarioLevel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getViewer, FREE_PREVIEW } from "@/lib/access";
import { googleEnabled } from "@/lib/auth";
import { date, money } from "@/lib/format";
import { budgetTotal } from "@/lib/costing";
import { Connected, Crumbs, Evidence, trackView } from "@/components/DetailParts";
import { Icon } from "@/components/Icon";
import { IdeaPhoto, PLAN_LABEL, PLAN_ORDER } from "@/components/IdeaParts";
import { OnboardingGate } from "@/components/Onboarding";

export const dynamic = "force-dynamic";

// Client fields: Business Idea Name, Brief, Business Type, Category, Description,
// Key Requirements, Success factors, Startup Budget, Remarks
//
// Laid out like a plan document: photo, the budget plans to choose from, then numbered
// sections. Gating happens here on the server: visitors receive only the first budget
// lines and steps, and no totals. Every "Unlock" opens the onboarding pop-up.
export default async function IdeaPage({ params, searchParams }: { params: { slug: string }; searchParams: { scenario?: string } }) {
  const viewer = await getViewer();
  const [item, memberPlan] = await Promise.all([
    prisma.contentItem.findFirst({
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
    }),
    prisma.membershipPlan.findUnique({ where: { code: "member" } }),
  ]);
  if (!item || !item.businessIdea) notFound();
  const idea = item.businessIdea;
  const path = `/business-ideas/${item.slug}`;
  await trackView(viewer, item.id, path);

  const scenarios = PLAN_ORDER.map((l) => idea.scenarios.find((s) => s.level === l)).filter((s): s is NonNullable<typeof s> => Boolean(s));
  const wanted = PLAN_ORDER.find((l) => l === searchParams.scenario) as ScenarioLevel | undefined;
  const scenario = scenarios.find((s) => s.level === wanted) ?? scenarios.find((s) => s.level === "STANDARD") ?? scenarios[0];

  const gated = item.accessLevel !== "PUBLIC" && !viewer.isMember;
  const lines = scenario ? (gated ? scenario.lines.slice(0, FREE_PREVIEW.budgetLines) : scenario.lines) : [];
  const hiddenLines = scenario ? scenario.lines.length - lines.length : 0;
  const steps = gated ? idea.steps.slice(0, FREE_PREVIEW.steps) : idea.steps;
  const hiddenSteps = idea.steps.length - steps.length;
  const plan = {
    name: memberPlan?.name ?? "Member",
    monthly: memberPlan?.priceMonthly != null ? money(memberPlan.priceMonthly, memberPlan.currency) : null,
    yearly: memberPlan?.priceYearly != null ? money(memberPlan.priceYearly, memberPlan.currency) : null,
  };

  // Numbered sections; only the ones with something to show (budget and steps always show).
  const sections = [
    { id: "overview", title: "Overview", show: Boolean(item.overview) },
    { id: "budget", title: "Startup budget", show: true },
    { id: "steps", title: "How to get started", show: idea.steps.length > 0 },
    { id: "requirements", title: "Key requirements", show: Boolean(idea.keyRequirements) },
    { id: "success", title: "What makes it work", show: Boolean(idea.successFactors) },
    { id: "remarks", title: "Remarks", show: Boolean(idea.remarks) },
  ].filter((s) => s.show).map((s, n) => ({ ...s, n: String(n + 1).padStart(2, "0") }));
  const num = (id: string) => sections.find((s) => s.id === id)?.n ?? "";

  const unlock = (label: string, cls = "") => (
    <Link href={path} data-onboard="" className={`inline-flex items-center gap-1.5 font-semibold text-brand hover:text-brand-dark ${cls}`}><LockKeyhole aria-hidden className="h-3.5 w-3.5" />{label}</Link>
  );

  return (
    <OnboardingGate signedIn={Boolean(viewer.userId)} isMember={viewer.isMember} googleEnabled={googleEnabled} plan={plan}>
      <article className="container-site flex flex-col gap-8 py-6">
        <Crumbs trail={[["/business-ideas", "Business ideas and plans"]]} title={item.title} />

        {/* ── Title and photo ── */}
        <header className="flex flex-col gap-6">
          <div className="flex max-w-3xl flex-col gap-3">
            <p className="text-sm font-semibold text-brand">{[...new Set([item.primaryCategory?.name, idea.businessType].filter(Boolean))].join(" · ") || "Business idea"}</p>
            <h1 className="font-sans text-3xl font-black leading-tight tracking-tight sm:text-[42px]">{item.title}</h1>
            {item.shortSummary ? <p className="text-lg leading-relaxed text-ink-soft">{item.shortSummary}</p> : null}
            <p className="text-sm text-ink-muted">
              {scenarios.length} budget {scenarios.length === 1 ? "plan" : "plans"} · {idea.steps.length} steps · Reviewed {date(item.lastReviewedAt)}
            </p>
          </div>
          <figure className="flex flex-col gap-2">
            <div className="overflow-hidden rounded-2xl border border-line">
              <IdeaPhoto src={idea.pictureUrl} alt={item.title} className="aspect-[16/9] sm:aspect-[21/9]" />
            </div>
            {idea.pictureCredit ? <figcaption className="text-xs text-ink-muted">{idea.pictureCredit}</figcaption> : null}
          </figure>
        </header>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <div className="flex min-w-0 flex-col gap-10">
            {item.overview ? (
              <Section n={num("overview")} id="overview" title="Overview">
                <p className="whitespace-pre-line text-[17px] leading-relaxed text-ink-soft">{item.overview}</p>
              </Section>
            ) : null}

            {/* ── Budget: pick a plan, then its cost lines ── */}
            <Section n={num("budget")} id="budget" title="Startup budget">
              {scenarios.length ? (
                <div className="flex flex-col gap-5">
                  <div role="list" aria-label="Budget plans" className={`grid gap-3 ${scenarios.length > 1 ? "sm:grid-cols-3" : "sm:max-w-sm"}`}>
                    {scenarios.map((s) => {
                      const on = s.level === scenario!.level;
                      const total = gated ? null : budgetTotal(s.lines);
                      return (
                        <Link key={s.id} role="listitem" href={`?scenario=${s.level}#budget`} scroll={false} aria-current={on ? "true" : undefined}
                          className={`flex flex-col gap-1 rounded-xl border-2 p-4 text-ink transition hover:text-ink ${on ? "border-ink bg-white" : "border-line bg-white hover:border-line-strong"}`}>
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold">{PLAN_LABEL[s.level]}</span>
                            {on ? <Check aria-hidden className="h-4 w-4 text-brand" /> : null}
                          </span>
                          <span className="text-xs text-ink-muted">{s.operatingScale ?? `${s.lines.length} cost lines`}</span>
                          <span className="mt-2 font-sans text-lg font-extrabold">
                            {gated ? <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted"><LockKeyhole aria-hidden className="h-3.5 w-3.5" />Total for members</span>
                              : total === null ? <span className="text-sm font-semibold text-ink-muted">Some costs pending</span> : money(total, s.currency)}
                          </span>
                        </Link>
                      );
                    })}
                  </div>

                  <div className="overflow-hidden rounded-xl border border-line bg-white">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line bg-page px-4 py-3">
                      <span className="text-sm font-bold">{PLAN_LABEL[scenario!.level]} plan</span>
                      <span className="text-xs text-ink-muted">{scenario!.location?.name ?? "Uganda"} · {scenario!.estimateDate ? `prices as of ${date(scenario!.estimateDate)}` : "estimate date pending"}</span>
                    </div>
                    <table className="w-full text-[15px]">
                      <thead className="sr-only"><tr><th>Item</th><th>Cost</th></tr></thead>
                      <tbody>
                        {lines.map((l) => (
                          <tr key={l.id} className="border-b border-line last:border-0">
                            <td className="px-4 py-3">
                              {l.description}
                              {l.costCategory ? <span className="block text-xs text-ink-muted">{l.costCategory}</span> : null}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                              {l.unitCost === null ? <span className="font-normal text-ink-muted">{l.unknownReason ?? "To be confirmed"}</span> : money(Number(l.unitCost) * Number(l.quantity), scenario!.currency)}
                            </td>
                          </tr>
                        ))}
                        {gated && hiddenLines > 0 ? (
                          <tr className="border-b border-line">
                            <td colSpan={2} className="px-4 py-3">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <span className="text-sm text-ink-muted">{hiddenLines} more cost {hiddenLines === 1 ? "line" : "lines"} and the total</span>
                                {unlock("Unlock the full budget", "text-sm")}
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                      {!gated ? (
                        <tfoot>
                          <tr className="border-t-2 border-ink">
                            <td className="px-4 py-3 font-extrabold">Total</td>
                            <td className="whitespace-nowrap px-4 py-3 text-right text-lg font-extrabold">{(() => { const t = budgetTotal(scenario!.lines); return t === null ? "Some costs pending" : money(t, scenario!.currency); })()}</td>
                          </tr>
                        </tfoot>
                      ) : null}
                    </table>
                  </div>
                  {scenario!.assumptions ? <p className="text-sm text-ink-muted"><strong className="font-semibold text-ink-soft">Assumptions:</strong> {scenario!.assumptions}</p> : null}
                </div>
              ) : (
                <p className="text-ink-muted">The budget for this idea is being prepared.</p>
              )}
            </Section>

            {idea.steps.length ? (
              <Section n={num("steps")} id="steps" title="How to get started">
                <ol className="flex flex-col">
                  {steps.map((s, n) => (
                    <li key={s.id} className="flex gap-4">
                      <span className="flex flex-col items-center">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink text-sm font-extrabold">{s.stepNumber}</span>
                        {n < steps.length - 1 || hiddenSteps > 0 ? <span aria-hidden className="w-0.5 flex-1 bg-line" /> : null}
                      </span>
                      <span className="flex flex-col gap-1 pb-6">
                        <strong className="pt-1 font-bold">{s.title}</strong>
                        {s.description ? <span className="leading-relaxed text-ink-soft">{s.description}</span> : null}
                      </span>
                    </li>
                  ))}
                  {hiddenSteps > 0 ? (
                    <li className="flex gap-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-line-strong text-ink-muted"><LockKeyhole aria-hidden className="h-3.5 w-3.5" /></span>
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
                        <span className="text-ink-muted">{hiddenSteps} more {hiddenSteps === 1 ? "step" : "steps"}</span>
                        {unlock("Unlock all steps", "text-sm")}
                      </span>
                    </li>
                  ) : null}
                </ol>
              </Section>
            ) : null}

            {idea.keyRequirements ? (
              <Section n={num("requirements")} id="requirements" title="Key requirements"><Bullets text={idea.keyRequirements} /></Section>
            ) : null}
            {idea.successFactors ? (
              <Section n={num("success")} id="success" title="What makes it work"><Bullets text={idea.successFactors} /></Section>
            ) : null}
            {idea.remarks ? (
              <Section n={num("remarks")} id="remarks" title="Remarks"><p className="whitespace-pre-line leading-relaxed text-ink-soft">{idea.remarks}</p></Section>
            ) : null}

            <Evidence contentItemId={item.id} lastReviewedAt={item.lastReviewedAt} nextReviewDueAt={item.nextReviewDueAt} viewer={viewer} back={path} />
          </div>

          {/* ── Sidebar ── */}
          <aside className="flex flex-col gap-5 lg:sticky lg:top-24">
            <section className="rounded-2xl border border-line bg-white p-5">
              <h2 className="mb-3 text-sm font-bold">At a glance</h2>
              <dl className="flex flex-col text-sm">
                {([
                  ["Business type", idea.businessType],
                  ["Category", item.primaryCategory?.name],
                  ["Budget plans", scenarios.map((s) => PLAN_LABEL[s.level]).join(", ")],
                  ["Steps", idea.steps.length || null],
                  ["Reviewed", date(item.lastReviewedAt)],
                ] as [string, React.ReactNode][]).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b border-line py-2.5 last:border-0">
                    <dt className="text-ink-muted">{k}</dt>
                    <dd className="text-right font-semibold">{v || <span className="font-normal text-ink-muted">Not added</span>}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <nav aria-label="On this page" className="hidden flex-col gap-1 text-sm lg:flex">
              <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">On this page</span>
              {sections.map((s) => (
                <a key={s.id} href={`#${s.id}`} className="flex gap-2.5 rounded-md py-1 text-ink-soft hover:text-ink"><span className="font-mono text-xs leading-5 text-ink-muted">{s.n}</span>{s.title}</a>
              ))}
            </nav>

            {!viewer.isMember ? (
              <section className="flex flex-col gap-3 rounded-2xl bg-ink p-5 text-white">
                <span className="font-sans text-lg font-extrabold">Get the full plan</span>
                <ul className="flex flex-col gap-1.5 text-sm text-white/80">
                  {["Every cost line and the total", "All the steps", "Every plan on the site"].map((t) => (
                    <li key={t} className="flex gap-2"><Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand-mint" />{t}</li>
                  ))}
                </ul>
                <Link href={path} data-onboard="" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand font-semibold text-white hover:bg-brand-dark hover:text-white">
                  Unlock full access <Icon name="arrow" className="h-4 w-4" />
                </Link>
                <p className="text-center text-xs text-white/55">{plan.monthly ? `${plan.monthly} a month · ` : ""}MoMo, Airtel Money or card</p>
              </section>
            ) : null}

            <Connected contentItemId={item.id} />
          </aside>
        </div>
      </article>
    </OnboardingGate>
  );
}

function Section({ n, id, title, children }: { n: string; id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} data-reveal className="scroll-mt-24 border-t border-ink pt-5">
      <h2 className="mb-5 flex items-baseline gap-3 font-sans text-2xl font-extrabold tracking-tight">
        <span className="font-mono text-sm font-semibold text-brand">{n}</span>{title}
      </h2>
      {children}
    </section>
  );
}

/** One point per line, as entered in the admin. */
function Bullets({ text }: { text: string }) {
  const points = text.split("\n").map((s) => s.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
  if (points.length < 2) return <p className="whitespace-pre-line leading-relaxed text-ink-soft">{text}</p>;
  return (
    <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
      {points.map((p) => (
        <li key={p} className="flex gap-3 leading-snug text-ink-soft"><span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rotate-45 bg-brand" />{p}</li>
      ))}
    </ul>
  );
}
