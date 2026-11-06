import { DirectoryList } from "@/components/DirectoryList";
import type { SearchParams } from "@/lib/directory-search";
import { directory } from "@/config/directories";
import { MACHINE_TABS } from "@/lib/format";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const metadata = { title: directory("/suppliers").title };

// Public fields only: email and phone are member detail.
async function meta(ids: string[]) {
  const rows = await prisma.supplier.findMany({ where: { contentItemId: { in: ids } } });
  return Object.fromEntries(rows.map((s) => [s.contentItemId, [
    s.supplierType && s.supplierType.charAt(0) + s.supplierType.slice(1).toLowerCase().replace(/_/g, " "),
    s.country,
    s.items.length ? s.items.slice(0, 3).join(", ") + (s.items.length > 3 ? "…" : "") : null,
  ].filter(Boolean).join(" · ")]));
}

// The card's country and what they sell. Both are public.
async function facts(ids: string[]) {
  const rows = await prisma.supplier.findMany({ where: { contentItemId: { in: ids } }, select: { contentItemId: true, country: true, items: true } });
  return Object.fromEntries(rows.map((s) => [s.contentItemId, { country: s.country, sells: s.items.slice(0, 4).join(", ") || null }]));
}

// The card shows what they sell first: the newest approved product with a photo, then their own photo or logo.
async function images(ids: string[]) {
  const rows = await prisma.supplier.findMany({
    where: { contentItemId: { in: ids } },
    select: {
      contentItemId: true, pictureUrl: true, organization: { select: { logoUrl: true } },
      listings: { where: { status: "PUBLISHED", imageUrl: { not: null } }, select: { imageUrl: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  return Object.fromEntries(rows.flatMap((s) => {
    const picture = s.listings[0]?.imageUrl || s.pictureUrl || s.organization.logoUrl;
    return picture ? [[s.contentItemId, picture]] : [];
  }));
}

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  const d = directory("/suppliers");
  return <DirectoryList path="/suppliers" searchParams={searchParams} types={["SUPPLIER"]} tabs={MACHINE_TABS} active="/suppliers" meta={meta} facts={facts} images={images} variant="suppliers" title={d.title} intro={d.text} />;
}
