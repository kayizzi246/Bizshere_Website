import Link from "next/link";
import { Check, LockKeyhole } from "lucide-react";
import type { popupPlan } from "@/lib/billing";

const EVERYWHERE = ["Business plans and budgets", "Supplier and expert contacts", "Funding amounts and terms", "Tools, templates and downloads"];

/**
 * What a membership opens, on any paid page: what is locked on this page (names only, never the
 * values), what comes with it across the site, and the way in. Must sit inside an OnboardingGate.
 * `wide` lays it out across the page; otherwise it fits a sidebar.
 */
export function MemberValue({ back, unlocks, plan, wide = false }: { back: string; unlocks: string[]; plan: ReturnType<typeof popupPlan>; wide?: boolean }) {
  const here = [...new Set(unlocks)].slice(0, 6);
  const lowest = plan.daily ? `${plan.daily} a day` : plan.weekly ? `${plan.weekly} a week` : plan.monthly ? `${plan.monthly} a month` : null;
  const item = "flex items-start gap-2 text-[15px] font-semibold leading-snug";
  const list = (title: string, items: string[], Mark: typeof Check, tone: string) => (
    <div className="flex min-w-0 flex-col gap-2">
      <h3 className="text-[14px] font-medium">{title}</h3>
      <ul className="flex flex-col gap-1.5">{items.map((t) => <li key={t} className={item}><Mark aria-hidden className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} strokeWidth={Mark === Check ? 3 : 2} />{t}</li>)}</ul>
    </div>
  );

  return (
    <section data-member-value="" className="flex flex-col gap-4 rounded-3xl bg-brand p-5 text-white sm:p-6">
      <h2 className="font-display text-[20px] font-extrabold leading-tight sm:text-[22px]">What membership opens for you</h2>
      <div className={`grid grid-cols-[minmax(0,1fr)] gap-4 ${wide ? "md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center md:gap-8" : ""}`}>
        {here.length ? list("Locked on this page", here, LockKeyhole, "text-white") : null}
        {list("Plus, across BizSphere-Ug", EVERYWHERE, Check, "text-accent")}
        <div className="flex flex-col gap-1.5">
          <Link href={back} data-onboard="" className="inline-flex h-12 items-center justify-center rounded-xl bg-accent px-6 text-[15px] font-bold text-ink hover:bg-white hover:text-ink">Get full access</Link>
          <p className="text-center text-[13px]">{lowest ? `From ${lowest}. ` : ""}MoMo, Airtel Money or card.</p>
        </div>
      </div>
    </section>
  );
}
