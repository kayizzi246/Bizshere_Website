import Link from "next/link";
import type { LeadStatus } from "@prisma/client";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { requireArea } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { interestShort } from "@/lib/leads";
import { whatsappHref } from "@/lib/site-contact";
import { updateLead } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leads" };

// "All" means everything a person should look at, so it leaves out spam, which has its own tab.
const TABS: [LeadStatus | "", string][] = [["NEW", "New"], ["CONTACTED", "Contacted"], ["CLOSED", "Closed"], ["", "All"], ["SPAM", "Spam"]];
const BADGE: Record<LeadStatus, string> = { NEW: "badge-warn", CONTACTED: "badge-info", CLOSED: "badge-muted", SPAM: "badge-muted" };
const WANT: Record<string, string> = { membership: "bg-accent-tint text-accent-dark", supplier_listing: "bg-brand-tint text-brand-dark", expert_listing: "bg-[#EFE6F7] text-[#4A1D6B]", question: "bg-page text-ink-soft" };

/**
 * People who asked to be called back (the form on /contact and under the pricing). Newest first;
 * call or WhatsApp with one tap, note what was agreed, mark them contacted or closed.
 */
export default async function AdminLeadsPage({ searchParams }: { searchParams: { status?: string } }) {
  await requireArea("leads");
  const status = (TABS.some(([s]) => s === searchParams.status) ? searchParams.status : "NEW") as LeadStatus | "";
  const [leads, counts] = await Promise.all([
    prisma.lead.findMany({ where: status ? { status } : { status: { not: "SPAM" } }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const count = (s: LeadStatus | "") => (s ? counts.find((c) => c.status === s)?._count._all ?? 0 : counts.reduce((n, c) => n + (c.status === "SPAM" ? 0 : c._count._all), 0));
  const back = `/admin/leads?status=${status}`;
  const when = (d: Date) => d.toLocaleString("en-GB", { timeZone: "Africa/Kampala", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <div>
        <h1 className="font-display text-[19px] font-extrabold tracking-tight text-heading">Leads</h1>
        <p className="text-sm text-ink-muted">People who left their number to be called back. Call within the hour where you can: that is when they are still deciding.</p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl bg-page p-1">
        {TABS.map(([s, l]) => (
          <Link key={l} href={`/admin/leads?status=${s}`} className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-[12.5px] ${status === s ? "bg-surface font-semibold text-heading ring-1 ring-line" : "font-medium text-ink-soft hover:text-heading"}`}>{l} <span className="text-ink-muted">{count(s)}</span></Link>
        ))}
      </div>

      {leads.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-10 text-center">
          <p className="text-sm font-semibold text-heading">{status === "NEW" ? "No new leads waiting." : status === "SPAM" ? "No spam caught." : "Nothing here."}</p>
          <p className="text-[12.5px] text-ink-muted">{status === "SPAM" ? "Messages that looked like someone selling search listings. They are kept here and nobody is texted about them." : "Leads arrive from the Contact page and the ‘Call me back’ form under the pricing."}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {leads.map((l) => (
            <li key={l.id} className="card flex flex-col gap-3 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-[15px] font-extrabold text-heading">{l.name}</span>
                    <span className={`badge ${BADGE[l.status]}`}>{l.status.toLowerCase()}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${WANT[l.interest] ?? WANT.question}`}>{interestShort(l.interest)}</span>
                  </span>
                  <span className="text-[12px] text-ink-muted">{when(l.createdAt)}{l.page ? <> · from <span className="font-mono">{l.page}</span></> : null}{l.email ? <> · {l.email}</> : null}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a href={`tel:${l.phone.replace(/\s/g, "")}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-[12.5px] font-bold text-white hover:bg-brand-dark hover:text-white"><Phone aria-hidden className="h-4 w-4" />{l.phone}</a>
                  <a href={whatsappHref(l.phone, `Hello ${l.name.split(" ")[0]}, this is BizSphere-Ug. You asked us to get in touch about ${interestShort(l.interest).toLowerCase()}.`)} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#25D366] px-3 text-[12.5px] font-bold text-white hover:bg-[#1DA851] hover:text-white"><MessageCircle aria-hidden className="h-4 w-4" />WhatsApp</a>
                  {l.email ? <a href={`mailto:${l.email}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-[12.5px] font-bold text-ink hover:border-brand hover:text-brand"><Mail aria-hidden className="h-4 w-4" />Email</a> : null}
                </div>
              </div>
              {l.message ? <p className="whitespace-pre-line rounded-xl bg-page px-4 py-3 text-sm text-ink">{l.message}</p> : null}
              <form action={updateLead} className="flex flex-col gap-2 border-t border-line pt-3 sm:flex-row sm:items-end">
                <input type="hidden" name="id" value={l.id} /><input type="hidden" name="back" value={back} />
                <label className="label flex-1">Note (what was agreed)<input name="note" defaultValue={l.note ?? ""} placeholder="e.g. Called 10 Nov, wants the yearly plan, paying Friday" className="input" /></label>
                <div className="flex flex-wrap gap-2">
                  {l.status !== "CONTACTED" ? <button name="status" value="CONTACTED" className="btn-primary min-h-[44px] px-4 text-[12.5px]">Mark contacted</button> : null}
                  {l.status !== "CLOSED" ? <button name="status" value="CLOSED" className="btn-outline min-h-[44px] px-4 text-[12.5px]">Close</button> : null}
                  {l.status !== "NEW" ? <button name="status" value="NEW" className="btn-outline min-h-[44px] px-4 text-[12.5px]">Back to new</button> : null}
                  {l.status === "CONTACTED" ? <button name="status" value="CONTACTED" className="btn-outline min-h-[44px] px-4 text-[12.5px]">Save note</button> : null}
                </div>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
