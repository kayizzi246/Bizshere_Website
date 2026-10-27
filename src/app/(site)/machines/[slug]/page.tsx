import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { moneyRange } from "@/lib/format";
import { trackView } from "@/components/DetailParts";
import { RecordPage, type LinkItem } from "@/components/RecordPage";

export const dynamic = "force-dynamic";

// Client fields: Machine Name, Brief, Function, Description, Type, Category,
// Price, Source, Remarks, Picture, Videos
export default async function MachinePage({ params }: { params: { slug: string } }) {
  const viewer = await getViewer();
  const item = await prisma.contentItem.findFirst({
    where: { slug: params.slug, contentType: "MACHINE", publicationStatus: viewer.isStaff ? undefined : "PUBLISHED" },
    include: { primaryCategory: true, machine: true },
  });
  if (!item || !item.machine) notFound();
  const m = item.machine;
  const path = `/machines/${item.slug}`;
  await trackView(viewer, item.id, path);

  // Price and where to buy are member detail.
  const gated = item.accessLevel !== "PUBLIC" && !viewer.isMember;
  const price = m.priceMin === null && m.priceMax === null ? null : moneyRange(m.priceMin, m.priceMax, m.currency);
  const videos: LinkItem[] = m.videoUrls.map((href, n) => ({ label: m.videoUrls.length > 1 ? `Watch video ${n + 1}` : "Watch video", href, icon: "video" }));

  return (
    <RecordPage
      trail={["/machines", "Business machines"]}
      eyebrow={`Machine · ${item.primaryCategory?.name ?? "Equipment"}`}
      title={item.title}
      brief={item.shortSummary}
      picture={m.pictureUrl}
      pictureCredit={m.pictureCredit}
      rows={[
        { label: "Function", value: m.function },
        { label: "Type", value: m.machineType },
        { label: "Category", value: item.primaryCategory?.name },
        gated ? { label: "Price", locked: true } : { label: "Price", value: price },
        gated ? { label: "Source", locked: true } : { label: "Source", value: m.sources ? <span className="whitespace-pre-line">{m.sources}</span> : null },
      ]}
      texts={[
        { label: "Description", text: item.overview },
        { label: "Remarks", text: m.remarks },
      ]}
      links={videos}
      viewer={viewer}
      item={item}
      back={path}
      gateTitle="Subscribe to see prices and sellers"
    />
  );
}
