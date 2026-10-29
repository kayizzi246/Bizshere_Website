import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Check, Crown, LockKeyhole } from "lucide-react";
import type { ScenarioLevel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cachedMemberPlan } from "@/lib/cached";
import { getViewer, FREE_PREVIEW } from "@/lib/access";
import { googleEnabled } from "@/lib/auth";
import { date, money } from "@/lib/format";
import { budgetTotal } from "@/lib/costing";
import { Connected, Evidence, trackView } from "@/components/DetailParts";
import { Icon } from "@/components/Icon";
import { FieldSections } from "@/components/FieldSections";
import { ChildSections, loadChildSections } from "@/components/ChildSections";
import { IdeaPhoto, PLAN_LABEL, PLAN_ORDER } from "@/components/IdeaParts";
import { OnboardingGate } from "@/components/Onboarding";
import { PrintButton } from "@/components/PrintButton";

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
    cachedMemberPlan(),
  ]);
  if (!item || !item.businessIdea) notFound();
  const idea = item.businessIdea;
  const path = `/business-ideas/${item.slug}`;
  await trackView(viewer, item.id, path);
  const media = await loadChildSections("BUSINESS_IDEA", { record: idea.id, item: item.id, org: null });

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

  const facts: [string, string, string][] = [
    ["files", `${scenarios.length} budget ${scenarios.length === 1 ? "plan" : "plans"}`, scenarios.map((s) => PLAN_LABEL[s.level]).join(", ") || "Being prepared"],
    ["tool", `${scenario?.lines.length ?? 0} costed items`, scenario?.estimateDate ? `Prices as of ${date(scenario.estimateDate)}` : "With the total"],
    ["check", `${idea.steps.length} steps to start`, "In order, from day one"],
    ["guide", "Requirements", idea.keyRequirements || idea.successFactors ? "And what makes it work" : "Being prepared"],
  ];

  return (
    <OnboardingGate signedIn={Boolean(viewer.userId)} isMember={viewer.isMember} googleEnabled={googleEnabled} plan={plan}>
      <article className="bg-page pb-6">
        {/* ── Header band: deep navy like the homepage hero. Title, summary and the unlock box on the left; photo on the right ── */}
        <header className="bg-[#071A33] text-white">
          <div className="container-site grid grid-cols-[minmax(0,1fr)] gap-10 pb-20 pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-14 lg:pb-24 lg:pt-10">
            <div className="flex flex-col gap-6">
              <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[13px] text-white/60">
                <Link href="/" className="text-white/60 hover:text-white">Home</Link>
                <span aria-hidden>/</span>
                <Link href="/business-ideas" className="text-white/60 hover:text-white">Business ideas and plans</Link>
                <span aria-hidden>/</span>
                <span className="max-w-[32ch] truncate text-white/90">{item.title}</span>
              </nav>

              <div className="flex flex-col gap-4">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink"><Crown aria-hidden className="h-3.5 w-3.5" />Premium plan</span>
                  <span className="rounded-full border border-white/25 px-3 py-1 text-xs font-semibold text-white/85">{[...new Set([item.primaryCategory?.name, idea.businessType].filter(Boolean))].join(" · ") || "Business idea"}</span>
                </span>
                <h1 className="font-sans text-[36px] font-black leading-[1.08] tracking-[-0.02em] sm:text-[48px]">{item.title}</h1>
                {item.shortSummary ? <p className="max-w-xl text-lg leading-relaxed text-white/80">{item.shortSummary}</p> : null}
                <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/60">
                  <span>Costed for {scenario?.location?.name ?? "Uganda"}</span>
                  <span>Reviewed {date(item.lastReviewedAt)}</span>
                </p>
              </div>

              {viewer.isMember ? (
                // Paid state: the plan is theirs.
                <div className="flex flex-col gap-4 rounded-2xl border border-white/15 bg-white/[0.06] p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-ink"><BadgeCheck aria-hidden className="h-6 w-6" /></span>
                    <span className="flex flex-col">
                      <span className="font-sans text-lg font-extrabold">Unlocked: this plan is yours</span>
                      <span className="text-sm text-white/70">Full budget, every step and all details, with your membership.</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a href="#budget" className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-5 text-sm font-bold text-ink hover:bg-accent hover:text-ink">Open the full budget <Icon name="arrow" className="h-4 w-4" /></a>
                    <PrintButton />
                  </div>
                </div>
              ) : (
                // Not paid yet: price and one button.
                <div className="flex flex-col gap-4 rounded-2xl border border-white/15 bg-white/[0.06] p-5">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <span className="flex flex-col">
                      <span className="text-xs font-semibold uppercase tracking-wider text-white/55">Full plan</span>
                      <span className="font-sans text-2xl font-black">{plan.monthly ?? "Membership"}{plan.monthly ? <span className="text-sm font-medium text-white/60"> / month</span> : null}</span>
                    </span>
                    <span className="text-xs text-white/60">Includes every plan on BizSphere-Ug</span>
                  </div>
                  <Link href={path} data-onboard="" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white font-sans text-base font-bold text-ink hover:bg-accent hover:text-ink">
                    <LockKeyhole aria-hidden className="h-4 w-4" /> Unlock this plan
                  </Link>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/60">
                    <span className="flex gap-1.5">
                      {["MTN MoMo", "Airtel Money", "Card"].map((m) => <span key={m} className="rounded border border-white/20 px-1.5 py-0.5 text-white/80">{m}</span>)}
                    </span>
                    <span>Cancel any time</span>
                  </div>
                </div>
              )}
            </div>

            <figure className="flex flex-col gap-2">
              <div className="overflow-hidden rounded-3xl border border-white/10 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
                <IdeaPhoto src={idea.pictureUrl} alt={item.title} className="aspect-[4/3]" />
              </div>
              {idea.pictureCredit ? <figcaption className="text-xs text-white/50">{idea.pictureCredit}</figcaption> : null}
            </figure>
          </div>
        </header>

        {/* ── What's inside: real counts from this plan, overlapping the band ── */}
        <div className="container-site relative -mt-12">
          <ul aria-label="What's inside this plan" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {facts.map(([icon, k, v]) => (
              <li key={k} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-[0_12px_30px_-18px_rgba(7,26,51,0.35)] sm:p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand"><Icon name={icon} className="h-5 w-5" /></span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-sans text-[15px] font-black text-heading sm:text-base">{k}</span>
                  <span className="truncate text-xs text-ink-muted">{v}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── In-page tabs, stuck under the header while reading ── */}
        <nav aria-label="On this page" className="sticky top-[78px] z-20 mt-8 border-y border-line bg-white/90 backdrop-blur-xl">
          <div className="container-site flex gap-1 overflow-x-auto py-2 [scrollbar-width:none]">
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold text-ink-soft hover:bg-page hover:text-ink">
                <span className="font-mono text-xs text-brand">{s.n}</span>{s.title}
              </a>
            ))}
          </div>
        </nav>

        <div className="container-site grid grid-cols-[minmax(0,1fr)] gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-10">
          <div className="flex min-w-0 flex-col gap-6">
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

            <ChildSections sections={media} gated={gated} back={path} />

            <FieldSections type="BUSINESS_IDEA" record={idea as unknown as Record<string, unknown>} gated={gated} back={path} />

            <Evidence contentItemId={item.id} lastReviewedAt={item.lastReviewedAt} nextReviewDueAt={item.nextReviewDueAt} viewer={viewer} back={path} />
          </div>

          {/* ── Sidebar ── */}
          <aside className="flex flex-col gap-5 lg:sticky lg:top-[150px]">
            <section className="rounded-2xl border border-line bg-white p-6">
              <h2 className="mb-3 font-sans text-base font-black text-heading">At a glance</h2>
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

            {!viewer.isMember ? (
              <section className="flex flex-col gap-3 rounded-2xl bg-brand-deep p-5 text-white">
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
    <section id={id} className="scroll-mt-[150px] rounded-2xl border border-line bg-white p-6 sm:p-8">
      <h2 className="mb-6 flex items-center gap-3 font-sans text-[22px] font-black tracking-[-0.02em] text-heading sm:text-[26px]">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-tint font-mono text-sm font-bold text-brand">{n}</span>{title}
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
