import { DirectoryList } from "@/components/DirectoryList";
import { directory } from "@/config/directories";
import { MACHINE_TABS } from "@/lib/format";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const metadata = { title: "Business machines" };

// Public fields only: price and source are member detail.
async function meta(ids: string[]) {
  const rows = await prisma.machine.findMany({ where: { contentItemId: { in: ids } } });
  return Object.fromEntries(rows.map((m) => [m.contentItemId, [m.machineType, m.function].filter(Boolean).join(" · ")]));
}

export default function Page() {
  const d = directory("/machines");
  return <DirectoryList types={["MACHINE"]} tabs={MACHINE_TABS} active="/machines" meta={meta} title={d.title} intro={d.text} />;
}
