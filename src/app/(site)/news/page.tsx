import { DirectoryList } from "@/components/DirectoryList";
import type { SearchParams } from "@/lib/directory-search";
import { directory } from "@/config/directories";
import { GUIDE_TABS, date } from "@/lib/format";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const metadata = { title: "Business news" };

async function meta(ids: string[]) {
  const rows = await prisma.newsArticle.findMany({ where: { contentItemId: { in: ids } }, include: { contentItem: { select: { publishedAt: true } } } });
  return Object.fromEntries(rows.map((n) => [n.contentItemId, [n.articleType.toLowerCase(), n.publisher, `published ${date(n.contentItem.publishedAt)}`].filter(Boolean).join(" · ")]));
}

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return <DirectoryList path="/news" searchParams={searchParams} types={["NEWS"]} tabs={GUIDE_TABS} active="/news" meta={meta} title={directory("/news").title} intro={directory("/news").text} />;
}
