import { DirectoryList } from "@/components/DirectoryList";
import type { SearchParams } from "@/lib/directory-search";
import { directory, directoryMetadata } from "@/config/directories";
import { MACHINE_TABS } from "@/lib/format";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const metadata = directoryMetadata("/suppliers");

// Public fields only: email and phone are member detail.
async function meta(ids: string[]) {
  const rows = await prisma.supplier.findMany({ where: { contentItemId: { in: ids } } });
  return Object.fromEntries(rows.map((s) => [s.contentItemId, [
    s.supplierType && s.supplierType.charAt(0) + s.supplierType.slice(1).toLowerCase().replace(/_/g, " "),
    s.country,
    s.items.length ? s.items.slice(0, 3).join(", ") + (s.items.length > 3 ? "…" : "") : null,
  ].filter(Boolean).join(" · ")]));
}

// The table's contact person, country and what they sell. All public.
async function cells(ids: string[]) {
  const rows = await prisma.supplier.findMany({ where: { contentItemId: { in: ids } }, select: { contentItemId: true, contactPerson: true, country: true, items: true } });
  return Object.fromEntries(rows.map((s) => [s.contentItemId, [
    { label: "Contact person", value: s.contactPerson },
    { label: "Country", value: s.country },
    { label: "Sells", value: s.items.slice(0, 6).join(", ") + (s.items.length > 6 ? "…" : "") || null },
  ]]));
}

// Their own photo or logo first, then a product's.
async function images(ids: string[]) {
  const rows = await prisma.supplier.findMany({
    where: { contentItemId: { in: ids } },
    select: {
      contentItemId: true, pictureUrl: true, organization: { select: { logoUrl: true } },
      listings: { where: { status: "PUBLISHED", imageUrl: { not: null } }, select: { imageUrl: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  return Object.fromEntries(rows.flatMap((s) => {
    const picture = s.organization.logoUrl || s.pictureUrl || s.listings[0]?.imageUrl;
    return picture ? [[s.contentItemId, picture]] : [];
  }));
}

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  const d = directory("/suppliers");
  return <DirectoryList path="/suppliers" searchParams={searchParams} types={["SUPPLIER"]} tabs={MACHINE_TABS} active="/suppliers" meta={meta} cells={cells} images={images} variant="suppliers" title={d.title} intro={d.text} />;
}
