import { DirectoryList } from "@/components/DirectoryList";
import type { SearchParams } from "@/lib/directory-search";
import { directory, directoryMetadata } from "@/config/directories";
import { compactRange, FUNDING_TABS } from "@/lib/format";
import { getViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const metadata = directoryMetadata("/funding");

const fundType = (t: string) => t.charAt(0) + t.slice(1).toLowerCase();

/**
 * Funding Sources as a job-board style list (client, 13 Nov 2026; was the template table): one card per fund
 * with its provider, fund type, country, purpose and funding range (DirectoryBoard). The range is member detail: visitors who haven't paid see a lock
 * and the figure is never sent. Apply now takes members straight to the provider's own page; for
 * everyone else it opens the join and payment pop-up, and the apply address is never sent to them.
 */
export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const d = directory("/funding");
  const viewer = await getViewer();
  const programmes = (ids: string[]) => prisma.fundingProgramme.findMany({
    where: { contentItemId: { in: ids } },
    include: { contentItem: { select: { accessLevel: true } }, provider: { include: { organization: true } } },
  });

  async function cells(ids: string[]) {
    const rows = await programmes(ids);
    return Object.fromEntries(rows.map((p) => {
      const org = p.provider.organization;
      const range = compactRange(p.amountMin, p.amountMax, p.currency) ?? p.amountBasis;
      const locked = Boolean(range) && p.contentItem.accessLevel !== "PUBLIC" && !viewer.isMember;
      return [p.contentItemId, [
        // Labels the card reads (DirectoryBoard): By, Type, Where, For, Amount
        { label: "By", value: org.tradingName ?? org.legalName },
        { label: "Type", value: fundType(p.fundingType) },
        { label: "Where", value: p.provider.country },
        { label: "For", value: p.purpose },
        { label: "Amount", value: locked ? null : range, locked },
      ]];
    }));
  }
  // Where to apply: the programme's own link, or else the provider's website
  async function apply(ids: string[]) {
    const rows = await programmes(ids);
    const links: Record<string, string> = {};
    for (const p of rows) {
      const url = p.officialTermsUrl ?? p.provider.organization.website;
      if (url && /^https?:\/\//.test(url)) links[p.contentItemId] = url;
    }
    return links;
  }

  return (
    <DirectoryList path="/funding" searchParams={searchParams} types={["FUNDING_PROGRAMME"]} tabs={FUNDING_TABS} active="/funding" cells={cells} variant="funding" title={d.title} intro={d.text}
      {...(viewer.isMember ? { apply } : { applyLocked: true })} />
  );
}
