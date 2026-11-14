import Link from "next/link";
import type { BillingPeriod, Payment, Subscription } from "@prisma/client";
import { BadgeCheck, BellOff, BellRing, CalendarClock, Crown, RefreshCw, Sparkles } from "lucide-react";
import { setAutoRenew } from "@/app/actions/member";
import { METHOD_LABEL, STATUS_LABEL } from "@/lib/admin-payments";
import { date, money } from "@/lib/format";
import { PERIOD_INFO } from "@/lib/billing";

const PERIOD_LABEL: Record<BillingPeriod, string> = { ...Object.fromEntries(Object.entries(PERIOD_INFO).map(([k, v]) => [k, v.label])) as Record<BillingPeriod, string>, DAILY: "Day pass" };

/**
 * "My membership" on the account page: status, time left, renewal reminders and payment history.
 * Renew and Get full access open the payment pop-up in place (data-renew / data-pay, caught by
 * the site-wide OnboardingGate).
 */
export function MembershipPanel({ isMember, isStaff, sub, payments }: {
  isMember: boolean;
  isStaff: boolean;
  sub: Subscription | null;
  payments: Payment[];
}) {
  const now = Date.now();
  const end = sub?.currentPeriodEnd ?? null;
  const daysLeft = end ? Math.max(0, Math.ceil((end.getTime() - now) / 86_400_000)) : null;
  const active = isMember && sub?.status === "ACTIVE";
  const ended = !isMember && Boolean(sub && end && end.getTime() <= now);
  const soon = active && daysLeft !== null && daysLeft <= 3;
  const total = sub ? PERIOD_INFO[sub.period].days : 30;
  const used = daysLeft !== null ? Math.min(100, Math.max(4, Math.round(((total - Math.min(daysLeft, total)) / total) * 100))) : 100;
  const history = payments.filter((p) => p.status !== "PENDING" || now - p.createdAt.getTime() < 3_600_000);

  const chip = active
    ? soon ? ["Renews soon", "bg-accent-tint text-accent-dark"] : ["Active", "bg-brand-tint text-brand-dark"]
    : isMember ? ["Full access", "bg-brand-tint text-brand-dark"]
    : ended ? ["Ended", "bg-bad-bg text-bad-fg"] : ["Free account", "bg-page text-ink-soft"];

  return (
    <section id="membership" className="scroll-mt-28 overflow-hidden rounded-[20px] border border-line bg-surface">
      <div className={`flex flex-wrap items-center justify-between gap-5 p-6 sm:p-7 ${isMember ? "bg-[linear-gradient(120deg,#0550ae,#0969da)] text-white" : ""}`}>
        <div className="flex min-w-0 items-center gap-4">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${isMember ? "bg-white/15 text-white" : "bg-brand-tint text-brand"}`}>
            {isMember ? <Crown aria-hidden className="h-6 w-6" /> : <Sparkles aria-hidden className="h-6 w-6" />}
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-[20px] font-extrabold tracking-tight">My membership</h2>
              <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ${isMember ? "bg-white text-brand-dark" : chip[1]}`}>{chip[0]}</span>
            </span>
            <span className={`text-[14px] ${isMember ? "text-white/80" : "text-ink-muted"}`}>
              {isStaff ? "Staff accounts see everything." :
                active && end ? <>Member · {PERIOD_LABEL[sub!.period]} · full access until <strong className="font-semibold text-white">{date(end)}</strong></> :
                isMember ? "Full access, with no end date." :
                ended && end ? `Your membership ended on ${date(end)}. Renew to open everything again.` :
                "Previews only. Members see full budgets, contacts, funding terms and downloads."}
            </span>
          </div>
        </div>
        {isStaff || (isMember && !end) ? null : isMember || ended ? (
          <Link href={`/membership?onboard=renew&period=${sub?.period ?? "MONTHLY"}`} data-renew="" data-period={sub?.period ?? "MONTHLY"}
            className={`inline-flex min-h-[46px] items-center gap-2 rounded-full px-5 text-[15px] font-bold transition ${isMember ? "bg-white text-heading hover:bg-brand-tint hover:text-heading" : "bg-brand text-white hover:bg-brand-dark hover:text-white"}`}>
            <RefreshCw aria-hidden className="h-4 w-4" /> {isMember ? "Renew or change plan" : "Renew now"}
          </Link>
        ) : (
          <Link href="/membership?onboard=pay&next=%2Faccount" data-pay="" data-next="/account" className="btn-primary min-h-[46px] rounded-full px-5">Get full access</Link>
        )}
      </div>

      {active && end && daysLeft !== null ? (
        <div className="grid gap-5 border-t border-line p-6 sm:grid-cols-[1.4fr_1fr] sm:p-7">
          <div className="flex flex-col gap-2.5">
            <span className="flex items-baseline justify-between gap-3">
              <span className="flex items-center gap-2 text-[14px] font-semibold text-heading"><CalendarClock aria-hidden className="h-4 w-4 text-brand" />{daysLeft === 0 ? "Ends today" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}</span>
              <span className="text-[13px] text-ink-muted">Renews {date(end)}</span>
            </span>
            <span aria-hidden className="h-2 overflow-hidden rounded-full bg-page"><span className={`block h-full rounded-full ${soon ? "bg-accent" : "bg-brand"}`} style={{ width: `${used}%` }} /></span>
            <span className="text-[12px] text-ink-muted">Renewing early adds the new time to the end of this one, so you never lose a day.</span>
          </div>
          <form action={setAutoRenew} className="flex items-start gap-3 rounded-2xl bg-page p-4">
            {sub!.autoRenew ? <BellRing aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-brand" /> : <BellOff aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" />}
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[14px] font-semibold text-heading">Renewal reminders {sub!.autoRenew ? "on" : "off"}</span>
              <span className="text-[12px] text-ink-muted">{sub!.autoRenew ? "We text or email you before it renews (3 days and 1 day before; 1 day for a weekly plan), with a link to pay." : "No reminders: your membership simply ends on the date above."}</span>
              <input type="hidden" name="on" value={sub!.autoRenew ? "false" : "true"} />
              <button className="mt-1 self-start text-[13px] font-bold text-brand hover:text-brand-dark">{sub!.autoRenew ? "Turn off" : "Turn on"}</button>
            </span>
          </form>
        </div>
      ) : null}

      {history.length ? (
        <div className="border-t border-line p-6 sm:p-7">
          <h3 className="mb-3 text-[15px] font-bold text-heading">Payments</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[13px]">
              <thead className="text-ink-muted"><tr><th className="pb-2 font-medium">Date</th><th className="pb-2 font-medium">Plan</th><th className="pb-2 font-medium">Amount</th><th className="pb-2 font-medium">Paid with</th><th className="pb-2 font-medium">Status</th></tr></thead>
              <tbody>
                {history.map((p) => (
                  <tr key={p.id} className="border-t border-line">
                    <td className="py-2.5">{date(p.paidAt ?? p.createdAt)}</td>
                    <td className="py-2.5">{PERIOD_LABEL[p.period ?? sub?.period ?? "MONTHLY"]}</td>
                    <td className="py-2.5 font-semibold text-heading">{money(p.amount, p.currency)}</td>
                    <td className="py-2.5">{METHOD_LABEL[p.method]}</td>
                    <td className="py-2.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-bold ${p.status === "SUCCEEDED" ? "bg-brand-tint text-brand-dark" : p.status === "PENDING" ? "bg-accent-tint text-accent-dark" : "bg-page text-ink-muted"}`}>
                        {p.status === "SUCCEEDED" ? <BadgeCheck aria-hidden className="h-3.5 w-3.5" /> : null}{STATUS_LABEL[p.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
