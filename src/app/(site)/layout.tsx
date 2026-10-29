import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ScrollEffects } from "@/components/ScrollEffects";
import { NavProgress } from "@/components/NavProgress";
import { QuickLinks, ServiceRail } from "@/components/QuickLinks";
import { OnboardingGate } from "@/components/Onboarding";
import { DIRECTORIES, PAID_PATHS } from "@/config/directories";
import { getViewer } from "@/lib/access";
import { googleEnabled } from "@/lib/auth";
import { cachedMemberPlan } from "@/lib/cached";
import { money } from "@/lib/format";
import { Suspense } from "react";

const SERVICES = DIRECTORIES.map((d) => ({ href: d.href, icon: d.icon, nav: d.nav }));

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [viewer, memberPlan] = await Promise.all([getViewer(), cachedMemberPlan()]);
  const plan = {
    name: memberPlan?.name ?? "Member",
    monthly: memberPlan?.priceMonthly != null ? money(memberPlan.priceMonthly, memberPlan.currency) : null,
    yearly: memberPlan?.priceYearly != null ? money(memberPlan.priceYearly, memberPlan.currency) : null,
  };

  // Every link into a paid directory, from anywhere on the site, opens sign-up → payment for non-members.
  return (
    <OnboardingGate signedIn={Boolean(viewer.userId)} isMember={viewer.isMember} googleEnabled={googleEnabled} plan={plan} paths={PAID_PATHS}>
      <div className="flex min-h-screen flex-col">
        <Suspense fallback={null}><NavProgress /></Suspense>
        <SiteHeader />
        <ScrollEffects />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <QuickLinks services={SERVICES} />
        <ServiceRail services={SERVICES} />
      </div>
    </OnboardingGate>
  );
}
