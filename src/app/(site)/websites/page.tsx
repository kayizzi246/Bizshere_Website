import { DirectoryList } from "@/components/DirectoryList";
import type { SearchParams } from "@/lib/directory-search";
import { directory } from "@/config/directories";
import { GUIDE_TABS } from "@/lib/format";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const metadata = { title: "Useful websites" };

async function meta(ids: string[]) {
  const rows = await prisma.usefulWebsite.findMany({ where: { contentItemId: { in: ids } } });
  return Object.fromEntries(rows.map((w) => [w.contentItemId, [w.siteType, w.mainFunction].filter(Boolean).join(" · ")]));
}

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  const d = directory("/websites");
  return <DirectoryList path="/websites" searchParams={searchParams} types={["WEBSITE"]} tabs={GUIDE_TABS} active="/websites" meta={meta} title={d.title} intro={d.text} />;
}
