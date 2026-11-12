import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { ScenarioLevel } from "@prisma/client";
import { cachedMemberPlan } from "@/lib/cached";
import { getViewer, FREE_PREVIEW } from "@/lib/access";
import { googleEnabled } from "@/lib/auth";
import { calcPlans, getIdea, moreIdeas, plansOf, requirementsPath } from "@/lib/ideas";
import { trackView } from "@/components/DetailParts";
import { IdeaCard, PLAN_ORDER } from "@/components/IdeaParts";
import { BudgetCalculator } from "@/components/BudgetCalculator";
import { OnboardingGate } from "@/components/Onboarding";
import { popupPlan } from "@/lib/billing";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const item = await getIdea(params.slug, false);
  return { title: item ? `${item.title.replace(/^Sample:\s*/i, "")} business requirements` : "Business requirements" };
}

/**
 * A business idea's requirements on their own page (the card's "Requirements" button): how many
 * there are, the cost calculator by business size, every requirement by category as a card, then
 * similar businesses. The overview stays at /business-ideas/[slug].
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
  const plan = popupPlan(memberPlan);

  return (
    <OnboardingGate signedIn={Boolean(viewer.userId)} isMember={viewer.isMember} googleEnabled={googleEnabled} plan={plan}>
      <article className="bg-page">
        <header className="under-header-pad bg-brand-dark text-white">
          <div className="container-site flex flex-col items-center gap-3 py-5 text-center sm:py-6">
            <Link href={overview} className="inline-flex items-center gap-1 text-[13px] font-semibold text-white hover:text-white/80"><ArrowLeft aria-hidden className="h-3.5 w-3.5" />{name}</Link>
            <h1 className="text-hero text-[28px] leading-tight sm:text-[36px]">Startup budget</h1>
            <nav aria-label="Pages" className="inline-flex gap-1 rounded-full bg-white p-1">
              <Link href={overview} className="rounded-full px-4 py-1.5 text-[13px] font-semibold text-ink-soft hover:text-brand">Business details</Link>
              <span aria-current="page" className="rounded-full bg-brand px-4 py-1.5 text-[13px] font-semibold text-white">Startup budget</span>
            </nav>
          </div>
        </header>

        <div className="container-site flex flex-col gap-6 py-4 sm:py-5">
          <section id="calculator" aria-label="Requirements and cost calculator" className="scroll-mt-24">
            {scenarios.length ? (
              <BudgetCalculator name={name} plans={plans} initial={scenario!.level} gated={gated} unlockHref={path}
                hidden={Object.fromEntries(scenarios.map((s) => [s.level, gated ? Math.max(0, s.lines.length - FREE_PREVIEW.budgetLines) : 0]))}
                pdfHref={`/business-ideas/${item.slug}/pdf`} />
            ) : (
              <p className="rounded-2xl border border-dashed border-line-strong bg-white px-6 py-14 text-center text-sm text-ink-muted">The requirements for this idea are being prepared. <Link href={overview} className="font-semibold">See the overview</Link></p>
            )}
          </section>

          {more.length ? (
            <section aria-labelledby="similar" className="flex flex-col gap-3">
              <div className="flex items-end justify-between gap-3">
                <h2 id="similar" className="text-block-title text-heading">Similar businesses</h2>
                <Link href={inCategory && item.primaryCategory ? `/business-ideas?category=${item.primaryCategory.id}` : "/business-ideas"} className="shrink-0 text-sm font-semibold">View all →</Link>
              </div>
              <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                {more.map((m) => <li key={m.id}><IdeaCard idea={m} /></li>)}
              </ul>
            </section>
          ) : null}

        </div>
      </article>
    </OnboardingGate>
  );
}
