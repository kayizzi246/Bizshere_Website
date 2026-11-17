import Link from "next/link";
import { requireArea } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { date } from "@/lib/format";
import { Icon } from "@/components/Icon";
import { pesapalChecks, type PaymentCheck } from "@/lib/payments";

export const dynamic = "force-dynamic";
export const metadata = { title: "Why payments are failing" };

const STATE: Record<string, { ring: string; chip: string; word: string; icon: string }> = {
  ok: { ring: "border-line", chip: "bg-brand-tint text-brand-dark", word: "Working", icon: "check" },
  warn: { ring: "border-warn-fg/40", chip: "bg-warn-bg text-warn-fg", word: "Check this", icon: "flag" },
  bad: { ring: "border-bad-fg/40", chip: "bg-bad-bg text-bad-fg", word: "Stops payments", icon: "flag" },
};

/**
 * Why payments are failing (17 Nov 2026, client: "pesapal payments are not working on live").
 *
 * The reason a checkout fails is written to the server's console, which the person running the site
 * never sees. This page runs the same calls the checkout makes — sign in to Pesapal, look up the
 * notice address, knock on it — and says which step failed and what to change, alongside what
 * Pesapal told us about the payments that actually failed.
 *
 * Nothing here is cached and nothing is written. No key is ever shown in full.
 */
export default async function PaymentChecksPage() {
  await requireArea("payments");
  const [checks, failed] = await Promise.all([
    pesapalChecks().catch((e: Error): PaymentCheck[] => [{ name: "The checks could not run", state: "bad", detail: e.message }]),
    prisma.payment.findMany({
      where: { status: "FAILED" },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, createdAt: true, failureReason: true, amount: true, subscription: { select: { plan: { select: { name: true } }, user: { select: { name: true } }, organization: { select: { legalName: true } } } } },
    }).catch(() => []),
  ]);
  const stopping = checks.filter((c) => c.state === "bad");

  return (
    <>
      <div className="flex flex-col gap-1">
        <Link href="/admin/payments" className="w-fit text-[12px] font-semibold">← Back to payments</Link>
        <h1 className="font-display tracking-tight text-heading">Why payments are failing</h1>
        <p className="text-[12px] text-ink-muted">Run from this server, just now. Nothing is changed by looking.</p>
      </div>

      <p className={`flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-[12.5px] font-semibold ${stopping.length ? "bg-bad-bg text-bad-fg" : "bg-brand-tint text-brand-dark"}`}>
        <Icon name={stopping.length ? "flag" : "check"} className="mt-px h-4 w-4 shrink-0" />
        {stopping.length
          ? `${stopping.length === 1 ? "One thing is" : `${stopping.length} things are`} stopping payments: ${stopping.map((c) => c.name.toLowerCase()).join(", ")}. Each is explained below.`
          : "Every step of the connection to Pesapal is working from this server. If people still cannot pay, the failures below say what Pesapal told us."}
      </p>

      <section className="flex flex-col gap-2">
        {checks.map((c) => {
          const s = STATE[c.state] ?? STATE.warn;
          return (
            <div key={c.name} className={`flex flex-col gap-1.5 rounded-lg border bg-surface p-3.5 ${s.ring}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-heading">{c.name}</h2>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${s.chip}`}><Icon name={s.icon} className="h-3 w-3" />{s.word}</span>
              </div>
              <p className="break-words text-[12.5px] text-ink">{c.detail}</p>
              {c.fix ? <p className="rounded-md bg-page px-3 py-2 text-[12px] text-ink-soft"><strong className="font-semibold text-heading">What to do: </strong>{c.fix}</p> : null}
            </div>
          );
        })}
      </section>

      <section className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3.5">
        <h2 className="text-heading">The last payments that failed</h2>
        {failed.length === 0 ? (
          <p className="text-[12.5px] text-ink-muted">None. Either nobody has tried, or every attempt went through.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {failed.map((p) => {
              const who = p.subscription.user?.name ?? p.subscription.organization?.legalName ?? "Unknown customer";
              return (
                <li key={p.id} className="flex flex-col gap-0.5 py-2">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <strong className="text-[12.5px] font-semibold text-ink">{who}</strong>
                    <span className="text-[11.5px] text-ink-muted">{p.subscription.plan.name} · {date(p.createdAt)}</span>
                  </span>
                  <span className="text-[12px] text-bad-fg">{p.failureReason ?? "No reason recorded — the payment page never opened, which points at the connection above rather than at the payer."}</span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-[11.5px] text-ink-muted">&quot;Insufficient funds&quot; or &quot;Request timed out&quot; are the payer&apos;s side, not the site&apos;s. A run of them with no reason at all means the payment page never opened.</p>
      </section>
    </>
  );
}
