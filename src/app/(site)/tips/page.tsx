import { DirectoryList } from "@/components/DirectoryList";
import type { SearchParams } from "@/lib/directory-search";
import { directory, directoryMetadata } from "@/config/directories";
import { GUIDE_TABS } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = directoryMetadata("/tips");

/** How many members have remarked on each tip, under its card. */
async function meta(ids: string[]) {
  const rows = await prisma.businessTip.findMany({ where: { contentItemId: { in: ids } }, select: { contentItemId: true, _count: { select: { remarks: { where: { hiddenAt: null } } } } } });
  return Object.fromEntries(rows.filter((r) => r._count.remarks).map((r) => [r.contentItemId, `${r._count.remarks} member remark${r._count.remarks === 1 ? "" : "s"}`]));
}

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  const d = directory("/tips");
  return <DirectoryList path="/tips" searchParams={searchParams} types={["BUSINESS_TIP"]} tabs={GUIDE_TABS} active="/tips" meta={meta} title={d.title} intro={d.text} />;
}
