import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { trackView } from "@/components/DetailParts";
import { extLink, RecordPage } from "@/components/RecordPage";

export const dynamic = "force-dynamic";

// Client fields: Site Name, Type, Category, Function, Remark, Link
export default async function WebsitePage({ params }: { params: { slug: string } }) {
  const viewer = await getViewer();
  const item = await prisma.contentItem.findFirst({
    where: { slug: params.slug, contentType: "WEBSITE", publicationStatus: viewer.isStaff ? undefined : "PUBLISHED" },
    include: { primaryCategory: true, website: true },
  });
  if (!item?.website) notFound();
  const w = item.website;
  const path = `/websites/${item.slug}`;
  await trackView(viewer, item.id, path);

  return (
    <RecordPage
      trail={["/websites", "Useful websites"]}
      eyebrow={`Website · ${item.primaryCategory?.name ?? w.siteType ?? "General"}`}
      title={item.title}
      brief={item.shortSummary}
      rows={[
        { label: "Type", value: w.siteType },
        { label: "Category", value: item.primaryCategory?.name },
        { label: "Function", value: w.mainFunction },
        { label: "Link", value: extLink(w.canonicalUrl) },
      ]}
      texts={[{ label: "Remark", text: w.remarks }, ...(item.overview ? [{ label: "Description", text: item.overview }] : [])]}
      links={[{ label: "Visit the website", href: w.canonicalUrl }]}
      viewer={viewer}
      item={item}
      back={path}
    />
  );
}
