import { requireArea } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { date, money } from "@/lib/format";
import { PERIOD_INFO, PLAN_PERIODS } from "@/lib/billing";
import { NUMBER_SETTINGS, getSettings, type NumberSetting } from "@/lib/settings";
import { createPromo, deletePromo, saveOfferSettings, togglePromo } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Offers and codes" };

/**
 * Everything that brings a payment in without changing the price list: discount codes typed in the
 * payment pop-up, and the free days an invite gives.
 *
 * Each code shows what it has actually brought in (uses and money off), so the team can tell an
 * advert that worked from one that didn't.
 */
export default async function AdminPromosPage({ searchParams }: { searchParams: { error?: string; added?: string; saved?: string; deleted?: string } }) {
  await requireArea("promos");
  const [codes, settings, plan, invites] = await Promise.all([
    prisma.promoCode.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      include: { _count: { select: { redemptions: true } }, redemptions: { select: { amountOff: true } } },
    }),
    getSettings(),
    prisma.membershipPlan.findUnique({ where: { code: "member" }, select: { currency: true } }),
    prisma.referral.aggregate({ _count: { _all: true }, where: {} }),
  ]);
  const paidInvites = await prisma.referral.count({ where: { rewardedAt: { not: null } } });
  const currency = plan?.currency ?? "UGX";
  const notice = searchParams.added ? "Code created." : searchParams.saved ? "Saved." : searchParams.deleted ? "Code deleted." : null;
  const now = new Date();
  const state = (c: (typeof codes)[number]) =>
    !c.isActive ? ["badge-muted", "Off"]
    : c.expiresAt && c.expiresAt <= now ? ["badge-muted", "Expired"]
    : c.startsAt && c.startsAt > now ? ["badge-info", "Starts " + date(c.startsAt)]
    : c.maxRedemptions !== null && c._count.redemptions >= c.maxRedemptions ? ["badge-muted", "Used up"]
    : ["badge-ok", "Live"];

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-heading">Offers and codes</h1>
        <p className="text-sm text-ink-muted">A code lowers the price of one payment. It never changes what a membership opens or how long it lasts, and it is only used up when the payment goes through.</p>
      </div>
      {notice ? <p role="status" className="rounded-lg bg-brand-tint px-4 py-2.5 text-sm font-semibold text-brand-dark">{notice}</p> : null}
      {searchParams.error ? <p role="alert" className="rounded-lg bg-bad-bg px-4 py-2.5 text-sm font-semibold text-bad-fg">{searchParams.error}</p> : null}

      {/* What the free pass and invites have done so far */}
      <section className="grid grid-cols-3 gap-3">
        {[
          ["People invited", String(invites._count._all)],
          ["Invites that paid", String(paidInvites)],
          ["Codes live", String(codes.filter((c) => state(c)[1] === "Live").length)],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5 rounded-xl border border-line bg-surface p-4">
            <span className="text-2xl font-extrabold text-heading">{value}</span>
            <span className="text-xs text-ink-muted">{label}</span>
          </div>
        ))}
      </section>

      {/* The three numbers behind the free pass, invites and price alerts */}
      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-extrabold text-heading">Invites and price alerts</h2>
          <p className="text-sm text-ink-muted">These take effect straight away. Set the free days to 0 to switch invites off.</p>
        </div>
        <form action={saveOfferSettings} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {(Object.keys(NUMBER_SETTINGS) as NumberSetting[]).map((key) => (
              <label key={key} className="label min-w-0">{NUMBER_SETTINGS[key].label}
                <input name={key} inputMode="numeric" defaultValue={String(settings[key])} aria-label={NUMBER_SETTINGS[key].label} className="input w-full min-w-0" />
                <span className="text-xs font-normal text-ink-muted">{NUMBER_SETTINGS[key].help}</span>
              </label>
            ))}
          </div>
          <button className="btn-primary w-fit">Save</button>
        </form>
      </section>

      {/* New code */}
      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-extrabold text-heading">New code</h2>
          <p className="text-sm text-ink-muted">Members type it in the payment pop-up. Codes are not case sensitive: LAUNCH20 and launch20 are the same code.</p>
        </div>
        <form action={createPromo} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="label min-w-0">Code
              <input name="code" required maxLength={32} placeholder="LAUNCH20" className="input w-full min-w-0 uppercase" />
            </label>
            <label className="label min-w-0">Type of discount
              <select name="kind" className="input w-full min-w-0">
                <option value="PERCENT">Per cent off</option>
                <option value="AMOUNT">Money off</option>
              </select>
            </label>
            <label className="label min-w-0">Amount
              <input name="value" inputMode="numeric" required placeholder="20" className="input w-full min-w-0" />
              <span className="text-xs font-normal text-ink-muted">20 means 20% off, or {money(20000, currency)} off for money off.</span>
            </label>
            <label className="label min-w-0">How many uses in all
              <input name="maxRedemptions" inputMode="numeric" placeholder="No limit" className="input w-full min-w-0" />
              <span className="text-xs font-normal text-ink-muted">One use per person either way.</span>
            </label>
            <label className="label min-w-0">Starts (optional)
              <input name="startsAt" type="date" className="input w-full min-w-0" />
            </label>
            <label className="label min-w-0">Ends (optional)
              <input name="expiresAt" type="date" className="input w-full min-w-0" />
            </label>
            <label className="label min-w-0 sm:col-span-2">What it is for (your note)
              <input name="note" maxLength={200} placeholder="Radio advert, December" className="input w-full min-w-0" />
            </label>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="label mb-1">Which lengths it works on</legend>
            <span className="flex flex-wrap gap-3">
              {PLAN_PERIODS.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm font-medium text-heading">
                  <input type="checkbox" name={`period-${p}`} className="h-4 w-4" />{PERIOD_INFO[p].length}
                </label>
              ))}
            </span>
            <span className="text-xs text-ink-muted">Tick none to let it work on every length.</span>
          </fieldset>
          <button className="btn-primary w-fit">Create code</button>
        </form>
      </section>

      {/* The codes */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-extrabold text-heading">Codes</h2>
        {codes.length === 0 ? (
          <p className="text-sm text-ink-muted">No codes yet.</p>
        ) : (
          codes.map((c) => {
            const [badge, label] = state(c);
            const off = c.redemptions.reduce((s, r) => s + Number(r.amountOff), 0);
            return (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4">
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <strong className="font-mono text-[14px] font-extrabold tracking-wide text-heading">{c.code}</strong>
                    <span className={badge}>{label}</span>
                    <span className="text-sm font-semibold text-heading">{c.kind === "PERCENT" ? `${Number(c.value)}% off` : `${money(c.value, currency)} off`}</span>
                  </span>
                  <span className="text-xs text-ink-muted">
                    {c.periods.length ? c.periods.map((p) => PERIOD_INFO[p].length).join(", ") : "Every length"}
                    {" · "}{c._count.redemptions} {c._count.redemptions === 1 ? "use" : "uses"}{c.maxRedemptions ? ` of ${c.maxRedemptions}` : ""}
                    {off ? ` · ${money(off, currency)} given away` : ""}
                    {c.expiresAt ? ` · ends ${date(c.expiresAt)}` : ""}
                    {c.note ? ` · ${c.note}` : ""}
                  </span>
                </span>
                <span className="flex shrink-0 gap-2">
                  <form action={togglePromo}>
                    <input type="hidden" name="id" value={c.id} />
                    <button className="btn-outline min-h-[44px] px-3">{c.isActive ? "Turn off" : "Turn on"}</button>
                  </form>
                  {c._count.redemptions === 0 ? (
                    <form action={deletePromo}>
                      <input type="hidden" name="id" value={c.id} />
                      <button className="btn-outline min-h-[44px] px-3 text-bad-fg">Delete</button>
                    </form>
                  ) : null}
                </span>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
