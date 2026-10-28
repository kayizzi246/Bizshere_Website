import { DirectoryList } from "@/components/DirectoryList";
import type { SearchParams } from "@/lib/directory-search";
import { directory } from "@/config/directories";
import { GUIDE_TABS } from "@/lib/format";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const metadata = { title: "Business information and guidelines" };

async function meta(ids: string[]) {
  const rows = await prisma.guide.findMany({ where: { contentItemId: { in: ids } } });
  return Object.fromEntries(rows.map((g) => [g.contentItemId, g.resourceType ?? ""]));
}

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  const d = directory("/guides");
  return <DirectoryList path="/guides" searchParams={searchParams} types={["GUIDE"]} tabs={GUIDE_TABS} active="/guides" meta={meta} variant="documents" title={d.title} intro={d.text} />;
}
