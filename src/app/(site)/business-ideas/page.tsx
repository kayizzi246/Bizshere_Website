import { DirectoryList } from "@/components/DirectoryList";
import { directory } from "@/config/directories";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const metadata = { title: "Business ideas and plans" };

async function meta(ids: string[]) {
  const rows = await prisma.businessIdea.findMany({ where: { contentItemId: { in: ids } } });
  return Object.fromEntries(rows.map((b) => [b.contentItemId, b.businessType ?? ""]));
}

export default function Page() {
  const d = directory("/business-ideas");
  return <DirectoryList types={["BUSINESS_IDEA"]} meta={meta} title={d.title} intro={d.text} />;
}
