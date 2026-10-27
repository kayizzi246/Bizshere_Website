import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { trackView } from "@/components/DetailParts";
import { RecordPage } from "@/components/RecordPage";

export const dynamic = "force-dynamic";

// Client fields: Doc Type, Category, Description, Download Link
export default async function GuidePage({ params }: { params: { slug: string } }) {
  const viewer = await getViewer();
  const item = await prisma.contentItem.findFirst({
    where: { slug: params.slug, contentType: "GUIDE", publicationStatus: viewer.isStaff ? undefined : "PUBLISHED" },
    include: { primaryCategory: true, guide: true },
  });
  if (!item?.guide) notFound();
  const g = item.guide;
  const path = `/guides/${item.slug}`;
  await trackView(viewer, item.id, path);

  // Downloads are a member benefit unless the page is public.
  const gated = item.accessLevel !== "PUBLIC" && !viewer.isMember;

  return (
    <RecordPage
      trail={["/guides", "Business information and guidelines"]}
      eyebrow={`${g.resourceType ?? "Document"} · ${item.primaryCategory?.name ?? "General"}`}
      title={item.title}
      brief={item.shortSummary}
      rows={[
        { label: "Doc type", value: g.resourceType },
        { label: "Category", value: item.primaryCategory?.name },
      ]}
      texts={[{ label: "Description", text: item.overview }]}
      links={g.downloadUrl ? [gated ? { label: "Download", locked: true } : { label: "Download", href: g.downloadUrl, icon: "download" }] : []}
      viewer={viewer}
      item={item}
      back={path}
      gateTitle="Subscribe for downloads"
    />
  );
}
