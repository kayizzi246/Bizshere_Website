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
      trail={["/guides", "How-to guides"]}
      eyebrow={`${g.resourceType ?? "Document"} · ${item.primaryCategory?.name ?? "General"}`}
      title={item.title}
      brief={item.shortSummary}
      rows={[
        { label: "Doc type", value: g.resourceType },
        { label: "Category", value: item.primaryCategory?.name },
      ]}
      texts={[{ label: "Description", text: item.overview }]}
      links={[g.officialUrl ? { label: "Official page", href: g.officialUrl } : null, g.videoUrl ? { label: "Watch video", href: g.videoUrl, icon: "video" } : null].filter((l): l is { label: string; href: string; icon?: string } => Boolean(l))}
      product={g.downloadUrl ? {
        kind: g.resourceType ?? "Document",
        title: item.title,
        href: gated ? null : g.downloadUrl,
        // File type from the address, worked out here so visitors see it without the address itself.
        format: g.downloadUrl.match(/\.([a-z0-9]{2,5})(?:[?#]|$)/i)?.[1] ?? null,
        locked: gated,
        facts: [["Type", g.resourceType], ["Language", g.language], ["Version", g.version], ["Issued by", g.issuingBody ?? g.responsibleAuthority]],
      } : undefined}
      details={{ type: "GUIDE", record: g as unknown as Record<string, unknown>, gated: gated }}
      viewer={viewer}
      item={item}
      back={path}
      gateTitle="Subscribe for downloads"
    />
  );
}
