import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewer, FREE_PREVIEW } from "@/lib/access";
import { date, isOlderThan, moneyRange } from "@/lib/format";
import { Gate } from "@/components/Gate";
import { CheckBadges } from "@/components/Checks";
import { Evidence } from "@/components/DetailParts";

export const dynamic = "force-dynamic";

export default async function MachinePage({ params }: { params: { slug: string } }) {
  const viewer = await getViewer();
  const item = await prisma.contentItem.findFirst({
    where: { slug: params.slug, contentType: "MACHINE", publicationStatus: viewer.isStaff ? undefined : "PUBLISHED" },
    include: {
      primaryCategory: true,
      relatedTo: { include: { fromItem: true } },
      machine: {
        include: {
          offers: {
            where: { status: "PUBLISHED" },
            orderBy: [{ priceMin: "asc" }],
            include: {
              supplier: {
                include: {
                  contentItem: { include: { checks: true } },
                  // Contacts are only queried for members.
                  organization: { include: { locations: { where: { isPrimary: true }, include: { location: true } }, contacts: viewer.isMember ? { where: { isPrimary: true } } : false } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!item || !item.machine) notFound();
  const m = item.machine;

  const specs: [string, string][] = [
    ["Capacity", m.capacityMin || m.capacityMax ? `${m.capacityMin ?? ""}${m.capacityMax ? `–${m.capacityMax}` : ""} ${m.capacityUnit ?? ""}` : "—"],
    ["Power source", m.powerSource ?? "—"],
    ["Voltage and phase", m.voltage ? `${m.voltage} V${m.phase ? ` · ${m.phase}-phase` : ""}` : "—"],
    ["Rated power", m.ratedPowerKw ? `${m.ratedPowerKw} kW` : "—"],
    ["Dimensions", m.dimensions ?? "—"],
    ["Weight", m.weightKg ? `${m.weightKg} kg` : "—"],
    ["Operators", m.operatorsRequired ? String(m.operatorsRequired) : "—"],
    ["Maintenance", m.maintenance ?? "—"],
  ];
  const gated = item.accessLevel !== "PUBLIC" && !viewer.isMember;
  const shownSpecs = gated ? specs.slice(0, FREE_PREVIEW.specs) : specs;

  return (
    <div className="container-site flex flex-col gap-7 py-6">
      <nav className="text-sm text-ink-muted"><Link href="/">Home</Link> / <Link href="/machines">Machines</Link> / <span className="text-ink">{item.title}</span></nav>
      <section className="flex flex-col gap-3">
        <span className="eyebrow">Machine · {item.primaryCategory?.name ?? "Equipment"}</span>
        <h1 className="text-4xl font-extrabold tracking-tight">{item.title}</h1>
        <span className="text-ink-muted">{[m.brand, m.modelNumber && `model ${m.modelNumber}`].filter(Boolean).join(" · ")}</span>
        {item.shortSummary ? <p className="max-w-3xl leading-relaxed text-ink-soft">{item.shortSummary}</p> : null}
      </section>

      <section className="card flex flex-col gap-3.5 p-7">
        <h2 className="text-xl font-extrabold">Supplier offers ({m.offers.length})</h2>
        <p className="text-sm text-ink-muted">Quoted purchase price only. Delivery, tax and installation are listed per offer.</p>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="table-base min-w-[820px]">
            <thead><tr><th>Supplier</th><th>Condition</th><th>Price</th><th>Includes</th><th>Contact</th></tr></thead>
            <tbody>
              {m.offers.map((o) => {
                const org = o.supplier.organization;
                const contact = viewer.isMember && "contacts" in org ? org.contacts[0] : undefined;
                const stale = isOlderThan(o.quotedAt, 90) || (o.validUntil && o.validUntil < new Date());
                return (
                  <tr key={o.id}>
                    <td>
                      <div className="flex flex-col gap-1">
                        <Link href={`/suppliers/${o.supplier.contentItem.slug}`} className="font-bold text-ink">{org.tradingName ?? org.legalName}</Link>
                        <span className="text-ink-muted">{org.locations[0]?.location?.name ?? ""}</span>
                        <CheckBadges checks={o.supplier.contentItem.checks} />
                        {stale ? <span className="badge-warn self-start">Quote may be out of date</span> : null}
                      </div>
                    </td>
                    <td className="capitalize">{o.condition.toLowerCase()}</td>
                    <td><div className="flex flex-col"><span className="font-extrabold">{moneyRange(o.priceMin, o.priceMax, o.currency)}</span><span className="text-xs text-ink-muted">Quoted {date(o.quotedAt)}{o.validUntil ? ` · valid to ${date(o.validUntil)}` : ""}</span></div></td>
                    <td className="text-ink-soft">{[o.installationSupport && "Installation", o.trainingSupport && "Training", o.warrantyMonths !== null && `${o.warrantyMonths}-month warranty`].filter(Boolean).join(", ") || "—"}</td>
                    <td>
                      {viewer.isMember ? (
                        contact ? (
                          <div className="flex flex-col gap-1 text-sm">
                            {contact.phone ? <a href={`tel:${contact.phone}`}>{contact.phone}</a> : null}
                            {contact.whatsapp ? <a href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`}>WhatsApp</a> : null}
                            {contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : null}
                          </div>
                        ) : <span className="text-ink-muted">No contact on file</span>
                      ) : (
                        <Gate compact button="Show contact" modalTitle="Subscribe to contact suppliers" />
                      )}
                    </td>
                  </tr>
                );
              })}
              {m.offers.length === 0 ? <tr><td colSpan={5} className="text-ink-muted">No published offers yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-wrap gap-6">
        <section className="card flex flex-[999_1_560px] flex-col p-7">
          <h2 className="mb-2 text-xl font-extrabold">Specifications</h2>
          {shownSpecs.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-line py-3 text-[15px]"><span className="text-ink-muted">{k}</span><span className="font-bold">{v}</span></div>
          ))}
          {gated ? <Gate compact button="Show full specifications" teaser={<div className="h-32" />} /> : null}
        </section>
        <section className="card flex flex-[1_1_340px] flex-col gap-2.5 self-start p-6">
          <h2 className="text-lg font-extrabold">Used in these businesses</h2>
          {item.relatedTo.filter((r) => r.fromItem.contentType === "BUSINESS_IDEA").map((r) => (
            <Link key={r.fromItemId} href={`/business-ideas/${r.fromItem.slug}`} className="font-semibold">{r.fromItem.title} →</Link>
          ))}
        </section>
      </div>
      <Evidence contentItemId={item.id} lastReviewedAt={item.lastReviewedAt} nextReviewDueAt={item.nextReviewDueAt} viewer={viewer} back={`/machines/${item.slug}`}
        extra={<span>Quoted prices are purchase prices only. Delivery, tax and installation are extra unless an offer says otherwise.</span>} />
    </div>
  );
}
