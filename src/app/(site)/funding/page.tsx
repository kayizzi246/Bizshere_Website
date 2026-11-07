import { DirectoryList } from "@/components/DirectoryList";
import type { SearchParams } from "@/lib/directory-search";
import { directory } from "@/config/directories";
import { FUNDING_TABS } from "@/lib/format";
import { getViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const metadata = { title: directory("/funding").title };

const fundType = (t: string) => t.charAt(0) + t.slice(1).toLowerCase();

/**
 * Funding Sources as a table. Members see who gives it and what it is for, and Apply now takes them
 * straight to the provider's own page. Visitors who haven't paid see the fund type only, and their
 * Apply now opens the join and payment pop-up: the apply address is never sent to them.
 */
export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const d = directory("/funding");
  const viewer = await getViewer();
  const programmes = (ids: string[]) => prisma.fundingProgramme.findMany({ where: { contentItemId: { in: ids } }, include: { provider: { include: { organization: true } } } });

  async function meta(ids: string[]) {
    const rows = await programmes(ids);
    return Object.fromEntries(rows.map((p) => [p.contentItemId, viewer.isMember
      ? [fundType(p.fundingType), p.provider.organization.tradingName ?? p.provider.organization.legalName, p.providerCategory ?? p.provider.providerCategory].filter(Boolean).join(" · ")
      : fundType(p.fundingType)]));
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
    <DirectoryList path="/funding" searchParams={searchParams} types={["FUNDING_PROGRAMME"]} tabs={FUNDING_TABS} active="/funding" meta={meta} variant="table" title={d.title} intro={d.text}
      {...(viewer.isMember ? { apply } : { applyLocked: true })} />
  );
}
