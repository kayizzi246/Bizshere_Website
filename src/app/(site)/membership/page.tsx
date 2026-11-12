import Link from "next/link";
import { ArrowRight, BookOpen, Calculator, Check, Coins, CreditCard, Crown, Factory, LineChart, Phone, ShieldCheck, Smartphone, Unlock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { PLAN_PERIODS, popupPlan, yearlySaving, type MemberPeriod } from "@/lib/billing";
import { date, money } from "@/lib/format";
import { pesapalSandbox } from "@/lib/payments";
import { getContact, whatsappHref } from "@/lib/site-contact";
import { LeadForm } from "@/components/LeadForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pricing", description: "One membership opens everything: full budgets, contacts, funding terms, prices and downloads. Pay by the day, week, month or year with MoMo, Airtel Money or card." };

/**
 * The pricing page, made as plain as possible (client, 12 Nov 2026: "straight to the point, no second guessing"):
 * what a membership opens is said once, above the plans, because every plan opens the same things. The cards then
 * differ only in what really differs: how long, the price, what that comes to per day, and the reminders. Each
 * card has one button that says exactly what happens ("Pay for 1 month") and opens the payment pop-up in place.
 */
const CARDS: Record<MemberPeriod, { title: string; for: string; per: string; days: number; button: string; extra: string[] }> = {
  DAILY: { title: "1 day", for: "To check one idea or call one supplier today.", per: "day", days: 1, button: "Pay for 1 day", extra: [] },
  WEEKLY: { title: "1 week", for: "To compare a few ideas and call suppliers.", per: "week", days: 7, button: "Pay for 1 week", extra: ["SMS reminder the day before it ends"] },
  MONTHLY: { title: "1 month", for: "To plan and start your business.", per: "month", days: 30, button: "Pay for 1 month", extra: ["SMS reminders 3 days and 1 day before"] },
  YEARLY: { title: "1 year", for: "To run and grow it, at the lowest price.", per: "year", days: 365, button: "Pay for 1 year", extra: ["SMS reminders 3 days and 1 day before", "The lowest price per month"] },
};

/** What every plan opens, said once */
const OPENS: [typeof Unlock, string][] = [
  [BookOpen, "Full business plans and budgets"],
  [Phone, "Supplier and expert phone numbers"],
  [Coins, "Funding amounts, terms and who qualifies"],
  [LineChart, "Market prices and price history"],
  [Factory, "Machine prices and where to buy"],
  [Calculator, "Tools, templates and downloads"],
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
  const [memberPlan, contact, sub] = await Promise.all([
    prisma.membershipPlan.findUnique({ where: { code: "member" } }),
    getContact(),
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
    <div className="bg-page">
      {/* The dark top every page has, with its specks: the heading, what one membership opens, and the three steps */}
      <header className="under-header hero-glow bg-navy text-white">
        <div className="container-site flex flex-col items-center gap-5 pb-28 pt-10 text-center sm:pb-32 sm:pt-14">
          <h1 className="text-hero max-w-3xl text-[28px] leading-[1.12] sm:text-[36px] lg:text-[42px]">One membership opens everything</h1>
          <p className="max-w-xl text-[15px] leading-relaxed text-white/85 sm:text-[16px]">Pick how long you need it. Pay with MoMo, Airtel Money or card, and it all opens straight away.</p>
          <ul aria-label="What a membership opens" className="grid w-full max-w-3xl grid-cols-[minmax(0,1fr)] gap-2 text-left sm:grid-cols-2 lg:grid-cols-3">
            {OPENS.map(([Glyph, label]) => (
              <li key={label} className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-[14px]">
                <Glyph aria-hidden className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} />{label}
              </li>
            ))}
          </ul>
          {sandbox ? <span className="text-[12px] font-semibold text-accent">Test mode: test prices, no real money is taken</span> : null}
        </div>
      </header>

      <div className="container-site flex flex-col gap-14 pb-20">
        {/* Member status */}
        {viewer.isMember && !viewer.isStaff ? (
          <div className="relative z-10 -mt-24 -mb-6 flex w-full flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface px-5 py-4 sm:-mt-28">
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-white"><Crown aria-hidden className="h-5 w-5" /></span>
              <span className="flex flex-col">
                <span className="font-display text-[16px] font-extrabold text-heading">You&apos;re a member</span>
                <span className="text-[13px] text-ink-muted">{memberUntil ? `Full access until ${date(memberUntil)}. Renewing early adds to your time.` : "Full access, with no end date."}</span>
              </span>
            </span>
            <Link href="/account#membership" className="inline-flex items-center gap-1.5 text-[14px] font-bold text-brand hover:text-brand-dark">My membership <ArrowRight aria-hidden className="h-4 w-4" /></Link>
          </div>
        ) : null}

        {/* The plans, over the bottom of the dark top. Phones: one under the other, the recommended one first. */}
        <section aria-label="Plans" className={`relative z-10 grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-4 ${viewer.isMember && !viewer.isStaff ? "" : "-mt-20 sm:-mt-24"}`}>
          {PLAN_PERIODS.map((p) => {
            const c = CARDS[p];
            const amount = plan.amounts[p];
            const featured = p === "MONTHLY";
            const perDay = amount && c.days > 1 ? Math.round(amount / c.days) : null;
            return (
              <div key={p} className={`relative flex flex-col rounded-xl bg-surface p-5 sm:p-6 ${featured ? "order-first border-2 border-accent md:order-none" : "border border-line"}`}>
                <span className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-[20px] font-extrabold text-heading sm:text-[22px]">{c.title}</h2>
                  {featured ? <span className="rounded-full bg-accent-dark px-2.5 py-0.5 text-[12px] font-bold text-white">Recommended</span> : null}
                  {p === "YEARLY" && saving ? <span className="rounded-full bg-accent-tint px-2.5 py-0.5 text-[12px] font-bold text-accent-dark">Save {saving}%</span> : null}
                </span>
                <p className="mt-1 text-[14px] leading-snug text-ink-muted md:min-h-[40px]">{c.for}</p>
                <p className="mt-5 flex flex-wrap items-baseline gap-x-1.5">
                  <span className="text-hero whitespace-nowrap text-[30px] leading-none text-heading sm:text-[34px] xl:text-[27px] 2xl:text-[32px]">{amount ? money(amount, plan.currency) : "Soon"}</span>
                  {amount ? <span className="whitespace-nowrap text-[14px] text-ink-muted">/ {c.per}</span> : null}
                </p>
                <p className="mt-1.5 min-h-[20px] text-[13px] text-ink-muted">{perDay ? `That is ${money(perDay, plan.currency)} a day` : amount ? "Everything, for today" : ""}</p>
                <ul className="mt-4 flex flex-1 flex-col gap-2 border-t border-line pt-4 text-[14px] leading-snug text-heading">
                  <li className="flex items-start gap-2"><Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent-dark" strokeWidth={2.5} />Everything above, for {c.title}</li>
                  {c.extra.map((x) => <li key={x} className="flex items-start gap-2"><Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent-dark" strokeWidth={2.5} />{x}</li>)}
                </ul>
                {amount && !viewer.isStaff ? (
                  <Link {...cta(p)}
                    className={`mt-5 inline-flex min-h-[50px] items-center justify-center gap-2 rounded-lg text-[15px] font-bold transition ${featured ? "bg-accent-dark text-white hover:bg-accent hover:text-heading" : "bg-navy text-white hover:bg-brand-dark hover:text-white"}`}>
                    {viewer.isMember ? `Renew for ${c.title}` : c.button} <ArrowRight aria-hidden className="h-4 w-4" />
                  </Link>
                ) : (
                  <span className="mt-5 inline-flex min-h-[50px] items-center justify-center rounded-lg border border-line text-center text-[15px] font-semibold text-ink-muted">{viewer.isStaff ? "Staff see everything" : "Price coming soon"}</span>
                )}
              </div>
            );
          })}
        </section>

        {/* How it works, in three steps, and how to pay */}
        <section aria-label="How it works" className="-mt-4 flex flex-col gap-5">
          <ol className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
            {STEPS.map(([t, x], i) => (
              <li key={t} className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand font-display text-[14px] font-extrabold text-white">{i + 1}</span>
                <span className="flex flex-col"><span className="font-display text-[15px] font-bold text-heading">{t}</span><span className="text-[13px] text-ink-muted">{x}</span></span>
              </li>
            ))}
          </ol>
          <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center text-[13px] text-ink-muted">
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
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-[16px] font-bold text-heading [&::-webkit-details-marker]:hidden">
                  {q}<span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-page text-accent-dark transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">{a}</p>
              </details>
            ))}
          </div>
          <p className="text-center text-[13px] text-ink-muted">Want your business listed? <Link href="/suppliers/join" className="font-bold">Become a supplier</Link> or <Link href="/experts/join" className="font-bold">an expert</Link>.</p>
        </section>

        {/* Not ready to pay online? A person calls them back: the lead lands in Admin > Leads. */}
        {!viewer.isMember ? (
          <section className="mx-auto grid w-full max-w-5xl items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <div className="flex flex-col gap-3">
              <h2 className="text-section-title text-heading">Rather talk to a person?</h2>
              <p className="text-[15px] leading-relaxed text-ink-muted">Not sure which plan, or want help paying by mobile money? Leave your number and we call you back, usually within the hour during working hours.{contact.whatsapp ? " Or WhatsApp us now." : ""}</p>
            </div>
            <LeadForm compact interest="membership" whatsapp={contact.whatsapp ? whatsappHref(contact.whatsapp, "Hello BizSphere-Ug, I have a question about membership.") : null} />
          </section>
        ) : null}
      </div>
    </div>
  );
}
