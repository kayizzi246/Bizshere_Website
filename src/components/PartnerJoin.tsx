import Link from "next/link";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import type { BillingPeriod } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERIOD_INFO, PLAN_PERIODS, PRICE_FIELD, yearlySaving } from "@/lib/billing";
import { money } from "@/lib/format";
import { PARTNER_INFO, partnerAccess, partnerOf, partnerPlan, type PartnerKind } from "@/lib/partners";
import { registerPartner } from "@/app/actions/partners";
import { PartnerPay } from "./PartnerPay";
import { PhoneAuthCard } from "./PhoneAuthCard";

const WORDS: Record<PartnerKind, { tag: string; lead: string; key: string; intro: string; gets: string[]; name: string; what: string; whatHint: string }> = {
  supplier: {
    tag: "For suppliers", lead: "Become a", key: "Supplier", intro: "Get your business in front of buyers across Uganda.",
    gets: ["Your own page with your photo", "Add your products and prices", "Your own dashboard to keep it up to date"],
    name: "Business name", what: "What do you sell?", whatHint: "Separate items with commas, e.g. flour, ovens, packaging",
  },
  expert: {
    tag: "For experts", lead: "Become an", key: "Expert", intro: "Get found by businesses that need your help.",
    gets: ["Your own profile page", "Show your work and your links", "Reviews from your clients"],
    name: "Your full name", what: "What do you help with?", whatHint: "Separate areas with commas, e.g. tax, accounting, export",
  },
};

const ERRORS: Record<string, string> = {
  details: "Please check your details and fill in every box.",
  pin: "Enter the same 4-digit PIN twice.",
  phone: "This account has no phone number. Sign out and continue with your phone.",
  staff: "Staff accounts can't register here. Use your business's own phone.",
  busy: "Too many tries. Please wait a few minutes and try again.",
};

/** The prices the team has set, in order. A price of 0 or none can't be paid for, so it isn't offered. */
function planOptions(plan: Awaited<ReturnType<typeof partnerPlan>>) {
  return PLAN_PERIODS.flatMap((p) => {
    const v = plan[PRICE_FIELD[p]];
    return v !== null && Number(v) > 0 ? [{ period: p, label: PERIOD_INFO[p].label, per: PERIOD_INFO[p].per, price: money(v, plan.currency) }] : [];
  });
}

/**
 * /suppliers/join and /experts/join. A navy hero with what you get beside the current step (confirm
 * your phone, enter your details, pay), then the pricing. The step comes from the server, so a person
 * who leaves and comes back carries on where they stopped. Once paid it goes on to their dashboard.
 */
export async function PartnerJoin({ kind, error }: { kind: PartnerKind; error?: string }) {
  const w = WORDS[kind];
  const info = PARTNER_INFO[kind];
  const session = await getSession();
  const userId = session?.user?.id ?? null;
  const [plan, partner, access, user] = await Promise.all([
    partnerPlan(kind),
    userId ? partnerOf(userId, kind) : null,
    userId ? partnerAccess(userId, kind) : null,
    userId ? prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } }) : null,
  ]);
  if (partner && access && !access.mustPay) redirect(info.portal);
  const options = planOptions(plan);
  const saving = yearlySaving(Object.fromEntries(PLAN_PERIODS.map((p) => [p, plan[PRICE_FIELD[p]] === null ? null : Number(plan[PRICE_FIELD[p]])])) as Record<BillingPeriod, number | null>);
  const step = !userId ? 1 : !partner ? 2 : 3;

  return (
    <>
      <section className="under-header hero-glow hero-still bg-navy text-white">
        <div className="container-site grid grid-cols-[minmax(0,1fr)] gap-8 pb-10 pt-8 sm:pb-14 sm:pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-14">
          <div className="flex flex-col items-start gap-4 lg:pt-6">
            <span className="rounded-full bg-white/10 px-3 py-1 text-[12px] font-bold text-white/90 ring-1 ring-white/15">{w.tag}</span>
            <h1 className="text-hero text-[34px] leading-[1.05] sm:text-[52px]">{w.lead} <span className="text-accent">{w.key}</span></h1>
            <p className="max-w-md text-[16px] leading-relaxed text-white/80 sm:text-[18px]">{w.intro}</p>
            <ul className="flex flex-col gap-2.5">
              {w.gets.map((t) => (
                <li key={t} className="flex items-center gap-2.5 text-[15px] font-medium text-white/90">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-ink"><Check aria-hidden className="h-3.5 w-3.5" strokeWidth={3} /></span>{t}
                </li>
              ))}
            </ul>
            <p className="text-[14px] text-white/70">Already registered? <Link href={info.login} className="font-bold text-accent hover:text-white">Sign in</Link></p>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <ol aria-label="Steps" className="flex items-center gap-2">
              {["Your phone", "Your details", "Pay"].map((t, i) => {
                const n = i + 1;
                return (
                  <li key={t} aria-current={step === n ? "step" : undefined} className="flex min-w-0 flex-1 items-center gap-2">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${step === n ? "bg-accent text-ink" : step > n ? "bg-white text-brand" : "bg-white/10 text-white/70 ring-1 ring-white/20"}`}>{step > n ? <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={3} /> : n}</span>
                    <span className={`truncate text-[13px] font-semibold ${step === n ? "text-white" : "text-white/65"}`}>{t}</span>
                  </li>
                );
              })}
            </ol>

            <div className="text-ink">
              {step === 1 ? <PhoneAuthCard title="Confirm your phone" googleEnabled={false} redirectTo={info.join} /> : null}

              {step === 2 ? (
                <form action={registerPartner} className="flex flex-col gap-3 rounded-3xl bg-white p-5 sm:p-6">
                  <input type="hidden" name="kind" value={kind} />
                  <h2 className="font-display text-[20px] font-extrabold text-heading">Your details</h2>
                  {error ? <p role="alert" className="rounded-lg bg-bad-bg px-3 py-2 text-[14px] font-semibold text-bad-fg">{ERRORS[error] ?? ERRORS.details}</p> : null}
                  <label className="label">{w.name}<input name="name" required minLength={2} maxLength={120} className="input" /></label>
                  {kind === "expert" ? <label className="label">Your title<input name="title" maxLength={120} placeholder="e.g. Tax consultant" className="input" /></label> : null}
                  <div className="grid grid-cols-2 gap-3">
                    <label className="label">Country<input name="country" required minLength={2} maxLength={60} defaultValue="Uganda" className="input" /></label>
                    <label className="label">Town or district<input name="place" maxLength={80} className="input" /></label>
                  </div>
                  <label className="label">{w.what}<textarea name="what" required minLength={2} maxLength={600} rows={2} className="input py-2.5" /><span className="text-xs font-normal text-ink-muted">{w.whatHint}</span></label>
                  {!user?.passwordHash ? (
                    <div className="grid grid-cols-2 gap-3">
                      <label className="label">Choose a 4-digit PIN<input name="pin" type="password" inputMode="numeric" pattern="\d{4}" maxLength={4} required autoComplete="new-password" className="input" /></label>
                      <label className="label">PIN again<input name="pinAgain" type="password" inputMode="numeric" pattern="\d{4}" maxLength={4} required autoComplete="new-password" className="input" /></label>
                    </div>
                  ) : null}
                  <button className="btn-primary min-h-[48px] w-full rounded-xl text-[15px] font-bold">Continue to payment</button>
                  <p className="text-center text-xs text-ink-muted">By continuing you agree to our <Link href="/terms">terms</Link> and <Link href="/privacy">privacy policy</Link>.</p>
                </form>
              ) : null}

              {step === 3 ? (
                <div className="flex flex-col gap-3 rounded-3xl bg-white p-5 sm:p-6">
                  <h2 className="font-display text-[20px] font-extrabold text-heading">{access?.everPaid ? "Renew" : "Pay for"} {partner?.item.title.replace(/^Sample:\s*/i, "")}</h2>
                  <PartnerPay kind={kind} options={options} done={`${info.portal}?saved=paid`} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Pricing" className="bg-white">
        <div className="container-site flex flex-col items-center gap-5 py-8 text-center sm:py-12">
          <div className="flex flex-col gap-2">
            <h2 className="text-hero text-[25px] leading-[1.12] text-heading sm:text-[34px]">Simple pricing</h2>
            <p className="text-[15px] text-ink-muted sm:text-[16px]">Your page goes live once you&apos;ve paid and our team has checked your details.</p>
          </div>
          {options.length ? (
            <ul className="grid w-full max-w-4xl gap-3 sm:grid-cols-3">
              {options.map((o) => (
                <li key={o.period} className="flex flex-col items-center gap-1 rounded-3xl bg-brand-tint px-4 py-5">
                  <span className="text-[14px] font-bold text-brand-dark">{o.label}</span>
                  <span className="text-hero text-[26px] leading-tight text-heading">{o.price}</span>
                  <span className="text-[13px] text-ink-muted">per {o.per}</span>
                  {o.period === "YEARLY" && saving ? <span className="mt-1 rounded-full bg-accent-tint px-2.5 py-0.5 text-[12px] font-bold text-accent-dark">Save {saving}%</span> : null}
                </li>
              ))}
            </ul>
          ) : <p className="text-[15px] font-semibold text-ink-soft">Prices are coming soon.</p>}
        </div>
      </section>
    </>
  );
}
