import { DirectoryList } from "@/components/DirectoryList";
import { GUIDE_TABS } from "@/lib/format";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const metadata = { title: "Tools and templates" };

async function meta(ids: string[]) {
  const rows = await prisma.tool.findMany({ where: { contentItemId: { in: ids } }, include: { versions: { where: { superseded: false }, orderBy: { releasedAt: "desc" }, take: 1 } } });
  return Object.fromEntries(rows.map((t) => [t.contentItemId, [t.toolType.toLowerCase(), t.fileFormat, t.versions[0] ? `v${t.versions[0].versionNumber}` : null].filter(Boolean).join(" · ")]));
}

export default function Page() {
  return <DirectoryList types={["TOOL"]} tabs={GUIDE_TABS} active="/tools" meta={meta} title="Tools and templates" intro="Calculators, templates and checklists, each with its version and limitations." />;
}
