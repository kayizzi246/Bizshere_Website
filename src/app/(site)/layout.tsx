import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ScrollEffects } from "@/components/ScrollEffects";
import { NavProgress } from "@/components/NavProgress";
import { QuickLinks, ServiceRail } from "@/components/QuickLinks";
import { DIRECTORIES } from "@/config/directories";
import { Suspense } from "react";

const SERVICES = DIRECTORIES.map((d) => ({ href: d.href, icon: d.icon, nav: d.nav }));

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={null}><NavProgress /></Suspense>
      <SiteHeader />
      <ScrollEffects />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <QuickLinks services={SERVICES} />
      <ServiceRail services={SERVICES} />
    </div>
  );
}
