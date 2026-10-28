import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ScrollEffects } from "@/components/ScrollEffects";
import { NavProgress } from "@/components/NavProgress";
import { Suspense } from "react";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={null}><NavProgress /></Suspense>
      <SiteHeader />
      <ScrollEffects />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
