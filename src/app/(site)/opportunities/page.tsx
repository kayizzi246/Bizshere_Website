import { DirectoryList } from "@/components/DirectoryList";
import type { SearchParams } from "@/lib/directory-search";
import { FUNDING_TABS, date, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const metadata = { title: "Investment opportunities" };

async function meta(ids: string[]) {
  const rows = await prisma.investmentOpportunity.findMany({ where: { contentItemId: { in: ids } } });
  return Object.fromEntries(rows.map((o) => [o.contentItemId, [
    o.sector, o.capitalSought !== null ? `Seeking ${money(o.capitalSought, o.currency)}` : null, o.deadline ? `Deadline ${date(o.deadline)}` : null,
  ].filter(Boolean).join(" · ")]));
}

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return <DirectoryList path="/opportunities" searchParams={searchParams} types={["INVESTMENT_OPPORTUNITY"]} tabs={FUNDING_TABS} active="/opportunities" meta={meta} title="Investment opportunities" intro="Projects seeking investors. Return figures are the promoter's claims, not established outcomes." />;
}
