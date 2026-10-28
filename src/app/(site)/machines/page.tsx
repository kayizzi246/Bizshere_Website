import { DirectoryList } from "@/components/DirectoryList";
import type { SearchParams } from "@/lib/directory-search";
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

async function images(ids: string[]) {
  const rows = await prisma.machine.findMany({ where: { contentItemId: { in: ids }, pictureUrl: { not: null } }, select: { contentItemId: true, pictureUrl: true } });
  return Object.fromEntries(rows.map((m) => [m.contentItemId, m.pictureUrl!]));
}

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  const d = directory("/machines");
  return <DirectoryList path="/machines" searchParams={searchParams} types={["MACHINE"]} tabs={MACHINE_TABS} active="/machines" meta={meta} images={images} title={d.title} intro={d.text} />;
}
