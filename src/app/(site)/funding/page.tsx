import { DirectoryList } from "@/components/DirectoryList";
import type { SearchParams } from "@/lib/directory-search";
import { directory } from "@/config/directories";
import { compactRange, FUNDING_TABS } from "@/lib/format";
import { getViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const metadata = { title: directory("/funding").title };

const fundType = (t: string) => t.charAt(0) + t.slice(1).toLowerCase();

/**
 * Funding Sources as the client's template table (Nov 2026): S/N, Fund Name, Funds Provider, Fund Type,
 * Country, Purpose and Funding Range. The range is member detail: visitors who haven't paid see a lock
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
        { label: "Funds provider", value: org.tradingName ?? org.legalName },
        { label: "Fund type", value: fundType(p.fundingType) },
        { label: "Country", value: p.provider.country },
        { label: "Purpose", value: p.purpose },
        { label: "Funding range", value: locked ? null : range, locked },
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
    <DirectoryList path="/funding" searchParams={searchParams} types={["FUNDING_PROGRAMME"]} tabs={FUNDING_TABS} active="/funding" cells={cells} variant="table" title={d.title} intro={d.text}
      {...(viewer.isMember ? { apply } : { applyLocked: true })} />
  );
}
