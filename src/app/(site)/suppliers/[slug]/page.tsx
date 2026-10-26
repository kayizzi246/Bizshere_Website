import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { date, moneyRange, yesNo } from "@/lib/format";
import { CheckBadges } from "@/components/Checks";
import { ContactCard } from "@/components/ContactCard";
import { Card, Connected, Crumbs, Evidence, Facts, Identity, Prose, Rows, TwoColumn, trackView } from "@/components/DetailParts";

export const dynamic = "force-dynamic";

export default async function SupplierPage({ params }: { params: { slug: string } }) {
  const viewer = await getViewer();
  const item = await prisma.contentItem.findFirst({
    where: { slug: params.slug, contentType: "SUPPLIER", publicationStatus: viewer.isStaff ? undefined : "PUBLISHED" },
    include: {
      checks: { orderBy: { checkedAt: "desc" } },
      primaryCategory: true,
      supplier: {
        include: {
          organization: {
            include: {
              locations: { include: { location: true }, orderBy: { isPrimary: "desc" } },
              categories: { include: { category: true } },
              // Contacts are only loaded for members.
              contacts: viewer.isMember ? { orderBy: { isPrimary: "desc" } } : false,
            },
          },
          offers: { where: { status: "PUBLISHED" }, include: { machine: { include: { contentItem: true } } } },
          listings: { orderBy: { productName: "asc" } },
        },
      },
    },
  });
  if (!item?.supplier) notFound();
  const s = item.supplier;
  const org = s.organization;
  const path = `/suppliers/${item.slug}`;
  await trackView(viewer, item.id, path);
  const primary = org.locations[0];

  return (
    <div className="container-site flex flex-col gap-7 py-6">
      <Crumbs trail={[["/machines", "Machines and suppliers"], ["/suppliers", "Suppliers"]]} title={item.title} />
      <Identity eyebrow={`Supplier${s.supplierType ? ` · ${s.supplierType.toLowerCase().replace("_", " ")}` : ""}`} title={item.title} summary={item.shortSummary ?? org.description}>
        <CheckBadges checks={item.checks} />
        <span className="text-xs text-ink-muted">A checked contact does not guarantee product quality or delivery.</span>
      </Identity>
      <Facts items={[
        ["Location", [primary?.town, primary?.location?.name].filter(Boolean).join(", ") || "—"],
        ["Sells", [s.sellsWholesale && "Wholesale", s.sellsRetail && "Retail"].filter(Boolean).join(" and ") || "—"],
        ["Delivery areas", s.deliveryAreas ?? "—"],
        ["Established", s.yearsEstablished ? String(s.yearsEstablished) : "—"],
      ]} />

      <TwoColumn
        main={<>
          {item.overview ? <Card title="About"><Prose text={item.overview} /></Card> : null}
          <Card title="Machines offered">
            {s.offers.length === 0 ? <p className="text-sm text-ink-muted">No published machine offers.</p> : s.offers.map((o) => (
              <Link key={o.id} href={`/machines/${o.machine.contentItem.slug}`} className="flex flex-wrap justify-between gap-2 border-b border-line py-3 text-ink last:border-0 hover:text-brand">
                <span className="font-bold">{o.machine.contentItem.title} <span className="font-normal text-ink-muted">· {o.condition.toLowerCase()}</span></span>
                <span className="text-sm">{viewer.isMember ? moneyRange(o.priceMin, o.priceMax, o.currency) : "Price for members"}{o.quotedAt ? ` · quoted ${date(o.quotedAt)}` : ""}</span>
              </Link>
            ))}
          </Card>
          <Card title="Products">
            {s.listings.length === 0 ? <p className="text-sm text-ink-muted">No product listings yet.</p> : (
              <div className="overflow-x-auto">
                <table className="table-base min-w-[560px]">
                  <thead><tr><th>Product</th><th>Unit</th><th>Min. order</th><th>Price</th><th>Quoted</th></tr></thead>
                  <tbody>
                    {s.listings.map((l) => (
                      <tr key={l.id}>
                        <td className="font-semibold">{l.productName}{l.specifications ? <span className="block text-xs text-ink-muted">{l.specifications}</span> : null}</td>
                        <td>{l.unit ?? "—"}</td>
                        <td>{l.minimumOrderQuantity ? Number(l.minimumOrderQuantity) : "—"}</td>
                        <td>{viewer.isMember ? moneyRange(l.priceMin, l.priceMax, l.currency, "—") : "Members"}</td>
                        <td className="text-ink-muted">{date(l.quotedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {s.brandsSupplied.length ? <span className="text-sm text-ink-muted">Brands: {s.brandsSupplied.join(", ")}</span> : null}
          </Card>
          <Card title="Terms and services">
            <Rows rows={[
              ["Minimum order", s.minimumOrder], ["Payment methods", s.paymentMethods.join(", ")], ["Lead time", s.leadTime], ["Returns", s.returnsPolicy],
              ["Installation", yesNo(s.offersInstallation)], ["Maintenance", yesNo(s.offersMaintenance)], ["Training", yesNo(s.offersTraining)],
              ["Spare parts locally", yesNo(s.sparePartsLocal)], ["Exports", yesNo(s.exportCapability)],
            ]} />
          </Card>
        </>}
        aside={<>
          <ContactCard viewer={viewer} contacts={"contacts" in org ? org.contacts : []} name={org.tradingName ?? org.legalName} />
          <Card title="Branches" className="p-6">
            {org.locations.length === 0 ? <p className="text-sm text-ink-muted">Not recorded.</p> : org.locations.map((l) => (
              <span key={l.id} className="text-sm"><strong>{l.label ?? (l.isPrimary ? "Main" : "Branch")}:</strong> {[viewer.isMember ? l.physicalAddress : null, l.town, l.location?.name].filter(Boolean).join(", ")}</span>
            ))}
          </Card>
          <Evidence contentItemId={item.id} lastReviewedAt={item.lastReviewedAt} nextReviewDueAt={item.nextReviewDueAt} viewer={viewer} back={path}
            extra={<span>{s.listingClaimed ? "Listing managed by the business" : "Listing compiled by BizSphere-Ug editors"}</span>} />
          <Connected contentItemId={item.id} />
        </>}
      />
    </div>
  );
}
