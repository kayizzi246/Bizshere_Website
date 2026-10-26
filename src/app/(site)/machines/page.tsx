import { DirectoryList } from "@/components/DirectoryList";
import { MACHINE_TABS } from "@/lib/format";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const metadata = { title: "Machines" };

async function meta(ids: string[]) {
  const rows = await prisma.machine.findMany({ where: { contentItemId: { in: ids } }, include: { _count: { select: { offers: { where: { status: "PUBLISHED" } } } } } });
  return Object.fromEntries(rows.map((m) => [m.contentItemId, [
    m.capacityMax ? `Up to ${m.capacityMax} ${m.capacityUnit ?? ""}` : null,
    m.powerSource, m.voltage ? `${m.voltage} V` : null, m.phase ? `${m.phase}-phase` : null,
    `${m._count.offers} seller offer(s)`,
  ].filter(Boolean).join(" · ")]));
}

export default function Page() {
  return <DirectoryList types={["MACHINE"]} tabs={MACHINE_TABS} active="/machines" meta={meta} title="Machines" intro="Specifications and dated offers from different sellers." />;
}
