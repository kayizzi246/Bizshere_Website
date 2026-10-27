import { DirectoryList } from "@/components/DirectoryList";
import { directory } from "@/config/directories";
import { GUIDE_TABS } from "@/lib/format";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const metadata = { title: "Business tools" };

async function meta(ids: string[]) {
  const rows = await prisma.tool.findMany({ where: { contentItemId: { in: ids } } });
  return Object.fromEntries(rows.map((t) => [t.contentItemId, [t.toolType.charAt(0) + t.toolType.slice(1).toLowerCase(), t.downloadUrl ? "download available" : null].filter(Boolean).join(" · ")]));
}

export default function Page() {
  const d = directory("/tools");
  return <DirectoryList types={["TOOL"]} tabs={GUIDE_TABS} active="/tools" meta={meta} title={d.title} intro={d.text} />;
}
