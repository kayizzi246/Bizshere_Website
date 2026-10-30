import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Calculator, Check, ChevronDown, ClipboardList, Crown, ListOrdered, LockKeyhole, MapPin, Sparkles, Users } from "lucide-react";
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
import { IdeaCard, IdeaPhoto, PLAN_LABEL, PLAN_ORDER, points } from "@/components/IdeaParts";
import { OnboardingGate } from "@/components/Onboarding";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

// Client fields: Business Idea Name, Brief, Business Type, Category, Description,
// Key Requirements, Success factors, Startup Budget, Remarks
//
// Laid out as a start-up guide: hero with the requirement count, an overview strip, a three-part
// guide (requirements, how to start, start-up costs), the requirements checklist by category, the
// budget and steps, questions answered from the plan's own data, then more ideas in the same
// category. Only facts the plan has are shown; nothing is filled in.
//
// Gating happens here on the server: visitors receive only the first budget lines and steps, and
// no totals. Every "Unlock" opens the onboarding pop-up.
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
  // More ideas: the same category first; when it has no others, other ideas.
  const moreOf = (sameCategory: boolean) => prisma.contentItem.findMany({
    where: { contentType: "BUSINESS_IDEA", publicationStatus: "PUBLISHED", id: { not: item.id }, ...(sameCategory && item.primaryCategoryId ? { primaryCategoryId: item.primaryCategoryId } : {}) },
    select: { id: true, slug: true, title: true, shortSummary: true, businessIdea: { select: { pictureUrl: true, keyRequirements: true, _count: { select: { steps: true } }, scenarios: { select: { _count: { select: { lines: true } } } } } } },
    orderBy: { publishedAt: { sort: "desc", nulls: "last" } },
    take: 3,
  });
  const [media, sameCategory] = await Promise.all([
    loadChildSections("BUSINESS_IDEA", { record: idea.id, item: item.id, org: null }),
    moreOf(true),
  ]);
  const inCategory = sameCategory.length > 0 && Boolean(item.primaryCategoryId);
  const more = sameCategory.length ? sameCategory : await moreOf(false);

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

  const unlock = (label: string, cls = "") => (
    <Link href={path} data-onboard="" className={`inline-flex items-center gap-1.5 font-semibold text-brand hover:text-brand-dark ${cls}`}><LockKeyhole aria-hidden className="h-3.5 w-3.5" />{label}</Link>
  );

  // Requirements: the costed items of the chosen plan (grouped by their cost category) and the
  // plan's key requirements. Visitors see the free preview of the costed items; counts are public.
  const keyPoints = points(idea.keyRequirements);
  const allLines = scenario?.lines ?? [];
  const requirementCount = allLines.length + keyPoints.length;
  const byCategory = [...allLines.reduce((m, l) => m.set(l.costCategory || "Other", (m.get(l.costCategory || "Other") ?? 0) + 1), new Map<string, number>())];
  const categories: [string, number][] = [...(keyPoints.length ? [["Key requirements", keyPoints.length] as [string, number]] : []), ...byCategory];
  const totals = scenarios.map((s) => ({ level: s.level, total: budgetTotal(s.lines), currency: s.currency }));
  const firstStep = idea.steps[0]?.title;

  // Overview strip: only the facts this plan has.
  const experience = idea.experienceLevel ? `${idea.experienceLevel.charAt(0)}${idea.experienceLevel.slice(1).toLowerCase()}` : null;
  const overview = ([
    [Sparkles, "Skill level", experience],
    [ClipboardList, "Business type", idea.businessType],
    [Calculator, "Budget plans", scenarios.length ? scenarios.map((s) => PLAN_LABEL[s.level]).join(", ") : null],
    [ListOrdered, "Steps to start", idea.steps.length ? `${idea.steps.length} steps` : null],
    [MapPin, "Home-based", idea.homeBasedSuitable === null ? null : idea.homeBasedSuitable ? "Possible" : "Needs premises"],
    [Users, "Staff", idea.staffCount ? `About ${idea.staffCount}` : null],
  ] as [typeof Sparkles, string, string | null][]).filter(([, , v]) => v);

  // Questions answered from the plan's own data; a question without an answer is left out.
  const name = item.title.replace(/^Sample:\s*/i, "");
  const faq = ([
    [`How much does it cost to start a ${name.toLowerCase()} business in Uganda?`,
      scenarios.length === 0 ? null
        : gated ? <>There {scenarios.length === 1 ? "is one budget plan" : `are ${scenarios.length} budget plans`} ({scenarios.map((s) => PLAN_LABEL[s.level]).join(", ")}) with {allLines.length} costed items{scenario?.estimateDate ? `, priced as of ${date(scenario.estimateDate)}` : ""}. Members see every cost and the total. {unlock("Unlock the budget")}</>
        : <>{totals.map((t) => `${PLAN_LABEL[t.level]}: ${t.total === null ? "some costs pending" : money(t.total, t.currency)}`).join(" · ")}. Prices change, so confirm quotes with suppliers before you pay.</>],
    ["What do I need to start?", keyPoints.length ? <>{keyPoints.join("; ")}. See the full checklist under Requirements.</> : null],
    ["How do I get started?", idea.steps.length ? <>Follow the {idea.steps.length} steps in order{firstStep ? <>, starting with “{firstStep}”</> : null}. They are listed under How to get started.</> : null],
    ["What skills or experience do I need?", experience || idea.requiredSkills ? <>{experience ? `${experience} level. ` : ""}{idea.requiredSkills ?? ""}</> : null],
    ["Can I run it from home?", idea.homeBasedSuitable === null ? null : idea.homeBasedSuitable ? "Yes, it can start from home." : "It needs its own premises."],
    ["Where is the best place to set up?", idea.locationRequirements],
  ] as [string, React.ReactNode][]).filter(([, a]) => Boolean(a));

  return (
    <OnboardingGate signedIn={Boolean(viewer.userId)} isMember={viewer.isMember} googleEnabled={googleEnabled} plan={plan}>
      <article className="bg-page pb-10">
        {/* ── Hero: photo, name, requirement count and the main action ── */}
        <header className="bg-[#071A33] text-white">
          <div className="container-site flex flex-col gap-7 py-8 lg:py-12">
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[13px] text-white/60">
              <Link href="/business-ideas" className="text-white/60 hover:text-white">Business ideas</Link>
              {item.primaryCategory ? <><span aria-hidden>›</span><Link href={`/business-ideas?category=${item.primaryCategory.id}`} className="text-white/60 hover:text-white">{item.primaryCategory.name}</Link></> : null}
              <span aria-hidden>›</span>
              <span className="max-w-[32ch] truncate text-white/90">{name}</span>
            </nav>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center lg:gap-12">
              <div className="flex flex-col gap-5">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink"><Crown aria-hidden className="h-3.5 w-3.5" />Business plan</span>
                  {item.primaryCategory ? <span className="rounded-full border border-white/25 px-3 py-1 text-xs font-semibold text-white/85">{item.primaryCategory.name}</span> : null}
                </span>
                <h1 className="text-page-title">{name} business in Uganda</h1>
                {item.shortSummary ? <p className="max-w-xl text-base leading-relaxed text-white/75">{item.shortSummary}</p> : null}
                <div className="flex flex-wrap items-center gap-3">
                  <a href="#requirements" className="inline-flex h-12 items-center gap-2 rounded-lg bg-white px-5 text-sm font-bold text-ink hover:bg-accent hover:text-ink">
                    <ClipboardList aria-hidden className="h-4 w-4" />View all {requirementCount} requirements
                  </a>
                  {viewer.isMember ? <PrintButton /> : (
                    <Link href={path} data-onboard="" className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/40 px-5 text-sm font-bold text-white hover:bg-white/10 hover:text-white"><LockKeyhole aria-hidden className="h-4 w-4" />Unlock the full plan</Link>
                  )}
                </div>
                <p className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-white/55">
                  <span>Costed for {scenario?.location?.name ?? "Uganda"}</span>
                  <span>Reviewed {date(item.lastReviewedAt)}</span>
                  {viewer.isMember ? <span className="inline-flex items-center gap-1 text-accent"><BadgeCheck aria-hidden className="h-3.5 w-3.5" />Full access</span> : null}
                </p>
              </div>
              <figure className="flex flex-col gap-2">
                <div className="overflow-hidden rounded-3xl border border-white/10">
                  <IdeaPhoto src={idea.pictureUrl} alt={name} className="aspect-[16/10]" />
                </div>
                {idea.pictureCredit ? <figcaption className="text-xs text-white/50">{idea.pictureCredit}</figcaption> : null}
              </figure>
            </div>
          </div>
        </header>

        <div className="container-site flex flex-col gap-10 pt-10">
          {/* ── Overview strip ── */}
          {overview.length ? (
            <section aria-labelledby="ov" className="flex flex-col gap-4">
              <h2 id="ov" className="text-section-title text-heading">{name} business overview</h2>
              <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                {overview.map(([I, k, v]) => (
                  <div key={k} className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-tint text-brand"><I aria-hidden className="h-[18px] w-[18px]" /></span>
                    <dt className="text-xs text-ink-muted">{k}</dt>
                    <dd className="font-display text-[15px] font-bold leading-snug text-heading">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {/* ── The guide in three parts ── */}
          <section aria-labelledby="guide" className="flex flex-col gap-4">
            <h2 id="guide" className="text-section-title text-heading">Complete guide to starting a {name.toLowerCase()} business</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {([
                ["#requirements", ClipboardList, "Requirements checklist", `${requirementCount} things you need, by category`],
                ["#steps", ListOrdered, "How to start", idea.steps.length ? `${idea.steps.length} steps in order, from day one` : "Being prepared"],
                ["#budget", Calculator, "Start-up costs", scenarios.length ? `${scenarios.length} budget ${scenarios.length === 1 ? "plan" : "plans"}: ${scenarios.map((s) => PLAN_LABEL[s.level]).join(", ")}` : "Being prepared"],
              ] as [string, typeof ClipboardList, string, string][]).map(([href, I, title, text]) => (
                <a key={href} href={href} className="group flex items-center gap-4 rounded-2xl border border-line bg-white p-5 text-ink transition-colors hover:border-brand hover:text-ink">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-white"><I aria-hidden className="h-6 w-6" /></span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="font-display text-base font-bold text-heading group-hover:text-brand">{title}</span>
                    <span className="text-[13px] text-ink-muted">{text}</span>
                  </span>
                  <span aria-hidden className="text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-brand">→</span>
                </a>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-10">
            <div className="flex min-w-0 flex-col gap-6">
              {/* ── Requirements checklist ── */}
              <Card id="requirements" title={`${name} business requirements`}>
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                  <div className="flex flex-col gap-2">
                    <h3 className="font-display text-sm font-bold text-heading">What you need</h3>
                    <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
                      {keyPoints.map((p) => (
                        <li key={p} className="flex items-center gap-3 px-4 py-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-white"><Check aria-hidden className="h-3.5 w-3.5" strokeWidth={3} /></span>
                          <span className="flex-1 text-sm text-ink">{p}</span>
                          <span className="hidden rounded-full bg-accent-tint px-2.5 py-0.5 text-[11px] font-semibold text-accent-dark sm:inline">Key requirement</span>
                        </li>
                      ))}
                      {lines.map((l) => (
                        <li key={l.id} className="flex items-center gap-3 px-4 py-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand"><Check aria-hidden className="h-3.5 w-3.5" strokeWidth={3} /></span>
                          <span className="flex-1 text-sm text-ink">{l.description}</span>
                          <span className="hidden rounded-full bg-brand-tint px-2.5 py-0.5 text-[11px] font-semibold text-brand-dark sm:inline">{l.costCategory || "Other"}</span>
                        </li>
                      ))}
                      {hiddenLines > 0 ? (
                        <li className="flex flex-wrap items-center justify-between gap-3 bg-page/60 px-4 py-3">
                          <span className="text-sm text-ink-muted">{hiddenLines} more costed {hiddenLines === 1 ? "item" : "items"}</span>
                          {unlock("See every requirement", "text-sm")}
                        </li>
                      ) : null}
                      {requirementCount === 0 ? <li className="px-4 py-3 text-sm text-ink-muted">The requirements for this idea are being prepared.</li> : null}
                    </ul>
                  </div>
                  {categories.length ? (
                    <div className="flex flex-col gap-2">
                      <h3 className="font-display text-sm font-bold text-heading">Requirement categories</h3>
                      <ul className="flex flex-col gap-2">
                        {categories.map(([c, n]) => (
                          <li key={c} className="flex items-center justify-between gap-3 rounded-xl bg-page px-4 py-3 text-sm">
                            <span className="font-semibold text-ink">{c}</span>
                            <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-heading ring-1 ring-line">{n}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </Card>

              {item.overview ? (
                <Card id="about" title={`About the ${name.toLowerCase()} business`}>
                  <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{item.overview}</p>
                </Card>
              ) : null}

              {/* ── Start-up costs: pick a plan, then its cost lines ── */}
              <Card id="budget" title="Start-up costs">
                {scenarios.length ? (
                  <div className="flex flex-col gap-5">
                    <div role="list" aria-label="Budget plans" className={`grid gap-3 ${scenarios.length > 1 ? "sm:grid-cols-3" : "sm:max-w-sm"}`}>
                      {scenarios.map((s) => {
                        const on = s.level === scenario!.level;
                        const total = gated ? null : budgetTotal(s.lines);
                        return (
                          <Link key={s.id} role="listitem" href={`?scenario=${s.level}#budget`} scroll={false} aria-current={on ? "true" : undefined}
                            className={`flex flex-col gap-1 rounded-xl border-2 p-4 text-ink transition hover:text-ink ${on ? "border-brand bg-brand-tint/40" : "border-line bg-white hover:border-line-strong"}`}>
                            <span className="flex items-center justify-between gap-2">
                              <span className="text-sm font-bold">{PLAN_LABEL[s.level]}</span>
                              {on ? <Check aria-hidden className="h-4 w-4 text-brand" /> : null}
                            </span>
                            <span className="text-xs text-ink-muted">{s.operatingScale ?? `${s.lines.length} cost lines`}</span>
                            <span className="mt-2 font-display text-lg font-bold">
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
                              <td className="px-4 py-3 font-bold">Total</td>
                              <td className="whitespace-nowrap px-4 py-3 text-right text-lg font-bold">{(() => { const t = budgetTotal(scenario!.lines); return t === null ? "Some costs pending" : money(t, scenario!.currency); })()}</td>
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
              </Card>

              {idea.steps.length ? (
                <Card id="steps" title="How to get started">
                  <ol className="flex flex-col">
                    {steps.map((s, n) => (
                      <li key={s.id} className="flex gap-4">
                        <span className="flex flex-col items-center">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{s.stepNumber}</span>
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
                </Card>
              ) : null}

              {idea.successFactors ? <Card id="success" title="What makes it work"><Bullets text={idea.successFactors} /></Card> : null}
              {idea.remarks ? <Card id="remarks" title="Remarks"><p className="whitespace-pre-line leading-relaxed text-ink-soft">{idea.remarks}</p></Card> : null}

              <ChildSections sections={media} gated={gated} back={path} />
              <FieldSections type="BUSINESS_IDEA" record={idea as unknown as Record<string, unknown>} gated={gated} back={path} />

              {/* ── Questions answered from this plan ── */}
              {faq.length ? (
                <Card id="faq" title={`Questions about the ${name.toLowerCase()} business`}>
                  <div className="flex flex-col divide-y divide-line">
                    {faq.map(([q, a], n) => (
                      <details key={q} open={n === 0} className="group py-3 [&_summary::-webkit-details-marker]:hidden">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-1 font-display text-[15px] font-semibold text-heading">
                          {q}<ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-ink-muted transition group-open:rotate-180" />
                        </summary>
                        <div className="pt-2 text-sm leading-relaxed text-ink-soft">{a}</div>
                      </details>
                    ))}
                  </div>
                </Card>
              ) : null}

              <Evidence contentItemId={item.id} lastReviewedAt={item.lastReviewedAt} nextReviewDueAt={item.nextReviewDueAt} viewer={viewer} back={path} />
            </div>

            {/* ── Sidebar ── */}
            <aside className="flex flex-col gap-5 lg:sticky lg:top-24">
              {!viewer.isMember ? (
                <section className="flex flex-col gap-3 rounded-2xl bg-[#071A33] p-5 text-white">
                  <span className="font-display text-lg font-bold">Get the full plan</span>
                  <ul className="flex flex-col gap-1.5 text-sm text-white/80">
                    {["Every cost line and the total", "All the steps", "Every plan on the site"].map((t) => (
                      <li key={t} className="flex gap-2"><Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{t}</li>
                    ))}
                  </ul>
                  <Link href={path} data-onboard="" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white font-semibold text-ink hover:bg-accent hover:text-ink">
                    Unlock full access <Icon name="arrow" className="h-4 w-4" />
                  </Link>
                  <p className="text-center text-xs text-white/55">{plan.monthly ? `${plan.monthly} a month · ` : ""}MoMo, Airtel Money or card</p>
                </section>
              ) : null}
              <Connected contentItemId={item.id} />
            </aside>
          </div>

          {/* ── Call to action ── */}
          <section className="flex flex-col items-start justify-between gap-5 rounded-3xl bg-[#071A33] p-8 text-white sm:flex-row sm:items-center sm:p-10">
            <span className="flex flex-col gap-1.5">
              <span className="text-section-title">Ready to start your {name.toLowerCase()} business?</span>
              <span className="text-[15px] text-white/70">{requirementCount} requirements, {idea.steps.length} steps and {scenarios.length} budget {scenarios.length === 1 ? "plan" : "plans"} in one place.</span>
            </span>
            {viewer.isMember ? (
              <a href="#requirements" className="inline-flex h-12 shrink-0 items-center gap-2 rounded-lg bg-white px-6 text-sm font-bold text-ink hover:bg-accent hover:text-ink">View all {requirementCount} requirements</a>
            ) : (
              <Link href={path} data-onboard="" className="inline-flex h-12 shrink-0 items-center gap-2 rounded-lg bg-white px-6 text-sm font-bold text-ink hover:bg-accent hover:text-ink"><LockKeyhole aria-hidden className="h-4 w-4" />Unlock the full plan</Link>
            )}
          </section>

          {/* ── More ideas: the same category, or others when it has none ── */}
          {more.length ? (
            <section aria-labelledby="more" className="flex flex-col gap-4">
              <div className="flex items-end justify-between gap-3">
                <h2 id="more" className="text-section-title text-heading">{inCategory ? `More ${item.primaryCategory!.name.toLowerCase()} businesses` : "More business ideas"}</h2>
                <Link href={inCategory ? `/business-ideas?category=${item.primaryCategory!.id}` : "/business-ideas"} className="shrink-0 text-sm font-semibold">View all →</Link>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {more.map((m) => <li key={m.id}><IdeaCard idea={m} /></li>)}
              </ul>
            </section>
          ) : null}
        </div>
      </article>
    </OnboardingGate>
  );
}

function Card({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-line bg-white p-6 sm:p-8">
      <h2 className="text-block-title mb-5 text-heading">{title}</h2>
      {children}
    </section>
  );
}


function Bullets({ text }: { text: string }) {
  const list = points(text);
  if (list.length < 2) return <p className="whitespace-pre-line leading-relaxed text-ink-soft">{text}</p>;
  return (
    <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
      {list.map((p) => (
        <li key={p} className="flex gap-3 leading-snug text-ink-soft"><span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rotate-45 bg-brand" />{p}</li>
      ))}
    </ul>
  );
}
