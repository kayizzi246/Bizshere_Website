import { SiteHeader } from "@/components/SiteHeader";
import { HeaderAutoHide } from "@/components/HeaderAutoHide";
import { SiteFooter } from "@/components/SiteFooter";
import { ScrollEffects } from "@/components/ScrollEffects";
import { SmoothScroll } from "@/components/SmoothScroll";
import { NavProgress } from "@/components/NavProgress";
import { QuickLinks, ServiceRail } from "@/components/QuickLinks";
import { OnboardingGate } from "@/components/Onboarding";
import { CookieNotice } from "@/components/CookieNotice";
import { InstallPrompt } from "@/components/InstallPrompt";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { getContact } from "@/lib/site-contact";
import { WishlistProvider } from "@/components/Wishlist";
import { prisma } from "@/lib/prisma";
import { shortMemo } from "@/lib/memo";
import { DIRECTORIES, PAID_PATHS } from "@/config/directories";
import { getViewer } from "@/lib/access";
import { googleEnabled } from "@/lib/auth";
import { cachedMemberPlan } from "@/lib/cached";
import { Suspense } from "react";
import { popupPlan } from "@/lib/billing";

const SERVICES = DIRECTORIES.map((d) => ({ href: d.href, icon: d.icon, nav: d.title, text: d.text }));

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [viewer, memberPlan, contact] = await Promise.all([getViewer(), cachedMemberPlan(), getContact()]);
  // The viewer's wishlist ids, shared with every heart on the page (src/components/Wishlist.tsx)
  // Shared for a few seconds between requests that arrive together, as when a page prefetches its links (src/lib/memo.ts)
  const wishlist = viewer.userId
    ? await shortMemo(`wishlist:${viewer.userId}`, 5000, async () => (await prisma.savedItem.findMany({ where: { userId: viewer.userId! }, select: { contentItemId: true } })).map((s) => s.contentItemId))
    : [];
  const plan = popupPlan(memberPlan);

  // Every link into a paid directory, from anywhere on the site, opens sign-up → payment for non-members.
  return (
    <OnboardingGate signedIn={Boolean(viewer.userId)} isMember={viewer.isMember} googleEnabled={googleEnabled} plan={plan} paths={PAID_PATHS} help={{ whatsapp: contact.whatsapp || null, phone: contact.phone || null }}>
      <WishlistProvider initial={wishlist} signedIn={Boolean(viewer.userId)}>
      <div className="flex min-h-screen flex-col">
        <Suspense fallback={null}><NavProgress /></Suspense>
        <SiteHeader />
        <HeaderAutoHide />
        <ScrollEffects />
        <SmoothScroll />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <QuickLinks services={SERVICES} />
        <ServiceRail services={SERVICES} />
        <WhatsAppButton />
        <CookieNotice />
        <InstallPrompt />
      </div>
      </WishlistProvider>
    </OnboardingGate>
  );
}
