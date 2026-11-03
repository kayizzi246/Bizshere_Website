import { requireArea } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { savePlanPrices } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Membership prices" };

/** The member plan's daily, monthly and yearly prices, shown on /membership and in the payment pop-up. */
export default async function PlansPage({ searchParams }: { searchParams: { saved?: string; error?: string } }) {
  await requireArea("plans");
  const plan = await prisma.membershipPlan.findUnique({ where: { code: "member" } });
  const v = (n: unknown) => (n === null || n === undefined ? "" : String(Number(n)));

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-heading">Membership prices</h1>
        <p className="text-sm text-ink-muted">The free plan is always free. Set what the member plan costs by the day, month and year, in {plan?.currency ?? "UGX"}. Leave a box empty to show &quot;Price coming soon&quot;.</p>
      </div>
      {searchParams.saved ? <p role="status" className="rounded-lg bg-brand-tint px-4 py-2.5 text-sm font-semibold text-brand-dark">Prices saved.</p> : null}
      {searchParams.error ? <p role="alert" className="rounded-lg bg-bad-bg px-4 py-2.5 text-sm font-semibold text-bad-fg">Prices must be numbers, e.g. 5000.</p> : null}
      {plan ? (
        <form action={savePlanPrices} className="grid gap-4 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-3">
          <input type="hidden" name="id" value={plan.id} />
          {([["daily", "Daily", plan.priceDaily], ["monthly", "Monthly", plan.priceMonthly], ["yearly", "Yearly", plan.priceYearly]] as const).map(([k, label, price]) => (
            <label key={k} className="label">{label} ({plan.currency})
              <input name={k} inputMode="numeric" defaultValue={v(price)} placeholder="Not set" className="input" />
            </label>
          ))}
          <button className="btn-primary sm:col-span-3 sm:w-fit">Save prices</button>
        </form>
      ) : <p className="text-sm text-ink-muted">The member plan hasn&apos;t been created yet. Run the database seed.</p>}
    </div>
  );
}
