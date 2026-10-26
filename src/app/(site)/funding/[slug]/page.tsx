import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { date, moneyRange } from "@/lib/format";
import { Gate, Check } from "@/components/Gate";
import { Connected, Evidence } from "@/components/DetailParts";

export const dynamic = "force-dynamic";

export default async function FundingPage({ params }: { params: { slug: string } }) {
  const viewer = await getViewer();
  const item = await prisma.contentItem.findFirst({
    where: { slug: params.slug, contentType: "FUNDING_PROGRAMME", publicationStatus: viewer.isStaff ? undefined : "PUBLISHED" },
    include: {
      fundingProgramme: { include: { provider: { include: { organization: true } }, rounds: { orderBy: { closesAt: "desc" } } } },
      relatedTo: { include: { fromItem: true } },
    },
  });
  if (!item || !item.fundingProgramme) notFound();
  const p = item.fundingProgramme;
  const round = p.rounds.find((r) => r.status === "OPEN") ?? p.rounds[0];
  const gated = item.accessLevel !== "PUBLIC" && !viewer.isMember;

  // Only build the detailed terms object for members.
  const terms: [string, string][] | null = gated ? null : [
    ["Interest", p.interestRate !== null ? `${p.interestRate}% ${p.rateBasis ?? ""} ${p.rateType ? `(${p.rateType.toLowerCase()})` : ""}` : "—"],
    ["Repayment", p.repaymentMonths ? `${p.repaymentMonths} months${p.repaymentFrequency ? `, ${p.repaymentFrequency}` : ""}` : "—"],
    ["Grace period", p.gracePeriodMonths !== null ? `${p.gracePeriodMonths} months` : "—"],
    ["Collateral", p.collateralRequired === null ? "—" : p.collateralRequired ? "Required" : "Not required"],
    ["Guarantor", p.guarantorRequired === null ? "—" : p.guarantorRequired ? "Required" : "Not required"],
    ["Fees", p.fees ?? "—"],
  ];

  return (
    <>
      <section className="bg-brand-deep text-white">
        <div className="container-site flex flex-col gap-4 py-8">
          <nav className="text-sm text-[#A9C4B3]"><Link href="/" className="text-[#C9DDD0]">Home</Link> / <Link href="/funding" className="text-[#C9DDD0]">Funding</Link> / <span className="text-white">{item.title}</span></nav>
          <span className="badge self-start bg-brand capitalize text-white">{p.fundingType.toLowerCase()}</span>
          <h1 className="text-4xl font-extrabold tracking-tight">{item.title}</h1>
          <span className="text-[#C9DDD0]">Offered by {p.provider.organization.tradingName ?? p.provider.organization.legalName}</span>
          <div className="flex flex-wrap gap-3.5">
            <Tile label="Funding amount or range" value={moneyRange(p.amountMin, p.amountMax, p.currency, "To be confirmed")} />
            <Tile label="Round status" value={round ? round.status.toLowerCase() : "No round announced"} />
            <Tile label="Closes" value={round?.isRolling ? "Rolling" : round?.closesAt ? `${date(round.closesAt)} (EAT)` : "—"} />
          </div>
        </div>
      </section>

      <div className="container-site flex flex-wrap items-start gap-7 py-8">
        <div className="flex min-w-0 flex-[999_1_640px] flex-col gap-5">
          <section className="card flex flex-col gap-3 p-7">
            <h2 className="text-xl font-extrabold">About this programme</h2>
            <p className="leading-relaxed text-ink-soft">{item.shortSummary}</p>
            <p className="text-sm text-ink-muted">The upper amount is a ceiling, not a guaranteed award.</p>
          </section>
          <section className="card flex flex-col p-7">
            <h2 className="mb-2 text-xl font-extrabold">Terms</h2>
            <div className="flex justify-between gap-3 border-b border-line py-3 text-[15px]"><span className="text-ink-muted">Purpose</span><span className="font-bold">{p.purpose ?? "—"}</span></div>
            {terms ? terms.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-line py-3 text-[15px]"><span className="text-ink-muted">{k}</span><span className="font-bold">{v}</span></div>
            )) : (
              <Gate title="See the full terms" text="Interest, repayment, collateral and fees, checked against the official source." modalTitle="Subscribe for full funding terms" teaser={<div className="h-48" />} />
            )}
          </section>
          <section className="card flex flex-col gap-3 p-7">
            <h2 className="text-xl font-extrabold">Who can apply</h2>
            {p.requiresRegistration ? <div className="flex gap-2.5"><Check /> Business registered in Uganda</div> : null}
            {gated ? (
              <Gate compact button="Show eligibility and documents" modalTitle="Subscribe for full funding terms" teaser={<div className="h-24" />} />
            ) : (
              <>
                {p.eligibilityText ? <p className="whitespace-pre-line text-ink-soft">{p.eligibilityText}</p> : null}
                {round?.requiredDocuments.length ? (
                  <>
                    <h3 className="font-bold">Documents you will need</h3>
                    <ul className="list-disc pl-5 text-ink-soft">{round.requiredDocuments.map((d) => <li key={d}>{d}</li>)}</ul>
                  </>
                ) : null}
              </>
            )}
          </section>
        </div>
        <aside className="flex flex-[1_1_340px] flex-col gap-5">
          <section className="card flex flex-col gap-3 p-6">
            <h2 className="text-lg font-extrabold">Apply</h2>
            <span className="text-sm text-ink-muted">Applications are made on the provider&apos;s official site.</span>
            {gated ? <Gate compact button="Get application link" modalTitle="Subscribe for full funding terms" /> : round?.applicationUrl ? <a href={round.applicationUrl} className="btn-primary" target="_blank" rel="noreferrer">Apply on official site ↗</a> : <span className="text-sm">Link not yet available</span>}
          </section>
          <Evidence contentItemId={item.id} lastReviewedAt={item.lastReviewedAt} nextReviewDueAt={item.nextReviewDueAt} viewer={viewer} back={`/funding/${item.slug}`}
            extra={<><span>Terms checked against the official source on {date(p.termsLastCheckedAt)}</span><span>Terms version dated {date(p.termsVersionDate)}</span><span>Save this programme to get a reminder before it closes.</span></>} />
          <Connected contentItemId={item.id} title="Businesses this funds" />
        </aside>
      </div>
    </>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-[1_1_220px] flex-col gap-1 rounded-2xl bg-white px-5 py-4 text-ink">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="text-xl font-extrabold capitalize">{value}</span>
    </div>
  );
}
