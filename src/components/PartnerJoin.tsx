import Link from "next/link";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERIOD_INFO, PLAN_PERIODS, PRICE_FIELD } from "@/lib/billing";
import { money } from "@/lib/format";
import { PARTNER_INFO, partnerAccess, partnerOf, partnerPlan, type PartnerKind } from "@/lib/partners";
import { registerPartner } from "@/app/actions/partners";
import { PartnerPay } from "./PartnerPay";
import { PhoneAuthCard } from "./PhoneAuthCard";

const WORDS: Record<PartnerKind, { title: string; intro: string; gets: string[]; name: string; what: string; whatHint: string }> = {
  supplier: {
    title: "Become a Supplier", intro: "Get your business in front of buyers across Uganda.",
    gets: ["Your own page with your photo", "Add your products and prices", "Your own dashboard to keep it up to date"],
    name: "Business name", what: "What do you sell?", whatHint: "Separate items with commas, e.g. flour, ovens, packaging",
  },
  expert: {
    title: "Become an Expert", intro: "Get found by businesses that need your help.",
    gets: ["Your own profile page", "Show your work and your links", "Reviews from your clients"],
    name: "Your full name", what: "What do you help with?", whatHint: "Separate areas with commas, e.g. tax, accounting, export",
  },
};

const ERRORS: Record<string, string> = {
  details: "Please check your details and fill in every box marked as needed.",
  pin: "Enter the same 4-digit PIN twice.",
  phone: "This account has no phone number. Sign out and continue with your phone.",
  staff: "Staff accounts can't register here. Use your business's own phone.",
  busy: "Too many tries. Please wait a few minutes and try again.",
};

/** The prices the team has set, in order. A price of 0 or none can't be paid for, so it isn't offered. */
export function planOptions(plan: Awaited<ReturnType<typeof partnerPlan>>) {
  return PLAN_PERIODS.flatMap((p) => {
    const v = plan[PRICE_FIELD[p]];
    return v !== null && Number(v) > 0 ? [{ period: p, label: PERIOD_INFO[p].label, price: money(v, plan.currency) }] : [];
  });
}

/**
 * /suppliers/join and /experts/join: the pricing and what you get, beside the three steps. Confirm your
 * phone, enter your details, pay. The step shown comes from the server, so a person who leaves
 * and comes back carries on where they stopped. Once paid it goes on to their dashboard.
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
  const step = !userId ? 1 : !partner ? 2 : 3;

  return (
    <div className="bg-page">
      <div className="container-site grid gap-6 py-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:items-start lg:gap-12">
        <div className="flex flex-col gap-4">
          <h1 className="font-display text-[32px] font-extrabold leading-[1.08] tracking-[-0.03em] text-heading sm:text-[44px]">{w.title}</h1>
          <p className="text-[16px] leading-relaxed text-ink-muted sm:text-[18px]">{w.intro}</p>
          <ul className="flex flex-col gap-2">
            {w.gets.map((t) => (
              <li key={t} className="flex items-center gap-2.5 text-[15px] font-medium text-ink-soft">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand"><Check aria-hidden className="h-3 w-3" strokeWidth={3} /></span>{t}
              </li>
            ))}
          </ul>
          <section aria-label="Pricing" className="flex flex-col gap-2 rounded-2xl bg-white p-4 ring-1 ring-line">
            <h2 className="font-display text-[16px] font-extrabold text-heading">{info.name} pricing</h2>
            {options.length ? (
              <ul className="grid gap-2 sm:grid-cols-2">
                {options.map((o) => (
                  <li key={o.period} className="flex items-baseline justify-between gap-3 rounded-xl bg-page px-3 py-2.5">
                    <span className="text-[14px] font-semibold text-ink-soft">{o.label}</span>
                    <span className="font-display text-[16px] font-extrabold tabular-nums text-heading">{o.price}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-[14px] text-ink-muted">Prices are coming soon.</p>}
            <p className="text-[13px] text-ink-muted">Your page goes live once you&apos;ve paid and our team has checked your details.</p>
          </section>
          <p className="text-[14px] text-ink-muted">Already registered? <Link href={info.login} className="font-bold">Sign in</Link></p>
        </div>

        <div className="flex flex-col gap-3">
          <ol aria-label="Steps" className="grid grid-cols-3 gap-2 text-center text-[12px] font-bold">
            {["Your phone", "Your details", "Pay"].map((t, i) => (
              <li key={t} aria-current={step === i + 1 ? "step" : undefined} className={`rounded-full px-2 py-1.5 ${step === i + 1 ? "bg-brand text-white" : step > i + 1 ? "bg-brand-tint text-brand-dark" : "bg-white text-ink-muted ring-1 ring-line"}`}>{i + 1}. {t}</li>
            ))}
          </ol>

          {step === 1 ? <PhoneAuthCard title="Confirm your phone" googleEnabled={false} redirectTo={info.join} /> : null}

          {step === 2 ? (
            <form action={registerPartner} className="flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-line sm:p-5">
              <input type="hidden" name="kind" value={kind} />
              {error ? <p role="alert" className="rounded-lg bg-bad-bg px-3 py-2 text-[14px] font-semibold text-bad-fg">{ERRORS[error] ?? ERRORS.details}</p> : null}
              <label className="label">{w.name}<input name="name" required minLength={2} maxLength={120} className="input" /></label>
              {kind === "expert" ? <label className="label">Your title<input name="title" maxLength={120} placeholder="e.g. Tax consultant" className="input" /></label> : null}
              <div className="grid grid-cols-2 gap-3">
                <label className="label">Country<input name="country" required minLength={2} maxLength={60} defaultValue="Uganda" className="input" /></label>
                <label className="label">Town or district<input name="place" maxLength={80} className="input" /></label>
              </div>
              <label className="label">{w.what}<textarea name="what" required minLength={2} maxLength={600} rows={2} className="input" /><span className="text-xs font-normal text-ink-muted">{w.whatHint}</span></label>
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
            <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-line sm:p-5">
              <h2 className="font-display text-[18px] font-extrabold text-heading">{access?.everPaid ? "Renew" : "Pay for"} {partner?.item.title.replace(/^Sample:\s*/i, "")}</h2>
              <PartnerPay kind={kind} options={options} done={`${info.portal}?saved=paid`} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
