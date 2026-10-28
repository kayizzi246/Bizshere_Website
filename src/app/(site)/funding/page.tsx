import { DirectoryList } from "@/components/DirectoryList";
import type { SearchParams } from "@/lib/directory-search";
import { directory } from "@/config/directories";
import { FUNDING_TABS } from "@/lib/format";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const metadata = { title: "Funding sources" };

// Public fields only: the amount is member detail.
async function meta(ids: string[]) {
  const rows = await prisma.fundingProgramme.findMany({ where: { contentItemId: { in: ids } }, include: { provider: { include: { organization: true } } } });
  return Object.fromEntries(rows.map((p) => [p.contentItemId, [
    p.fundingType.charAt(0) + p.fundingType.slice(1).toLowerCase(),
    p.provider.organization.tradingName ?? p.provider.organization.legalName,
    p.providerCategory ?? p.provider.providerCategory,
  ].filter(Boolean).join(" · ")]));
}

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  const d = directory("/funding");
  return <DirectoryList path="/funding" searchParams={searchParams} types={["FUNDING_PROGRAMME"]} tabs={FUNDING_TABS} active="/funding" meta={meta} title={d.title} intro={d.text} />;
}
