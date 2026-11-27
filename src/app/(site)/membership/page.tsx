import Link from "next/link";
import { ArrowRight, Check, CreditCard, Crown, ShieldCheck, Smartphone, Ticket, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { PLAN_PERIODS, popupPlan, yearlySaving, type MemberPeriod } from "@/lib/billing";
import { date, money } from "@/lib/format";
import { pesapalSandbox } from "@/lib/payments";
import { getContact, whatsappHref } from "@/lib/site-contact";
import { LeadForm } from "@/components/LeadForm";
import { referralDays } from "@/lib/referrals";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pricing", description: "One membership opens everything: full budgets, contacts, funding terms, prices and downloads. Pay by the day, week, month or year with MoMo, Airtel Money or card." };

/**
 * The pricing page, made as plain as possible (client, 12 Nov 2026: "straight to the point, no second guessing"):
 * every card lists what a membership opens, the same on each, because every plan opens the same things. The cards
 * differ only in what really differs: how long, the price, what that comes to per day, and the reminders. Each
 * card has one button that says exactly what happens ("Pay for 1 month") and opens the payment pop-up in place.
 */
const CARDS: Record<MemberPeriod, { title: string; for: string; per: string; days: number; button: string; extra: string[] }> = {
  DAILY: { title: "1 day", for: "To check one idea or call one supplier today.", per: "day", days: 1, button: "Pay for 1 day", extra: [] },
  WEEKLY: { title: "1 week", for: "To compare a few ideas and call suppliers.", per: "week", days: 7, button: "Pay for 1 week", extra: ["SMS reminder the day before it ends"] },
  MONTHLY: { title: "1 month", for: "To plan and start your business.", per: "month", days: 30, button: "Pay for 1 month", extra: ["SMS reminders 3 days and 1 day before"] },
  YEARLY: { title: "1 year", for: "To run and grow it, at the lowest price.", per: "year", days: 365, button: "Pay for 1 year", extra: ["SMS reminders 3 days and 1 day before", "The lowest price per month"] },
};

/** What every plan opens, listed on each card */
const OPENS: string[] = [
  "Full business plans and budgets",
  "Supplier and expert phone numbers",
  "Funding amounts, terms and who qualifies",
  "Market prices and price history",
  "Machine prices and where to buy",
  "Tools, templates and downloads",
];

const STEPS: [string, string][] = [
  ["Pick how long", "A day, a week, a month or a year."],
  ["Pay on your phone", "MTN MoMo, Airtel Money or card, right here."],
  ["Everything opens", "The moment it goes through. No waiting."],
];

const FAQ: [string, string][] = [
  ["How do I pay?", "Tap a plan and pay in the pop-up with MTN MoMo, Airtel Money or a Visa or Mastercard card. Approve the prompt on your phone with your PIN. You never leave the page."],
  ["When do I get access?", "The moment the payment goes through. Everything opens by itself; there is nothing to wait for."],
  ["Is it the same for every plan?", "Yes. Every plan opens everything. Only the length and the price differ."],
  ["Does it renew by itself?", "No. Nothing is charged without you approving it. We send you an SMS before it ends with a link to renew; renewing early adds the new time to what you have left."],
  ["What can I see without paying?", "A preview of every page: the first lines of each budget and plan, and the names of suppliers and funders. A membership opens the rest."],
];

export default async function MembershipPage() {
  const viewer = await getViewer();
  const [memberPlan, contact, sub, inviteDays] = await Promise.all([
    prisma.membershipPlan.findUnique({ where: { code: "member" } }),
    getContact(),
    viewer.userId && !viewer.isStaff
      ? prisma.subscription.findFirst({ where: { userId: viewer.userId, status: "ACTIVE", plan: { code: "member" } }, orderBy: { currentPeriodEnd: { sort: "desc", nulls: "first" } } })
      : null,
    // The invite reward, switched on and off in Admin > Offers and codes.
    referralDays(),
  ]);
  const invite = { days: inviteDays };
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
    // A warm off-white page with no dark band (client, 24 Nov 2026, after a pricing page they sent): the heading,
    // then flat cards with the price large, a pill button, a dashed line and what it opens.
    <div className="under-header bg-[#F7F8F3]">
      <header className="container-site flex flex-col items-center gap-4 pb-10 pt-10 text-center sm:pb-10 sm:pt-10">
        <h1 className="text-hero max-w-3xl text-[25px] leading-[1.12] text-heading sm:text-[32px] lg:text-[37px]">One membership opens everything</h1>
        <p data-size="" className="max-w-xl text-[14px] leading-relaxed text-ink-muted sm:text-[15px]">Pick how long you need it. Pay with MoMo, Airtel Money or card, and it all opens straight away.</p>
        {sandbox ? <span className="text-[12px] font-semibold text-accent-dark">Test mode: test prices, no real money is taken</span> : null}
      </header>

      <div className="container-site flex flex-col gap-14 pb-14">
        {/* Member status */}
        {viewer.isMember && !viewer.isStaff ? (
          <div className="-mb-6 flex w-full flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface px-5 py-4">
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-white"><Crown aria-hidden className="h-5 w-5" /></span>
              <span className="flex flex-col">
                <span className="font-display text-[15px] font-extrabold text-heading">You&apos;re a member</span>
                <span className="text-[12.5px] text-ink-muted">{memberUntil ? `Full access until ${date(memberUntil)}. Renewing early adds to your time.` : "Full access, with no end date."}</span>
              </span>
            </span>
            <Link href="/account#membership" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-brand hover:text-brand-dark">My membership <ArrowRight aria-hidden className="h-4 w-4" /></Link>
          </div>
        ) : null}

        {/* The plans. Phones: a row to swipe sideways, one card at a time with the next one peeking in, the recommended
            one first (client, 24 Nov 2026). It runs to the screen's edges: -mx-5 undoes the page's own margin. */}
        <section aria-label="Plans" tabIndex={0} className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto overscroll-x-contain px-5 pb-2 [scrollbar-width:none] sm:-mx-8 sm:scroll-px-8 sm:px-8 md:mx-0 md:grid md:snap-none md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-4 xl:gap-5 [&::-webkit-scrollbar]:hidden">
          {PLAN_PERIODS.map((p) => {
            const c = CARDS[p];
            const amount = plan.amounts[p];
            const featured = p === "MONTHLY";
            const perDay = amount && c.days > 1 ? Math.round(amount / c.days) : null;
            const pill = "mt-6 inline-flex min-h-[46px] w-full items-center justify-center rounded-full border px-5 text-[14px] font-medium transition-colors";
            return (
              <div key={p} className={`flex w-[82%] max-w-[320px] shrink-0 snap-start flex-col rounded-lg border bg-[#F0EFEA] p-6 md:w-auto md:max-w-none ${featured ? "order-first border-[#C9C7BD] md:order-none" : "border-line"}`}>
                <div className="flex min-h-[26px] flex-wrap items-center gap-2">
                  <h2 data-soft="" className="text-[17px] text-heading">{c.title}</h2>
                  {featured ? <span className="rounded-full bg-[#1F7A4D] px-2.5 py-0.5 text-[12px] font-medium text-white">Recommended</span> : null}
                  {p === "YEARLY" && saving ? <span className="rounded-full bg-accent-tint px-2.5 py-0.5 text-[12px] font-medium text-accent-dark">Save {saving}%</span> : null}
                </div>
                <p data-size="" className="mt-2 text-[13px] leading-snug text-ink-muted md:min-h-[40px]">{c.for}</p>
                <p className="mt-6 flex flex-wrap items-baseline gap-x-1.5">
                  <span className="whitespace-nowrap text-[26px] font-semibold leading-none tracking-[-0.03em] text-heading xl:text-[24px] 2xl:text-[28px]">{amount ? money(amount, plan.currency) : "Soon"}</span>
                  {amount ? <span className="whitespace-nowrap text-[13px] text-ink-muted">/ {c.per}</span> : null}
                </p>
                <p data-size="" className="mt-2.5 min-h-[20px] text-[13px] text-ink-muted">{perDay ? `That is ${money(perDay, plan.currency)} a day` : amount ? "Everything, for today" : ""}</p>
                {amount && !viewer.isStaff ? (
                  <Link {...cta(p)} className={`${pill} ${featured ? "border-[#26251F] bg-[#26251F] text-white hover:bg-black hover:text-white" : "border-[#D6D4CA] text-heading hover:border-[#26251F] hover:bg-white hover:text-heading"}`}>
                    {viewer.isMember ? `Renew for ${c.title}` : c.button}
                  </Link>
                ) : (
                  <span className={`${pill} border-[#D6D4CA] text-ink-muted`}>{viewer.isStaff ? "Staff see everything" : "Price coming soon"}</span>
                )}
                <p data-size="" className="mt-6 border-t border-dashed border-[#D6D4CA] pt-5 text-[12.5px] font-medium text-ink-muted">Everything opens for {c.title}</p>
                <ul className="mt-3 flex flex-col gap-2.5 text-[13px] leading-snug text-[#3B3A34]">
                  {[...OPENS, ...c.extra].map((x) => <li key={x} className="flex items-start gap-2.5"><Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-heading" strokeWidth={1.75} />{x}</li>)}
                </ul>
              </div>
            );
          })}
        </section>

        {/* Two ways in that cost nothing to say here and bring payments in (18 Nov 2026): the
            invite reward, and a discount code for anyone who has one. */}
        {!viewer.isMember && !viewer.isStaff ? (
          <section aria-label="Other ways to start" className="-mt-6 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
            {invite.days ? (
              <div className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-4">
                <span className="flex items-center gap-2 font-display text-[14px] font-bold text-heading"><Users aria-hidden className="h-4 w-4 text-brand" />Invite a friend</span>
                <span className="text-[12.5px] text-ink-muted">When they pay, {invite.days} free days are added to your membership and {invite.days} to theirs. Your link is in <Link href="/account#invite" className="font-semibold">your account</Link>.</span>
              </div>
            ) : null}
            <div className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-4">
              <span className="flex items-center gap-2 font-display text-[14px] font-bold text-heading"><Ticket aria-hidden className="h-4 w-4 text-brand" />Have a discount code?</span>
              <span className="text-[12.5px] text-ink-muted">Type it in the payment pop-up before you pay and the price changes there and then.</span>
            </div>
          </section>
        ) : null}

        {/* How it works, in three steps, and how to pay */}
        <section aria-label="How it works" className="-mt-4 flex flex-col gap-5">
          <ol className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
            {STEPS.map(([t, x], i) => (
              <li key={t} className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand font-display text-[13px] font-extrabold text-white">{i + 1}</span>
                <span className="flex flex-col"><span className="font-display text-[14px] font-bold text-heading">{t}</span><span className="text-[12.5px] text-ink-muted">{x}</span></span>
              </li>
            ))}
          </ol>
          <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center text-[12.5px] text-ink-muted">
            <span className="inline-flex items-center gap-1.5"><Smartphone aria-hidden className="h-4 w-4 text-accent-dark" />MTN MoMo and Airtel Money</span>
            <span className="inline-flex items-center gap-1.5"><CreditCard aria-hidden className="h-4 w-4 text-brand" />Visa and Mastercard</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck aria-hidden className="h-4 w-4 text-brand" />Secured by Pesapal</span>
            <span className="inline-flex items-center gap-1.5"><Check aria-hidden className="h-4 w-4 text-brand" strokeWidth={2.5} />Never renews without you</span>
          </p>
        </section>

        {/* FAQ */}
        <section className="mx-auto flex w-full max-w-3xl flex-col gap-5">
          <h2 className="text-section-title text-center text-heading">Questions</h2>
          <div className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group px-5 py-4 sm:px-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-[15px] font-bold text-heading [&::-webkit-details-marker]:hidden">
                  {q}<span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-page text-accent-dark transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">{a}</p>
              </details>
            ))}
          </div>
          <p className="text-center text-[12.5px] text-ink-muted">Want your business listed? <Link href="/suppliers/join" className="font-bold">Become a supplier</Link> or <Link href="/experts/join" className="font-bold">an expert</Link>.</p>
        </section>

        {/* Not ready to pay online? A person calls them back: the lead lands in Admin > Leads. */}
        {!viewer.isMember ? (
          <section className="mx-auto grid w-full max-w-5xl items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <div className="flex flex-col gap-3">
              <h2 className="text-section-title text-heading">Rather talk to a person?</h2>
              <p className="text-[14px] leading-relaxed text-ink-muted">Not sure which plan, or want help paying by mobile money? Leave your number and we call you back, usually within the hour during working hours.{contact.whatsapp ? " Or WhatsApp us now." : ""}</p>
            </div>
            <LeadForm compact interest="membership" whatsapp={contact.whatsapp ? whatsappHref(contact.whatsapp, "Hello BizSphere-Ug, I have a question about membership.") : null} />
          </section>
        ) : null}
      </div>
    </div>
  );
}
