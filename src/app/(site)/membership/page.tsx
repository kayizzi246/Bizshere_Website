import Link from "next/link";
import { ArrowRight, Check, CreditCard, Crown, ShieldCheck, Smartphone, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { PLAN_PERIODS, popupPlan, yearlySaving, type MemberPeriod } from "@/lib/billing";
import { date, money } from "@/lib/format";
import { pesapalSandbox } from "@/lib/payments";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pricing", description: "One membership, four lengths. Members get full budgets, contacts, funding terms and downloads, by the day, week, month or year." };

const CARDS: Record<MemberPeriod, { title: string; text: string; per: string; button: string }> = {
  DAILY: { title: "Day pass", text: "Research one or two ideas in a single day.", per: "day", button: "Get a day pass" },
  WEEKLY: { title: "Weekly", text: "Compare ideas, call suppliers and check funding.", per: "week", button: "Subscribe" },
  MONTHLY: { title: "Monthly", text: "For planning and starting your business.", per: "month", button: "Subscribe" },
  YEARLY: { title: "Yearly", text: "For running and growing it, at the lowest price.", per: "year", button: "Subscribe" },
};

/**
 * What each card lists. Every plan opens the same content; only the length differs, so the
 * crosses are real differences only: renewal reminders (src/lib/jobs.ts: none for a day pass,
 * the day before for a week, 3 days and 1 day before for a month or a year) and the yearly saving.
 */
const FEATURES: { label: string; on: (p: MemberPeriod) => boolean }[] = [
  { label: "Full business plans and budgets", on: () => true },
  { label: "Supplier and expert contacts", on: () => true },
  { label: "Funding amounts and terms", on: () => true },
  { label: "Price history and machine prices", on: () => true },
  { label: "Tools, templates and downloads", on: () => true },
  { label: "Every directory, one membership", on: () => true },
  { label: "Renewal reminder by SMS or email", on: (p) => p !== "DAILY" },
  { label: "Reminders 3 days and 1 day before", on: (p) => p === "MONTHLY" || p === "YEARLY" },
  { label: "Lowest price per month", on: (p) => p === "YEARLY" },
];

const FAQ: [string, string][] = [
  ["How do I pay?", "Tap a plan and pay in the pop-up with MTN MoMo, Airtel Money or a Visa or Mastercard card. Payments are processed securely by Pesapal; you never leave the page."],
  ["When do I get access?", "The moment the payment goes through. For mobile money, approve the prompt on your phone with your PIN and everything opens by itself."],
  ["How does renewal work?", "We send you an SMS (or an email, if you signed up with one) before your membership ends, with a link to renew. Renewing early adds the new time to what you have left."],
  ["Can I cancel?", "Yes. Turn renewal reminders off on your account page and your membership simply ends on its date. Nothing is charged without you approving it."],
  ["What can I see without paying?", "A preview of every page: the first lines of each budget and plan, and the names of suppliers and funders. A membership opens the rest."],
];

export default async function MembershipPage() {
  const viewer = await getViewer();
  const [memberPlan, sub] = await Promise.all([
    prisma.membershipPlan.findUnique({ where: { code: "member" } }),
    viewer.userId && !viewer.isStaff
      ? prisma.subscription.findFirst({ where: { userId: viewer.userId, status: "ACTIVE", plan: { code: "member" } }, orderBy: { currentPeriodEnd: { sort: "desc", nulls: "first" } } })
      : null,
  ]);
  const plan = popupPlan(memberPlan);
  const saving = yearlySaving(plan.amounts);
  const sandbox = pesapalSandbox() || process.env.PAYMENT_SIMULATE === "true";
  const memberUntil = viewer.isMember ? sub?.currentPeriodEnd ?? null : null;

  /** Subscribe or renew: opens the plans and payment pop-up in place (src/components/Onboarding.tsx). */
  const cta = (period: MemberPeriod) =>
    viewer.isMember
      ? { href: `/membership?onboard=renew&period=${period}`, "data-renew": "", "data-period": period, "data-next": "/membership" }
      : { href: `/membership?onboard=pay&period=${period}&next=%2Fbusiness-ideas`, "data-pay": "", "data-period": period, "data-next": "/business-ideas" };

  return (
    // Runs up behind the floating header to the top of the screen (.under-header-pad in globals.css)
    <div className="under-header-pad relative isolate overflow-hidden bg-page">
      {/* Soft colour behind the heading and cards: blurred brand shapes, no images */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px]">
        <div className="absolute -left-24 top-10 h-[420px] w-[520px] rotate-12 rounded-full bg-[#9FE7F5] opacity-60 blur-[90px]" />
        <div className="absolute left-[38%] top-0 h-[360px] w-[300px] -rotate-12 rounded-full bg-[#C8F5C2] opacity-60 blur-[90px]" />
        <div className="absolute -right-24 top-40 h-[460px] w-[520px] -rotate-12 rounded-full bg-[#FFF3B0] opacity-70 blur-[100px]" />
        <div className="absolute -left-32 top-[560px] h-[320px] w-[380px] rounded-full bg-[#FFC9C2] opacity-50 blur-[100px]" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-b from-transparent to-page" />
      </div>

      <div className="container-site flex flex-col gap-16 pb-24 pt-16 sm:pt-20">
        {/* Heading */}
        <section className="mx-auto flex max-w-2xl flex-col items-center gap-5 text-center">
          <h1 className="font-display text-[40px] font-extrabold leading-[1.05] tracking-[-0.04em] text-heading sm:text-[56px]">Simple pricing<br />for every plan.</h1>
          <p className="max-w-xl text-[17px] leading-relaxed text-ink-muted">Anyone can read a preview. One membership opens full budgets, contacts, funding terms and downloads in every directory, for as long as you need it.</p>
          <div className="flex flex-wrap items-center justify-center gap-1 rounded-xl border border-line bg-surface/80 p-1 text-[14px] backdrop-blur">
            <span className="flex items-center gap-1.5 rounded-lg bg-surface px-3.5 py-2 font-semibold text-heading ring-1 ring-line"><Smartphone aria-hidden className="h-4 w-4 text-accent-dark" />MoMo and Airtel Money</span>
            <span className="flex items-center gap-1.5 px-3.5 py-2 text-ink-soft"><CreditCard aria-hidden className="h-4 w-4" />Visa and Mastercard</span>
            {saving ? <span className="rounded-full bg-accent-dark px-2.5 py-1 text-[12px] font-bold text-white">Yearly saves {saving}%</span> : null}
          </div>
          {sandbox ? <span className="text-[12px] font-semibold text-accent-dark">Test mode: test prices, no real money is taken</span> : null}
        </section>

        {/* Member status */}
        {viewer.isMember && !viewer.isStaff ? (
          <div className="mx-auto flex w-full max-w-[1320px] flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-6 py-4">
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white"><Crown aria-hidden className="h-5 w-5" /></span>
              <span className="flex flex-col">
                <span className="font-display text-[16px] font-extrabold text-heading">You&apos;re a member</span>
                <span className="text-[13px] text-ink-muted">{memberUntil ? `Full access until ${date(memberUntil)}. Renewing early adds to your time.` : "Full access, with no end date."}</span>
              </span>
            </span>
            <Link href="/account#membership" className="inline-flex items-center gap-1.5 text-[14px] font-bold text-brand hover:text-brand-dark">My membership <ArrowRight aria-hidden className="h-4 w-4" /></Link>
          </div>
        ) : null}

        {/* Plans. Phones: a swipe carousel showing 1.8 cards (the next one peeks in), running to the screen edges.
            Tablets: two per row; wide screens: four. pt-4 leaves room for the "Most popular" tab above the card. */}
        <section aria-label="Plans" className="-mx-5 -mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-2 pt-4 [scrollbar-width:none] md:mx-auto md:grid md:w-full md:max-w-[1320px] md:snap-none md:grid-cols-2 md:gap-6 md:overflow-visible md:p-0 md:pt-4 xl:grid-cols-4 [&::-webkit-scrollbar]:hidden">
          {PLAN_PERIODS.map((p) => {
            const c = CARDS[p];
            const amount = plan.amounts[p];
            const featured = p === "MONTHLY";
            return (
              <div key={p} className={`relative flex w-[calc((100vw-2rem)/1.8)] shrink-0 snap-start flex-col rounded-2xl bg-surface p-4 md:w-auto md:p-7 ${featured ? "border-[3px] border-accent" : "border border-line"}`}>
                {featured ? <span className="absolute -top-3 right-3 rounded-full bg-accent-dark px-2.5 py-0.5 text-[11px] md:-top-3.5 md:right-6 md:px-3 md:py-1 md:text-[12px] font-bold text-white">Most popular</span> : null}
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h2 className="font-display text-[18px] font-extrabold md:text-[24px] tracking-[-0.02em] text-heading">{c.title}</h2>
                  {p === "YEARLY" && saving ? <span className="rounded-full bg-accent-tint px-2 py-0.5 text-[11px] font-bold text-accent-dark md:text-[12px]">Save {saving}%</span> : null}
                </span>
                <p className="mt-1.5 text-[12px] leading-snug text-ink-muted md:mt-2 md:min-h-[44px] md:text-[15px]">{c.text}</p>
                <p className="mt-4 flex flex-wrap items-baseline gap-x-1.5 md:mt-6 md:gap-x-2">
                  <span className="font-display text-[24px] md:text-[40px] font-extrabold leading-none tracking-[-0.04em] text-heading">{amount ? money(amount, plan.currency) : "Soon"}</span>
                  {amount ? <span className="text-[12px] text-ink-muted md:text-[15px]">/{c.per}</span> : null}
                </p>
                <ul className="mt-4 flex flex-1 flex-col gap-2.5 text-[12px] leading-snug md:mt-6 md:gap-3.5 md:text-[15px] md:leading-normal">
                  {FEATURES.map((f) => {
                    const on = f.on(p);
                    return (
                      <li key={f.label} className={`flex items-start gap-2 md:gap-3 ${on ? "text-heading" : "text-ink-muted"}`}>
                        {on ? <Check aria-label="Included" className="mt-px h-3.5 w-3.5 shrink-0 text-accent-dark md:mt-0.5 md:h-[18px] md:w-[18px]" strokeWidth={2.5} /> : <X aria-label="Not included" className="mt-px h-3.5 w-3.5 shrink-0 text-ink-muted md:mt-0.5 md:h-[18px] md:w-[18px]" />}
                        {f.label}
                      </li>
                    );
                  })}
                </ul>
                {amount && !viewer.isStaff ? (
                  <Link {...cta(p)}
                    className={`mt-5 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg text-[13px] md:mt-8 md:min-h-[50px] md:text-[15px] font-semibold transition ${featured ? "bg-accent-dark text-white hover:bg-accent hover:text-heading" : "border border-line bg-surface text-heading hover:border-heading hover:text-heading"}`}>
                    {viewer.isMember ? "Renew" : c.button} <ArrowRight aria-hidden className="h-4 w-4" />
                  </Link>
                ) : (
                  <span className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-lg border border-line text-center text-[13px] md:mt-8 md:min-h-[50px] md:text-[15px] font-semibold text-ink-muted">{viewer.isStaff ? "Staff see everything" : "Price coming soon"}</span>
                )}
              </div>
            );
          })}
        </section>

        <p className="-mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[13px] text-ink-muted">
          <ShieldCheck aria-hidden className="h-4 w-4 text-brand" />Payments secured by Pesapal. You pay in a pop-up on this page and get access the moment it goes through.
        </p>

        {/* FAQ */}
        <section className="mx-auto flex w-full max-w-3xl flex-col gap-5">
          <h2 className="text-center font-display text-[28px] font-extrabold tracking-[-0.03em] text-heading sm:text-[34px]">Questions</h2>
          <div className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-[16px] font-bold text-heading [&::-webkit-details-marker]:hidden">
                  {q}<span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-page text-accent-dark transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">{a}</p>
              </details>
            ))}
          </div>
          <p className="text-center text-[13px] text-ink-muted">Want your business listed? <Link href="/contact" className="font-bold">Contact our team</Link>.</p>
        </section>
      </div>
    </div>
  );
}
