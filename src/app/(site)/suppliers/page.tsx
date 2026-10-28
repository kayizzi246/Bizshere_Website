import { DirectoryList } from "@/components/DirectoryList";
import type { SearchParams } from "@/lib/directory-search";
import { directory } from "@/config/directories";
import { MACHINE_TABS } from "@/lib/format";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const metadata = { title: "Suppliers" };

// Public fields only: email and phone are member detail.
async function meta(ids: string[]) {
  const rows = await prisma.supplier.findMany({ where: { contentItemId: { in: ids } } });
  return Object.fromEntries(rows.map((s) => [s.contentItemId, [
    s.supplierType && s.supplierType.charAt(0) + s.supplierType.slice(1).toLowerCase().replace(/_/g, " "),
    s.country,
    s.items.length ? s.items.slice(0, 3).join(", ") + (s.items.length > 3 ? "…" : "") : null,
  ].filter(Boolean).join(" · ")]));
}

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  const d = directory("/suppliers");
  return <DirectoryList path="/suppliers" searchParams={searchParams} types={["SUPPLIER"]} tabs={MACHINE_TABS} active="/suppliers" meta={meta} title={d.title} intro={d.text} />;
}
