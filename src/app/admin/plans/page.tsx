import { requireArea } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PERIOD_INFO, PLAN_PERIODS, PRICE_FIELD } from "@/lib/billing";
import { partnerPlan } from "@/lib/partners";
import { savePlanPrices } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prices" };

/** What each plan costs by the day, week, month and year. An empty box isn't offered. Shown on /membership and the join pages. */
export default async function PlansPage({ searchParams }: { searchParams: { saved?: string; error?: string } }) {
  await requireArea("plans");
  const [member, supplier, expert] = await Promise.all([prisma.membershipPlan.findUnique({ where: { code: "member" } }), partnerPlan("supplier"), partnerPlan("expert")]);
  const v = (n: unknown) => (n === null || n === undefined ? "" : String(Number(n)));
  const plans = [
    { plan: member, title: "Members", note: "Full access to every directory." },
    { plan: supplier, title: "Suppliers", note: "What a supplier pays for their listing. Shown at /suppliers/join." },
    { plan: expert, title: "Experts", note: "What an expert pays for their listing. Shown at /experts/join." },
  ];

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-heading">Prices</h1>
        <p className="text-sm text-ink-muted">Leave a box empty to not offer that length.</p>
      </div>
      {searchParams.saved ? <p role="status" className="rounded-lg bg-brand-tint px-4 py-2.5 text-sm font-semibold text-brand-dark">Prices saved.</p> : null}
      {searchParams.error ? <p role="alert" className="rounded-lg bg-bad-bg px-4 py-2.5 text-sm font-semibold text-bad-fg">Prices must be numbers, e.g. 5000.</p> : null}
      {plans.map(({ plan, title, note }) => (plan ? (
        <section key={plan.id} className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5"><h2 className="font-bold text-heading">{title}</h2><p className="text-sm text-ink-muted">{note}</p></div>
          <form action={savePlanPrices} className="grid gap-4 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-2 lg:grid-cols-4">
            <input type="hidden" name="id" value={plan.id} />
            {PLAN_PERIODS.map((k) => (
              <label key={k} className="label">{PERIOD_INFO[k].label} ({plan.currency})
                <input name={k} inputMode="numeric" defaultValue={v(plan[PRICE_FIELD[k]])} placeholder="Not set" className="input" />
                <span className="text-xs font-normal text-ink-muted">per {PERIOD_INFO[k].per}</span>
              </label>
            ))}
            <button className="btn-primary sm:col-span-2 sm:w-fit lg:col-span-4">Save {title.toLowerCase()} prices</button>
          </form>
        </section>
      ) : <p key={title} className="text-sm text-ink-muted">The member plan hasn&apos;t been created yet. Run the database seed.</p>))}
    </div>
  );
}
