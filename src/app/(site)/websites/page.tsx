import { DirectoryList } from "@/components/DirectoryList";
import type { SearchParams } from "@/lib/directory-search";
import { directory } from "@/config/directories";
import { GUIDE_TABS, websiteName } from "@/lib/format";
import { getViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const metadata = { title: directory("/websites").title };

async function meta(ids: string[]) {
  const rows = await prisma.usefulWebsite.findMany({ where: { contentItemId: { in: ids } } });
  return Object.fromEntries(rows.map((w) => [w.contentItemId, [w.siteType, w.mainFunction].filter(Boolean).join(" · ")]));
}

/**
 * Useful Websites as a table. A website's address is member detail unless the team set it to "Everyone,
 * free" (client, 9 Nov 2026): for a visitor who hasn't paid, the row opens the site's page, where the
 * address is locked, and the address is never sent. Members' rows go straight to the website.
 */
export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const d = directory("/websites");
  const viewer = await getViewer();
  const sites = (ids: string[]) => prisma.usefulWebsite.findMany({
    where: { contentItemId: { in: ids } },
    select: { contentItemId: true, canonicalUrl: true, siteType: true, contentItem: { select: { title: true, accessLevel: true } } },
  });
  const open = (accessLevel: string) => viewer.isMember || accessLevel === "PUBLIC";

  // Each row a member may follow goes straight to the website (only https or http addresses).
  async function links(ids: string[]) {
    const rows = await sites(ids);
    return Object.fromEntries(rows.filter((w) => open(w.contentItem.accessLevel) && /^https?:\/\//.test(w.canonicalUrl)).map((w) => [w.contentItemId, w.canonicalUrl]));
  }
  // Names typed as an address show as the domain, or for a locked row as the kind of site
  async function names(ids: string[]) {
    const rows = await sites(ids);
    return Object.fromEntries(rows.map((w) => [w.contentItemId, websiteName(w.contentItem.title, { hideAddress: !open(w.contentItem.accessLevel), siteType: w.siteType })]));
  }

  return <DirectoryList path="/websites" searchParams={searchParams} types={["WEBSITE"]} tabs={GUIDE_TABS} active="/websites" meta={meta} links={links} names={names} variant="table" title={d.title} intro={d.text} />;
}
