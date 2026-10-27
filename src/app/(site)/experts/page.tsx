import { DirectoryList } from "@/components/DirectoryList";
import { directory } from "@/config/directories";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const metadata = { title: "Business consultants and experts" };

// Public fields only: email and phone are member detail.
async function meta(ids: string[]) {
  const rows = await prisma.consultant.findMany({ where: { contentItemId: { in: ids } } });
  return Object.fromEntries(rows.map((c) => [c.contentItemId, [c.specialties.join(", "), [c.district, c.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ")]));
}

export default function Page() {
  const d = directory("/experts");
  return <DirectoryList types={["CONSULTANT"]} meta={meta} title={d.title} intro={d.text} />;
}
