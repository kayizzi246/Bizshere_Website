import Link from "next/link";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PARTNER_PERIODS, PERIOD_INFO, PRICE_FIELD } from "@/lib/billing";
import { money } from "@/lib/format";
import { PARTNER_INFO, partnerAccess, partnerOf, partnerPlan, type PartnerKind } from "@/lib/partners";
import { registerPartner } from "@/app/actions/partners";
import { PartnerPay } from "./PartnerPay";
import { PhoneAuthCard } from "./PhoneAuthCard";
import { SplitShell } from "./SplitShell";

const WORDS: Record<PartnerKind, { title: string; panel: [string, string]; intro: string; gets: string[]; name: string; what: string; whatHint: string }> = {
  supplier: {
    title: "Become a Supplier", panel: ["Get your business in front of", "buyers"], intro: "Get your business in front of buyers across Uganda.",
    gets: ["Your own page with your photo", "Add your products and prices", "Your own dashboard to keep it up to date"],
    name: "Business name", what: "What do you sell?", whatHint: "Separate items with commas, e.g. flour, ovens, packaging",
  },
  expert: {
    title: "Become an Expert", panel: ["Get found by the businesses that", "need you"], intro: "Get found by businesses that need your help.",
    gets: ["Your own profile page", "List your services and prices", "Show the jobs you've done"],
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
  return PARTNER_PERIODS.flatMap((p) => {
    const v = plan[PRICE_FIELD[p]];
    return v !== null && Number(v) > 0 ? [{ period: p, label: PERIOD_INFO[p].length, price: money(v, plan.currency) }] : [];
  });
}

/**
 * /suppliers/join and /experts/join, on the split screen: the steps and form on the left, what you get
 * and the pricing on the navy panel. Confirm your phone, enter your details, and the payment pop-up
 * opens by itself (PartnerPay). The step comes from the server, so a person who leaves and comes back
 * carries on where they stopped. Once paid it goes on to their dashboard.
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

  const panel = (
    <>
      <h2 className="max-w-md text-hero text-[30px] leading-[1.08] lg:text-[36px] xl:text-[44px]">{w.panel[0]} <span className="text-accent">{w.panel[1]}</span></h2>
      <ul className="flex flex-col gap-2.5">
        {w.gets.map((t) => (
          <li key={t} className="flex items-center gap-2.5 text-[15px] font-medium text-white/90">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-ink"><Check aria-hidden className="h-3.5 w-3.5" strokeWidth={3} /></span>{t}
          </li>
        ))}
      </ul>
      <section aria-label="Pricing" className="flex flex-col gap-3 border-t border-white/15 pt-5">
        <h3 className="font-display text-[16px] font-extrabold">Simple pricing</h3>
        {options.length ? (
          <ul className="grid grid-cols-2 gap-2">
            {options.map((o) => (
              <li key={o.period} className="flex flex-col gap-0.5 rounded-2xl bg-white/10 p-3 ring-1 ring-white/15">
                <span className="text-[13px] font-semibold text-white/75">{o.label}</span>
                <span className="font-display text-[17px] font-extrabold tabular-nums">{o.price}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-[15px] font-semibold text-white/80">Prices are coming soon.</p>}
        <p className="text-[13px] text-white/60">Your page goes live once you&apos;ve paid and our team has checked your details.</p>
      </section>
    </>
  );
  const name = partner?.item.title.replace(/^Sample:\s*/i, "");
  const payTitle = `${access?.everPaid ? "Renew" : "Pay for"} ${name}`;

  return (
    <SplitShell panelOnPhone panel={panel} heading={step === 3 ? payTitle : w.title} sub={step === 3 ? "One last step: your page goes live after payment and a quick check." : w.intro}
      foot={<>Already registered? <Link href={info.login} className="font-bold">Sign in</Link></>}>
      <ol aria-label="Steps" className="flex items-center gap-2">
        {["Your phone", "Your details", "Pay"].map((t, i) => {
          const n = i + 1;
          return (
            <li key={t} aria-current={step === n ? "step" : undefined} className="flex min-w-0 flex-1 items-center gap-2">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${step === n ? "bg-brand text-white" : step > n ? "bg-brand-tint text-brand" : "bg-page text-ink-muted"}`}>{step > n ? <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={3} /> : n}</span>
              <span className={`truncate text-[13px] font-semibold ${step === n ? "text-heading" : "text-ink-muted"}`}>{t}</span>
            </li>
          );
        })}
      </ol>

      {step === 1 ? <PhoneAuthCard plain title="Confirm your phone" googleEnabled={false} redirectTo={info.join} /> : null}

      {step === 2 ? (
        <form action={registerPartner} className="flex flex-col gap-3">
          <input type="hidden" name="kind" value={kind} />
          {error ? <p role="alert" className="rounded-lg bg-bad-bg px-3 py-2 text-[14px] font-semibold text-bad-fg">{ERRORS[error] ?? ERRORS.details}</p> : null}
          <label className="label">{w.name}<input name="name" required minLength={2} maxLength={120} className="input" /></label>
          {kind === "expert" ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="label">Business name<input name="business" maxLength={160} className="input" /></label>
              <label className="label">Your title<input name="title" maxLength={120} placeholder="e.g. Tax consultant" className="input" /></label>
            </div>
          ) : null}
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

      {step === 3 ? <PartnerPay kind={kind} options={options} done={`${info.portal}?saved=paid`} title={payTitle} /> : null}
    </SplitShell>
  );
}
