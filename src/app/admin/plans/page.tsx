import type { MembershipPlan } from "@prisma/client";
import { requireArea } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PARTNER_PERIODS, PERIOD_INFO, PLAN_PERIODS, PRICE_FIELD } from "@/lib/billing";
import { partnerPlan } from "@/lib/partners";
import { savePlanPrices } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Subscription prices" };

/** What suppliers, experts and members pay for each length. An empty box isn't offered. Shown on /membership and the join pages. */
export default async function PlansPage({ searchParams }: { searchParams: { saved?: string; error?: string } }) {
  await requireArea("plans");
  const [member, supplier, expert] = await Promise.all([prisma.membershipPlan.findUnique({ where: { code: "member" } }), partnerPlan("supplier"), partnerPlan("expert")]);
  const listing = PARTNER_PERIODS.map((k) => ({ key: k, label: PERIOD_INFO[k].length }));
  const membership = PLAN_PERIODS.map((k) => ({ key: k, label: PERIOD_INFO[k].label }));
  const plans: { plan: MembershipPlan | null; title: string; note: string; lengths: typeof listing | typeof membership }[] = [
    { plan: supplier, title: "Suppliers", note: "What a supplier pays to be listed. Shown on the Become a Supplier page.", lengths: listing },
    { plan: expert, title: "Experts", note: "What an expert pays to be listed. Shown on the Become an Expert page.", lengths: listing },
    { plan: member, title: "Members", note: "What a member pays for full access to every directory. Shown on the Membership page.", lengths: membership },
  ];
  const v = (n: unknown) => (n === null || n === undefined ? "" : String(Number(n)));

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-heading">Subscription prices</h1>
        <p className="text-sm text-ink-muted">Type a price and press Save. New prices show on the website straight away. To stop offering a length, empty its box. People who have already paid keep the time they paid for.</p>
      </div>
      {searchParams.saved ? <p role="status" className="rounded-lg bg-brand-tint px-4 py-2.5 text-sm font-semibold text-brand-dark">Prices saved.</p> : null}
      {searchParams.error ? <p role="alert" className="rounded-lg bg-bad-bg px-4 py-2.5 text-sm font-semibold text-bad-fg">Prices must be numbers, e.g. 500000.</p> : null}
      {plans.map(({ plan, title, note, lengths }) => (plan ? (
        <section key={plan.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
          <div className="flex flex-col gap-0.5"><h2 className="text-lg font-extrabold text-heading">{title}</h2><p className="text-sm text-ink-muted">{note}</p></div>
          <form action={savePlanPrices} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={plan.id} />
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {lengths.map(({ key, label }) => (
                <label key={key} className="label min-w-0">{label}
                  <input name={key} inputMode="numeric" defaultValue={v(plan[PRICE_FIELD[key]])} placeholder="Not offered" aria-label={`${title}: price for ${label} in ${plan.currency}`} className="input w-full min-w-0" />
                  <span className="text-xs font-normal text-ink-muted">{plan.currency}</span>
                </label>
              ))}
            </div>
            <button className="btn-primary w-fit">Save prices</button>
          </form>
        </section>
      ) : <p key={title} className="text-sm text-ink-muted">The {title.toLowerCase()} plan hasn&apos;t been created yet. Run the database seed.</p>))}
    </div>
  );
}
