import Link from "next/link";
import type { BillingPeriod } from "@prisma/client";
import { ArrowRight, BellRing, Check, CreditCard, Crown, LockKeyhole, Minus, ShieldCheck, Smartphone, Sparkles, Zap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { popupPlan, yearlySaving } from "@/lib/billing";
import { date, money } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pricing", description: "Browse free. Members get full budgets, contacts, funding terms and downloads, by the day, month or year." };

const MEMBER_FEATURES = ["Full business plans and start-up budgets", "Supplier and expert contacts", "Full funding terms and deadline alerts", "Price history, machine prices and downloads", "Every directory, one membership"];

const CARDS: { period: BillingPeriod; title: string; tagline: string; per: string; extra: string }[] = [
  { period: "DAILY", title: "Day pass", tagline: "Research one idea in a day", per: "day", extra: "24 hours of full access" },
  { period: "MONTHLY", title: "Monthly", tagline: "For planning and starting up", per: "month", extra: "Reminder before every renewal" },
  { period: "YEARLY", title: "Yearly", tagline: "For running and growing", per: "year", extra: "One payment, twelve months" },
];

const COMPARE: [string, boolean, boolean][] = [
  ["Search every directory", true, true],
  ["Previews of every page", true, true],
  ["Wishlist and collections", true, true],
  ["Full start-up budgets, line by line", false, true],
  ["Every step of each business plan", false, true],
  ["Supplier and expert phone numbers", false, true],
  ["Funding amounts, terms and deadline alerts", false, true],
  ["Price history and machine prices", false, true],
  ["Tools, templates and PDF downloads", false, true],
];

const FAQ: [string, string][] = [
  ["How do I pay?", "Tap a plan and pay in the pop-up with MTN MoMo, Airtel Money or a Visa or Mastercard card. Payments are processed securely by Pesapal; you never leave the page."],
  ["When do I get access?", "The moment the payment goes through. For mobile money, approve the prompt on your phone with your PIN and everything opens by itself."],
  ["How does renewal work?", "We send you an SMS (or an email, if you signed up with one) 3 days and 1 day before your membership ends, with a link to renew. Renewing early adds the new time to what you have left."],
  ["Can I cancel?", "Yes. Turn renewal reminders off on your account page and your membership simply ends on its date. Nothing is charged without you approving it."],
  ["Is the day pass worth it?", "If you're comparing one or two ideas, yes: 24 hours is enough to read the full budgets, call suppliers and download the plans."],
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
  const sandbox = process.env.PESAPAL_ENV === "sandbox" || process.env.PAYMENT_SIMULATE === "true";
  const memberUntil = viewer.isMember ? sub?.currentPeriodEnd ?? null : null;

  /** Subscribe or renew: opens the plans and payment pop-up in place (src/components/Onboarding.tsx). */
  const cta = (period: BillingPeriod) =>
    viewer.isMember
      ? { href: `/membership?onboard=renew&period=${period}`, "data-renew": "", "data-period": period, "data-next": "/membership" }
      : { href: `/membership?onboard=pay&period=${period}&next=%2Fbusiness-ideas`, "data-pay": "", "data-period": period, "data-next": "/business-ideas" };

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_80%_0%,rgba(21,126,194,0.55),transparent_60%),radial-gradient(40%_60%_at_0%_100%,rgba(242,140,40,0.22),transparent_60%)]" />
        <div className="container-site relative flex flex-col items-center gap-5 pb-40 pt-16 text-center sm:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[13px] font-semibold text-white/85 ring-1 ring-white/15"><Sparkles aria-hidden className="h-4 w-4 text-accent" />Pricing</span>
          <h1 className="max-w-3xl font-display text-[38px] font-extrabold leading-[1.04] tracking-[-0.035em] sm:text-[54px]">Know the real cost before you start.</h1>
          <p className="max-w-2xl text-[17px] leading-relaxed text-white/75">Browse every directory for free. Become a member to open full budgets, contacts, funding terms and downloads, by the day, the month or the year.</p>
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-[13px] text-white/70">
            <li className="flex items-center gap-1.5"><Smartphone aria-hidden className="h-4 w-4 text-accent" />MoMo and Airtel Money</li>
            <li className="flex items-center gap-1.5"><CreditCard aria-hidden className="h-4 w-4 text-accent" />Visa and Mastercard</li>
            <li className="flex items-center gap-1.5"><BellRing aria-hidden className="h-4 w-4 text-accent" />Reminder before renewal</li>
            <li className="flex items-center gap-1.5"><ShieldCheck aria-hidden className="h-4 w-4 text-accent" />Secured by Pesapal</li>
          </ul>
          {sandbox ? <span className="rounded-full bg-accent px-3 py-1 text-[12px] font-bold text-heading">Test mode: test prices, no real money is taken</span> : null}
        </div>
      </section>

      <div className="container-site relative -mt-28 flex flex-col gap-16 pb-20">
        {/* Member status */}
        {viewer.isMember && !viewer.isStaff ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand/30 bg-surface px-6 py-4 shadow-[0_12px_32px_rgba(7,26,51,0.10)]">
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

        {/* Plans */}
        <section aria-label="Plans" className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-5 rounded-[24px] border border-line bg-surface p-7 shadow-[0_12px_32px_rgba(7,26,51,0.06)]">
            <div className="flex flex-col gap-1">
              <span className="font-display text-[18px] font-extrabold text-heading">Free</span>
              <span className="text-[13px] text-ink-muted">Look around first</span>
            </div>
            <div className="flex items-baseline gap-1.5"><span className="font-display text-[40px] font-extrabold tracking-[-0.03em] text-heading">UGX 0</span><span className="text-[14px] text-ink-muted">forever</span></div>
            {viewer.userId ? (
              <span className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-line text-[15px] font-semibold text-ink-muted">{viewer.isMember ? "Included" : "Your current plan"}</span>
            ) : (
              <Link href="/signup" className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-line-strong text-[15px] font-bold text-heading hover:border-brand hover:text-brand">Create free account</Link>
            )}
            <ul className="flex flex-col gap-2.5 border-t border-line pt-5 text-[14px] text-ink-soft">
              {COMPARE.filter(([, free]) => free).map(([f]) => <li key={f} className="flex gap-2.5"><Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand" />{f}</li>)}
            </ul>
          </div>

          {CARDS.map((c) => {
            const amount = plan.amounts[c.period];
            const featured = c.period === "MONTHLY";
            const badge = featured ? "Most popular" : c.period === "YEARLY" && saving ? `Save ${saving}%` : null;
            const monthlyEquivalent = c.period === "YEARLY" && amount ? money(Math.round(amount / 12), plan.currency) : null;
            return (
              <div key={c.period} className={`relative flex flex-col gap-5 rounded-[24px] p-7 ${featured ? "bg-[linear-gradient(160deg,#0E5E94,#157EC2_55%,#1B8FD8)] text-white shadow-[0_24px_60px_rgba(21,126,194,0.35)] ring-1 ring-white/10 xl:-my-3 xl:py-10" : "border border-line bg-surface shadow-[0_12px_32px_rgba(7,26,51,0.06)]"}`}>
                {badge ? (
                  <span className={`absolute right-5 top-5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${featured ? "bg-accent text-heading" : "bg-accent-tint text-accent-dark"}`}>
                    {featured ? <Zap aria-hidden className="h-3 w-3" /> : null}{badge}
                  </span>
                ) : null}
                <div className="flex flex-col gap-1">
                  <span className={`font-display text-[18px] font-extrabold ${featured ? "" : "text-heading"}`}>{c.title}</span>
                  <span className={`text-[13px] ${featured ? "text-white/75" : "text-ink-muted"}`}>{c.tagline}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="flex flex-wrap items-baseline gap-1.5">
                    <span className={`font-display text-[40px] font-extrabold tracking-[-0.03em] ${featured ? "" : "text-heading"}`}>{amount ? money(amount, plan.currency) : "Soon"}</span>
                    {amount ? <span className={`text-[14px] ${featured ? "text-white/75" : "text-ink-muted"}`}>/ {c.per}</span> : null}
                  </span>
                  <span className={`text-[12px] ${featured ? "text-white/70" : "text-ink-muted"}`}>{monthlyEquivalent ? `That's ${monthlyEquivalent} a month` : c.extra}</span>
                </div>
                {amount && !viewer.isStaff ? (
                  <Link {...cta(c.period)}
                    className={`group inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full text-[15px] font-bold transition ${featured ? "bg-white text-heading hover:bg-brand-tint hover:text-heading" : "bg-brand text-white hover:bg-brand-dark hover:text-white"}`}>
                    {viewer.isMember ? "Renew with this plan" : c.period === "DAILY" ? "Get a day pass" : "Subscribe"}
                    <ArrowRight aria-hidden className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </Link>
                ) : (
                  <span className={`inline-flex min-h-[48px] items-center justify-center rounded-full text-[15px] font-semibold ${featured ? "bg-white/15 text-white/80" : "border border-line text-ink-muted"}`}>{viewer.isStaff ? "Staff see everything" : "Price coming soon"}</span>
                )}
                <ul className={`flex flex-col gap-2.5 border-t pt-5 text-[14px] ${featured ? "border-white/15 text-white/85" : "border-line text-ink-soft"}`}>
                  {MEMBER_FEATURES.map((f) => <li key={f} className="flex gap-2.5"><Check aria-hidden className={`mt-0.5 h-4 w-4 shrink-0 ${featured ? "text-accent" : "text-brand"}`} />{f}</li>)}
                </ul>
              </div>
            );
          })}
        </section>

        {/* How paying works */}
        <section className="grid gap-4 md:grid-cols-3">
          {[
            [Sparkles, "1. Pick a plan", "Day, month or year. Every plan opens every directory."],
            [LockKeyhole, "2. Pay in the pop-up", "MoMo, Airtel Money or card, on Pesapal's secure page, without leaving the site."],
            [BellRing, "3. In at once, reminded later", "Access opens the moment you pay. We text or email you before it renews."],
          ].map(([I, title, text]) => {
            const Icon = I as typeof Sparkles;
            return (
              <div key={title as string} className="flex gap-4 rounded-2xl bg-page p-6">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface text-brand shadow-sm"><Icon aria-hidden className="h-5 w-5" /></span>
                <span className="flex flex-col gap-1"><span className="font-display text-[16px] font-extrabold text-heading">{title as string}</span><span className="text-[14px] text-ink-muted">{text as string}</span></span>
              </div>
            );
          })}
        </section>

        {/* Comparison */}
        <section className="flex flex-col gap-5">
          <h2 className="text-center font-display text-[28px] font-extrabold tracking-[-0.03em] text-heading sm:text-[34px]">Free and member, side by side</h2>
          <div className="overflow-hidden rounded-[20px] border border-line bg-surface">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="bg-page">
                  <th className="px-5 py-4 font-semibold text-ink-muted">What you get</th>
                  <th className="w-24 px-3 py-4 text-center font-display font-extrabold text-heading sm:w-36">Free</th>
                  <th className="w-24 px-3 py-4 text-center font-display font-extrabold text-brand sm:w-36">Member</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(([f, free, member]) => (
                  <tr key={f} className="border-t border-line">
                    <td className="px-5 py-3.5 text-ink-soft">{f}</td>
                    {[free, member].map((on, n) => (
                      <td key={n} className="px-3 py-3.5 text-center">
                        {on ? <Check aria-label="Included" className={`mx-auto h-5 w-5 ${n ? "text-brand" : "text-ink-soft"}`} /> : <Minus aria-label="Not included" className="mx-auto h-5 w-5 text-line-strong" />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto flex w-full max-w-3xl flex-col gap-5">
          <h2 className="text-center font-display text-[28px] font-extrabold tracking-[-0.03em] text-heading sm:text-[34px]">Questions</h2>
          <div className="flex flex-col divide-y divide-line rounded-[20px] border border-line bg-surface">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-[16px] font-bold text-heading [&::-webkit-details-marker]:hidden">
                  {q}<span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-page text-brand transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Closing call to action */}
        <section className="relative overflow-hidden rounded-[28px] bg-navy px-7 py-12 text-center text-white sm:px-12">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_90%_at_50%_0%,rgba(21,126,194,0.5),transparent_70%)]" />
          <div className="relative flex flex-col items-center gap-4">
            <h2 className="max-w-2xl font-display text-[28px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[36px]">{viewer.isMember ? "Thanks for being a member." : "Start with the full picture."}</h2>
            <p className="max-w-xl text-[15px] text-white/75">{viewer.isMember ? "Keep going: every budget, contact and funding term is open to you." : `Monthly membership${plan.monthly && plan.amounts.MONTHLY ? ` is ${plan.monthly}` : ""}. Pay with MoMo, Airtel Money or card.`}</p>
            {viewer.isMember ? (
              <Link href="/business-ideas" className="inline-flex min-h-[50px] items-center gap-2 rounded-full bg-white px-6 text-[15px] font-bold text-heading hover:bg-brand-tint hover:text-heading">Browse business ideas <ArrowRight aria-hidden className="h-4 w-4" /></Link>
            ) : plan.amounts.MONTHLY ? (
              <Link {...cta("MONTHLY")} className="inline-flex min-h-[50px] items-center gap-2 rounded-full bg-white px-6 text-[15px] font-bold text-heading hover:bg-brand-tint hover:text-heading">Become a member <ArrowRight aria-hidden className="h-4 w-4" /></Link>
            ) : null}
            <p className="text-[13px] text-white/60">Want your business listed? <Link href="/contact" className="font-bold text-white underline">Contact our team</Link>.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
