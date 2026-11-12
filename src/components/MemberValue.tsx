import Link from "next/link";
import { ArrowRight, LockKeyhole, Smartphone } from "lucide-react";
import type { popupPlan } from "@/lib/billing";

/**
 * The box on every paid page for someone who hasn't paid (client, 12 Nov 2026: "straight to the point, no second
 * guessing"): what is hidden on this page (names only, never the values), then one button that says what it costs
 * and opens the payment pop-up in place, and how to pay. One line says the same membership opens every directory.
 * Must sit inside an OnboardingGate. `wide` lays it out across the page; otherwise it fits a sidebar.
 */
export function MemberValue({ back, unlocks, plan, wide = false }: { back: string; unlocks: string[]; plan: ReturnType<typeof popupPlan>; wide?: boolean }) {
  const here = [...new Set(unlocks)].slice(0, 6);
  const lowest = plan.daily ? `${plan.daily} a day` : plan.weekly ? `${plan.weekly} a week` : plan.monthly ? `${plan.monthly} a month` : null;

  return (
    <section data-member-value="" className="hero-glow flex flex-col gap-4 rounded-xl p-5 text-white sm:p-6">
      <div className={`grid grid-cols-[minmax(0,1fr)] gap-5 ${wide ? "md:grid-cols-[minmax(0,1fr)_minmax(0,300px)] md:items-center md:gap-10" : ""}`}>
        <div className="flex min-w-0 flex-col gap-3">
          <h2 className="font-display text-[20px] font-extrabold leading-tight sm:text-[22px]">See the rest of this page</h2>
          {here.length ? (
            <ul aria-label="Hidden on this page" className="flex flex-wrap gap-2">
              {here.map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-semibold">
                  <LockKeyhole aria-hidden className="h-3.5 w-3.5 text-accent" />{t}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-[13px] text-white/75">The same membership opens every business plan, contact, funding term and price on BizSphere-Ug.</p>
        </div>
        <div className="flex flex-col gap-2">
          <Link href={back} data-onboard="" className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-lg bg-accent px-5 text-center text-[15px] font-bold leading-tight text-ink hover:bg-white hover:text-ink">
            {lowest ? `Unlock now · ${lowest}` : "Unlock now"}<ArrowRight aria-hidden className="h-4 w-4 shrink-0" />
          </Link>
          <p className="text-center text-[13px] leading-snug text-white/85"><Smartphone aria-hidden className="mr-1 inline h-4 w-4 align-[-3px]" />Pay with MoMo, Airtel or card.<br />It opens straight away.</p>
          <Link href="/membership" className="text-center text-[13px] font-semibold text-white underline-offset-2 hover:text-white hover:underline">See all plans</Link>
        </div>
      </div>
    </section>
  );
}
