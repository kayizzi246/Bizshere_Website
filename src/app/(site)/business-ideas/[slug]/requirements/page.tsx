import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronDown } from "lucide-react";
import type { ScenarioLevel } from "@prisma/client";
import { cachedMemberPlan } from "@/lib/cached";
import { getViewer, FREE_PREVIEW } from "@/lib/access";
import { googleEnabled } from "@/lib/auth";
import { compactRange, money } from "@/lib/format";
import { calcPlans, getIdea, moreIdeas, plansOf, requirementsPath } from "@/lib/ideas";
import { trackView } from "@/components/DetailParts";
import { IdeaCard, PLAN_LABEL, PLAN_ORDER, points } from "@/components/IdeaParts";
import { BudgetCalculator } from "@/components/BudgetCalculator";
import { OnboardingGate } from "@/components/Onboarding";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const item = await getIdea(params.slug, false);
  return { title: item ? `${item.title.replace(/^Sample:\s*/i, "")} business requirements` : "Business requirements" };
}

/**
 * A business idea's requirements on their own page (the card's "Requirements" button): how many
 * there are, the cost calculator by business size, every requirement by category as a card, then
 * similar businesses and questions answered from the plan. The overview stays at /business-ideas/[slug].
 * Gating as on the overview: visitors get the free preview of the lines and no totals.
 */
export default async function RequirementsPage({ params, searchParams }: { params: { slug: string }; searchParams: { scenario?: string } }) {
  const viewer = await getViewer();
  const [item, memberPlan] = await Promise.all([getIdea(params.slug, viewer.isStaff), cachedMemberPlan()]);
  if (!item || !item.businessIdea) notFound();
  const idea = item.businessIdea;
  const overview = `/business-ideas/${item.slug}`;
  const path = requirementsPath(item.slug);
  await trackView(viewer, item.id, path);
  const { inCategory, list: more } = await moreIdeas(item);

  const name = item.title.replace(/^Sample:\s*/i, "");
  const scenarios = plansOf(idea);
  const wanted = PLAN_ORDER.find((l) => l === searchParams.scenario) as ScenarioLevel | undefined;
  const scenario = scenarios.find((s) => s.level === wanted) ?? scenarios.find((s) => s.level === "STANDARD") ?? scenarios[0];
  const gated = item.accessLevel !== "PUBLIC" && !viewer.isMember;
  const plans = calcPlans(scenarios, gated);
  const keyPoints = points(idea.keyRequirements);
  const lines = scenario?.lines ?? [];
  const count = lines.length;
  const essential = lines.filter((l) => !l.isOptional);
  const plan = {
    name: memberPlan?.name ?? "Member",
    monthly: memberPlan?.priceMonthly != null ? money(memberPlan.priceMonthly, memberPlan.currency) : null,
    yearly: memberPlan?.priceYearly != null ? money(memberPlan.priceYearly, memberPlan.currency) : null,
  };
  const capital = compactRange(idea.capitalMin, idea.capitalMax, idea.currency);
  const categories = [...new Set(lines.map((l) => l.costCategory || "Other"))];

  const faq = ([
    [`What do I need to start a ${name.toLowerCase()} business in Uganda?`, count || keyPoints.length ? <>
      {keyPoints.length ? <>Above all: {keyPoints.join(", ").toLowerCase()}. </> : null}
      {count ? <>The full list has {count} requirements{scenario && scenarios.length > 1 ? ` for a ${PLAN_LABEL[scenario.level].toLowerCase()} business` : ""}, in {categories.length} {categories.length === 1 ? "category" : "categories"}: {categories.join(", ").toLowerCase()}.</> : null}
    </> : null],
    [`How many of the ${name.toLowerCase()} business requirements are essential?`, count ? <>{essential.length} of the {count} are essential; the other {count - essential.length} are optional and can wait until the business grows.</> : null],
    [`How much do I need to start?`, capital || count ? <>
      {capital ? <>Starting capital is about {capital}{idea.capitalNotes ? ` (${idea.capitalNotes.replace(/\.$/, "").toLowerCase()})` : ""}. </> : null}
      {count ? <>Use the calculator above: pick a business size, then add only what you need for your own total.</> : null}
    </> : null],
  ] as [string, React.ReactNode][]).filter(([, a]) => Boolean(a));

  return (
    <OnboardingGate signedIn={Boolean(viewer.userId)} isMember={viewer.isMember} googleEnabled={googleEnabled} plan={plan}>
      <article className="bg-page">
        <header className="border-b border-line bg-white">
          <div className="container-site flex flex-col items-center gap-4 py-10 text-center sm:py-12">
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center justify-center gap-1.5 text-[13px] text-ink-muted">
              <Link href="/business-ideas" className="inline-flex items-center gap-1 text-ink-muted hover:text-brand"><ArrowLeft aria-hidden className="h-3.5 w-3.5" />Business ideas</Link>
              <span aria-hidden>›</span>
              <Link href={overview} className="text-ink-muted hover:text-brand">{name}</Link>
              <span aria-hidden>›</span>
              <span className="font-semibold text-heading">Requirements</span>
            </nav>
            <h1 className="text-page-title max-w-3xl text-heading">
              {count ? <>{count + keyPoints.length} requirements to start a </> : "Requirements to start a "}
              <span className="bg-gradient-to-r from-brand to-accent bg-clip-text text-transparent">{name.toLowerCase()}</span> business in Uganda
            </h1>
            <p className="max-w-2xl text-[15px] leading-relaxed text-ink-soft">
              Everything you need, by category: licences, equipment, stock and more, with what each costs. Pick your business size, then add what you need to work out your own start-up cost.
            </p>
            <nav aria-label="Pages" className="inline-flex gap-1 rounded-full border border-line bg-page p-1">
              <Link href={overview} className="rounded-full px-4 py-1.5 text-[13px] font-semibold text-ink-soft hover:text-brand">Overview</Link>
              <span aria-current="page" className="rounded-full bg-brand px-4 py-1.5 text-[13px] font-semibold text-white">Requirements</span>
            </nav>
          </div>
        </header>

        <div className="container-site flex flex-col gap-12 py-10">
          <section id="calculator" aria-label="Requirements and cost calculator" className="scroll-mt-24">
            {scenarios.length ? (
              <BudgetCalculator name={name} plans={plans} initial={scenario!.level} gated={gated} unlockHref={path}
                hidden={Object.fromEntries(scenarios.map((s) => [s.level, gated ? Math.max(0, s.lines.length - FREE_PREVIEW.budgetLines) : 0]))} />
            ) : (
              <p className="rounded-2xl border border-dashed border-line-strong bg-white px-6 py-14 text-center text-sm text-ink-muted">The requirements for this idea are being prepared. <Link href={overview} className="font-semibold">See the overview</Link></p>
            )}
          </section>

          {more.length ? (
            <section aria-labelledby="similar" className="flex flex-col gap-5 -mx-2 rounded-2xl border border-brand/15 bg-gradient-to-br from-brand-tint/70 to-accent-tint/40 px-2 py-4 sm:mx-0 sm:rounded-3xl sm:p-8">
              <div className="flex items-end justify-between gap-3">
                <span className="flex flex-col gap-1">
                  <h2 id="similar" className="text-block-title text-heading">Explore similar businesses</h2>
                  <span className="text-sm text-ink-soft">Other business ideas{inCategory && item.primaryCategory ? ` in ${item.primaryCategory.name.toLowerCase()}` : ""}, with their requirements and cost calculators.</span>
                </span>
                <Link href={inCategory && item.primaryCategory ? `/business-ideas?category=${item.primaryCategory.id}` : "/business-ideas"} className="shrink-0 text-sm font-semibold">View all →</Link>
              </div>
              <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                {more.map((m) => <li key={m.id}><IdeaCard idea={m} /></li>)}
              </ul>
            </section>
          ) : null}

          {faq.length ? (
            <section aria-labelledby="fq" className="mx-auto flex w-full max-w-3xl flex-col gap-5">
              <h2 id="fq" className="text-center text-section-title text-heading">Frequently asked questions</h2>
              <div className="flex flex-col gap-3">
                {faq.map(([q, a]) => (
                  <details key={q} className="group rounded-xl border border-line bg-white px-5 shadow-[0_1px_3px_rgba(7,26,51,0.05)] [&_summary::-webkit-details-marker]:hidden">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-[15px] font-semibold text-heading">
                      {q}<ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-ink-muted transition group-open:rotate-180" />
                    </summary>
                    <div className="pb-4 text-sm leading-relaxed text-ink-soft">{a}</div>
                  </details>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </article>
    </OnboardingGate>
  );
}
