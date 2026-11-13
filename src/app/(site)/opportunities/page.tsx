import { DirectoryList } from "@/components/DirectoryList";
import type { SearchParams } from "@/lib/directory-search";
import { FUNDING_TABS, date, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const metadata = { title: "Investment opportunities" };

/**
 * Investment opportunities in the same job-board style list as Funding Sources (DirectoryBoard; client, 13 Nov 2026).
 * Every detail on the card is public on the opportunity's own page too: promoter, type, location, sector, capital
 * sought, business stage, deadline and intended use of funds. The proposed terms stay member detail there.
 */
async function cells(ids: string[]) {
  const rows = await prisma.investmentOpportunity.findMany({
    where: { contentItemId: { in: ids } },
    include: { promoterOrganization: { select: { tradingName: true, legalName: true } }, contentItem: { select: { coverageNotes: true } } },
  });
  return Object.fromEntries(rows.map((o) => [o.contentItemId, [
    { label: "By", value: o.promoterOrganization?.tradingName ?? o.promoterOrganization?.legalName ?? o.promoter },
    { label: "Type", value: o.opportunityType },
    { label: "Where", value: o.contentItem.coverageNotes },
    { label: "Sector", value: o.sector },
    { label: "Amount", value: o.capitalSought !== null ? `Seeking ${money(o.capitalSought, o.currency)}` : null },
    { label: "Stage", value: o.businessStage },
    { label: "Deadline", value: o.deadline ? date(o.deadline) : null },
    { label: "For", value: o.useOfFunds },
  ]]));
}

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return <DirectoryList path="/opportunities" searchParams={searchParams} types={["INVESTMENT_OPPORTUNITY"]} tabs={FUNDING_TABS} active="/opportunities" cells={cells} variant="funding" title="Investment opportunities" intro="Projects seeking investors. Return figures are the promoter's claims, not established outcomes." />;
}
