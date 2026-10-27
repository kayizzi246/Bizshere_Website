import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { CheckBadges } from "@/components/Checks";
import { trackView } from "@/components/DetailParts";
import { extLink, RecordPage, list, titleCase } from "@/components/RecordPage";

export const dynamic = "force-dynamic";

// Client fields: Supplier Name, Type, Category, Country, Items, Email, Phone, Website
export default async function SupplierPage({ params }: { params: { slug: string } }) {
  const viewer = await getViewer();
  const item = await prisma.contentItem.findFirst({
    where: { slug: params.slug, contentType: "SUPPLIER", publicationStatus: viewer.isStaff ? undefined : "PUBLISHED" },
    include: { primaryCategory: true, checks: true, supplier: true },
  });
  if (!item || !item.supplier) notFound();
  const s = item.supplier;
  const path = `/suppliers/${item.slug}`;
  await trackView(viewer, item.id, path);

  // Email and phone are member-only and are not passed on for visitors.
  const gated = item.accessLevel !== "PUBLIC" && !viewer.isMember;

  return (
    <RecordPage
      trail={["/suppliers", "Suppliers"]}
      eyebrow={`Supplier · ${item.primaryCategory?.name ?? titleCase(s.supplierType) ?? "Business"}`}
      title={item.title}
      brief={item.shortSummary}
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
      viewer={viewer}
      item={item}
      back={path}
      gateTitle="Subscribe to contact suppliers"
    />
  );
}
