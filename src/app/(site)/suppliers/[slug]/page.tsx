import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { moneyRange } from "@/lib/format";
import { CheckBadges } from "@/components/Checks";
import { trackView } from "@/components/DetailParts";
import { extLink, RecordPage, list, titleCase } from "@/components/RecordPage";
import { SupplierCatalog, type CatalogItem } from "@/components/SupplierCatalog";

export const dynamic = "force-dynamic";

// Client fields: Supplier Name, Type, Category, Country, Items, Email, Phone, Website, plus a photo
// and the product catalog (added in the admin or by the supplier at /supplier).
export default async function SupplierPage({ params }: { params: { slug: string } }) {
  const viewer = await getViewer();
  const item = await prisma.contentItem.findFirst({
    where: { slug: params.slug, contentType: "SUPPLIER", publicationStatus: viewer.isStaff ? undefined : "PUBLISHED" },
    include: {
      primaryCategory: true, checks: true,
      supplier: { include: { organization: { select: { logoUrl: true } }, listings: { where: { status: "PUBLISHED" }, orderBy: { createdAt: "desc" } } } },
    },
  });
  if (!item || !item.supplier) notFound();
  const s = item.supplier;
  const path = `/suppliers/${item.slug}`;
  await trackView(viewer, item.id, path);

  // Email, phone and catalog prices are member-only and are not passed on for visitors.
  const gated = item.accessLevel !== "PUBLIC" && !viewer.isMember;
  const catalog: CatalogItem[] = s.listings.map((l) => ({
    id: l.id, name: l.productName, image: l.imageUrl, unit: l.unit, availability: l.availability, text: l.specifications,
    price: gated || (l.priceMin === null && l.priceMax === null) ? null : moneyRange(l.priceMin, l.priceMax, l.currency),
  }));
  const { listings: _listings, organization: _org, ...record } = s;

  return (
    <RecordPage
      layout="product"
      trail={["/suppliers", "Trusted Suppliers"]}
      eyebrow={`Supplier · ${item.primaryCategory?.name ?? titleCase(s.supplierType) ?? "Business"}`}
      title={item.title}
      brief={item.shortSummary}
      picture={s.pictureUrl ?? s.organization.logoUrl}
      pictureCredit={s.pictureCredit}
      rows={[
        { label: "Type", value: titleCase(s.supplierType) },
        { label: "Category", value: item.primaryCategory?.name },
        { label: "Country", value: s.country },
        { label: "Items", value: list(s.items) },
        { label: "Website", value: extLink(s.website) },
        { label: "Checks", value: item.checks.length ? <CheckBadges checks={item.checks} /> : null },
      ]}
      texts={item.overview ? [{ label: "About", text: item.overview }] : []}
      contact={gated ? "locked" : { email: s.email, phone: s.phone }}
      catalog={<SupplierCatalog items={catalog} gated={gated} back={path} />}
      hideSections={["listings"]}
      details={{ type: "SUPPLIER", record: record as unknown as Record<string, unknown>, gated: gated }}
      viewer={viewer}
      item={item}
      back={path}
      gateTitle="Subscribe to contact suppliers"
    />
  );
}
