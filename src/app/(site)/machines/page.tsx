import { DirectoryList } from "@/components/DirectoryList";
import type { SearchParams } from "@/lib/directory-search";
import { directory, directoryMetadata } from "@/config/directories";
import { MACHINE_TABS, moneyRange } from "@/lib/format";
import { getViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const metadata = directoryMetadata("/machines");

// Public fields only: price and source are member detail (see facts).
async function meta(ids: string[]) {
  const rows = await prisma.machine.findMany({ where: { contentItemId: { in: ids } } });
  return Object.fromEntries(rows.map((m) => [m.contentItemId, [m.machineType, m.function].filter(Boolean).join(" · ")]));
}

async function images(ids: string[]) {
  const rows = await prisma.machine.findMany({ where: { contentItemId: { in: ids }, pictureUrl: { not: null } }, select: { contentItemId: true, pictureUrl: true } });
  return Object.fromEntries(rows.map((m) => [m.contentItemId, m.pictureUrl!]));
}

/**
 * Source and price on each card. Members get the values; everyone else only `locked`, so the
 * member detail never reaches a visitor's browser.
 */
async function facts(ids: string[]) {
  const viewer = await getViewer();
  if (!viewer.isMember) return Object.fromEntries(ids.map((id) => [id, { locked: true }]));
  const rows = await prisma.machine.findMany({ where: { contentItemId: { in: ids } }, select: { contentItemId: true, sources: true, priceMin: true, priceMax: true, currency: true } });
  return Object.fromEntries(rows.map((m) => [m.contentItemId, {
    // The first line of "where to buy", e.g. "Kampala dealers"
    source: m.sources?.split(/\r?\n/).map((s) => s.replace(/^[-•*]\s*/, "").trim()).find(Boolean) ?? null,
    price: m.priceMin != null || m.priceMax != null ? moneyRange(m.priceMin, m.priceMax, m.currency) : null,
  }]));
}

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  const d = directory("/machines");
  return <DirectoryList path="/machines" searchParams={searchParams} types={["MACHINE"]} tabs={MACHINE_TABS} active="/machines" meta={meta} images={images} facts={facts} title={d.title} intro={d.text} />;
}
