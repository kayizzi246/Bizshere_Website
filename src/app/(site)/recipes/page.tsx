import { DirectoryList } from "@/components/DirectoryList";
import { GUIDE_TABS, minutes } from "@/lib/format";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const metadata = { title: "Recipes" };

async function meta(ids: string[]) {
  const rows = await prisma.recipe.findMany({ where: { contentItemId: { in: ids } } });
  return Object.fromEntries(rows.map((r) => [r.contentItemId, [
    r.yieldQuantity ? `Makes ${r.yieldQuantity} ${r.yieldUnit ?? ""}` : null,
    r.prepMinutes !== null || r.cookMinutes !== null ? `${minutes((r.prepMinutes ?? 0) + (r.cookMinutes ?? 0))} total` : null,
  ].filter(Boolean).join(" · ")]));
}

export default function Page() {
  return <DirectoryList types={["RECIPE"]} tabs={GUIDE_TABS} active="/recipes" meta={meta} title="Recipes" intro="Recipes for food businesses, with batch yields and dated costings." />;
}
