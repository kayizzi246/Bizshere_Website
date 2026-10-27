import { DirectoryList } from "@/components/DirectoryList";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const metadata = { title: "Cooking recipes" };

// Not in the main menu (removed at the client's request), but the pages still work.
async function meta(ids: string[]) {
  const rows = await prisma.recipe.findMany({ where: { contentItemId: { in: ids } }, include: { _count: { select: { ingredients: true, steps: true } } } });
  return Object.fromEntries(rows.map((r) => [r.contentItemId, [`${r._count.ingredients} ingredients`, `${r._count.steps} steps`, r.videoUrl ? "video" : null].filter(Boolean).join(" · ")]));
}

export default function Page() {
  return <DirectoryList types={["RECIPE"]} meta={meta} title="Cooking recipes" intro="Common recipes with full video and text instructions." />;
}
