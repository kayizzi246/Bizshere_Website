import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { checkLabel, date, moneyRange } from "@/lib/format";
import { decideSubmission } from "../../actions";

export const dynamic = "force-dynamic";

const CHECKS_BY_TYPE: Record<string, { type: string; how: string; ph: string }[]> = {
  NEW_BUSINESS: [
    { type: "BUSINESS_CONTACT", how: "Call the phone number and confirm the business answers", ph: "e.g. Called on [date], spoke to owner" },
    { type: "REGISTRATION", how: "Match the certificate with the registration number", ph: "e.g. Number matches certificate" },
    { type: "PHYSICAL_ADDRESS", how: "Visit, or confirm with a trading licence or photo", ph: "e.g. Trading licence shows same address" },
  ],
  SUPPLIER_OFFER: [{ type: "PRICE_EVIDENCE", how: "Compare the price with the quotation or price list", ph: "e.g. Matches quotation dated [date]" }],
};

export default async function ReviewItem({ params, searchParams }: { params: { id: string }; searchParams: { error?: string } }) {
  const s = await prisma.submission.findUnique({
    where: { id: params.id },
    include: {
      submittedBy: true,
      organization: { include: { contacts: true, locations: { include: { location: true } }, documents: true } },
      supplierOffer: { include: { machine: { include: { contentItem: true } }, supplier: { include: { organization: true } } } },
      contentItem: true,
    },
  });
  if (!s) notFound();
  const org = s.organization;
  const dup = (s.payload as { possibleDuplicateOf?: string | null } | null)?.possibleDuplicateOf;
  const duplicate = dup ? await prisma.organization.findUnique({ where: { id: dup }, select: { legalName: true } }) : null;
  const checks = CHECKS_BY_TYPE[s.type] ?? [];

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm text-ink-muted"><Link href="/admin/review">Review queue</Link> / {s.type.replace("_", " ").toLowerCase()}</span>
        <h1 className="text-3xl font-extrabold tracking-tight">{org?.legalName ?? s.supplierOffer?.machine.contentItem.title ?? s.contentItem?.title ?? "Submission"}</h1>
        <span className="text-sm text-ink-muted">Submitted {date(s.createdAt)} by {s.submittedBy?.name ?? "—"} · status {s.status.toLowerCase()}</span>
      </div>

      {org ? (
        <section className="card flex flex-col gap-3 p-6">
          <h2 className="text-lg font-extrabold">Business details</h2>
          <dl className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3 text-sm">
            <Item k="Account type" v={org.accountType.toLowerCase().replace("_", " ")} />
            <Item k="Registration number" v={org.registrationNumber ?? "—"} />
            <Item k="Contact" v={org.contacts.map((c) => [c.personName, c.phone, c.email].filter(Boolean).join(" · ")).join("; ") || "—"} />
            <Item k="Address" v={org.locations.map((l) => [l.physicalAddress, l.location?.name].filter(Boolean).join(", ")).join("; ") || "—"} />
          </dl>
          {org.description ? <p className="text-sm text-ink-soft">{org.description}</p> : null}
          <div className="flex flex-wrap gap-2">
            {org.documents.map((d) => <span key={d.id} className="badge-muted">{d.purpose}</span>)}
            {org.documents.length === 0 ? <span className="badge-warn">No documents uploaded yet</span> : null}
            {duplicate ? <span className="badge-warn">Possible duplicate of {duplicate.legalName}</span> : null}
          </div>
        </section>
      ) : null}

      {s.supplierOffer ? (
        <section className="card flex flex-col gap-2 p-6 text-sm">
          <h2 className="text-lg font-extrabold">Offer</h2>
          <span>{s.supplierOffer.supplier.organization.legalName} · {s.supplierOffer.condition.toLowerCase()}</span>
          <span className="font-bold">{moneyRange(s.supplierOffer.priceMin, s.supplierOffer.priceMax, s.supplierOffer.currency)}</span>
          <span className="text-ink-muted">Quoted {date(s.supplierOffer.quotedAt)} · valid to {date(s.supplierOffer.validUntil)} · warranty {s.supplierOffer.warrantyMonths ?? "—"} months</span>
        </section>
      ) : null}

      <form action={decideSubmission} className="flex flex-col gap-5">
        <input type="hidden" name="id" value={s.id} />
        {checks.length ? (
          <section className="card flex flex-col gap-3.5 p-6">
            <div><h2 className="text-lg font-extrabold">Verification checks</h2><p className="text-sm text-ink-muted">Each result is saved with today&apos;s date, your name and the evidence. Only passed checks are shown publicly.</p></div>
            {checks.map((c) => (
              <fieldset key={c.type} className="flex flex-col gap-3 rounded-2xl border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <legend className="contents"><span className="flex flex-col"><span className="font-extrabold">{checkLabel[c.type]}</span><span className="text-sm text-ink-muted">{c.how}</span></span></legend>
                  <div className="flex gap-1.5">
                    {(["PASSED", "FAILED", "NOT_CHECKED"] as const).map((r) => (
                      <label key={r} className="cursor-pointer rounded-[9px] border border-line-strong px-3 py-2 text-sm font-bold has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white">
                        <input type="radio" name={`check_${c.type}`} value={r} defaultChecked={r === "NOT_CHECKED"} className="sr-only" />
                        {r === "NOT_CHECKED" ? "Not checked" : r.charAt(0) + r.slice(1).toLowerCase()}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <label className="label flex-[3_1_260px] text-xs text-ink-muted">Evidence note<input name={`evidence_${c.type}`} placeholder={c.ph} className="input min-h-[42px] text-sm" /></label>
                  <label className="label flex-[1_1_150px] text-xs text-ink-muted">Next check due<input type="date" name={`due_${c.type}`} className="input min-h-[42px] text-sm" /></label>
                </div>
              </fieldset>
            ))}
          </section>
        ) : null}

        <section className="card flex flex-col gap-3.5 p-6">
          <h2 className="text-lg font-extrabold">Decision</h2>
          <label className="label">Message to the business<textarea name="note" rows={3} placeholder="Required if you request changes or reject" className="input py-3" /></label>
          {searchParams.error === "note" ? <p role="alert" className="text-sm font-semibold text-bad-fg">Add a message so the business knows what to change.</p> : null}
          <div className="flex flex-wrap justify-end gap-2.5">
            <button name="decision" value="REJECTED" className="btn-danger min-h-[48px]">Reject</button>
            <button name="decision" value="CHANGES_REQUESTED" className="btn-outline min-h-[48px]">Request changes</button>
            <button name="decision" value="APPROVED" className="btn-primary min-h-[48px]">Approve and publish</button>
          </div>
        </section>
      </form>
    </>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return <div className="flex flex-col gap-0.5 rounded-xl border border-line px-4 py-3"><dt className="text-xs text-ink-muted">{k}</dt><dd className="font-bold capitalize">{v}</dd></div>;
}
