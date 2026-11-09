import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { trackView } from "@/components/DetailParts";
import { extLink, RecordPage } from "@/components/RecordPage";
import { websiteName } from "@/lib/format";

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
  // The address is member detail unless the team set this site to "Everyone, free" (client, 9 Nov 2026):
  // a visitor who hasn't paid gets the lock, and the address is never sent.
  const gated = item.accessLevel !== "PUBLIC" && !viewer.isMember;

  return (
    <RecordPage
      trail={["/websites", "Useful Websites"]}
      eyebrow={`Website · ${item.primaryCategory?.name ?? w.siteType ?? "General"}`}
      title={websiteName(item.title, { hideAddress: gated, siteType: w.siteType })}
      brief={item.shortSummary}
      rows={[
        { label: "Type", value: w.siteType },
        { label: "Category", value: item.primaryCategory?.name },
        { label: "Function", value: w.mainFunction },
        gated ? { label: "Link", locked: true } : { label: "Link", value: extLink(w.canonicalUrl) },
      ]}
      texts={[{ label: "Remark", text: w.remarks }, ...(item.overview ? [{ label: "Description", text: item.overview }] : [])]}
      links={[gated ? { label: "Visit the website", locked: true } : { label: "Visit the website", href: w.canonicalUrl }]}
      details={{ type: "WEBSITE", record: w as unknown as Record<string, unknown>, gated }}
      viewer={viewer}
      item={item}
      back={path}
    />
  );
}
