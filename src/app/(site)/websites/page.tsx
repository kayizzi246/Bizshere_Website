import { DirectoryList } from "@/components/DirectoryList";
import { GUIDE_TABS } from "@/lib/format";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const metadata = { title: "Useful websites" };

async function meta(ids: string[]) {
  const rows = await prisma.usefulWebsite.findMany({ where: { contentItemId: { in: ids } } });
  return Object.fromEntries(rows.map((w) => [w.contentItemId, [w.mainFunction, w.accessCost?.toLowerCase(), w.officialSite ? "official site" : null].filter(Boolean).join(" · ")]));
}

export default function Page() {
  return <DirectoryList types={["WEBSITE"]} tabs={GUIDE_TABS} active="/websites" meta={meta} title="Useful websites" intro="Official portals and services for businesses, with what each is useful for and whether it is free." />;
}
