import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { trackView } from "@/components/DetailParts";
import { RecordPage, titleCase } from "@/components/RecordPage";

export const dynamic = "force-dynamic";

// Client fields: Tool Name, Category, Description, Download Link
export default async function ToolPage({ params }: { params: { slug: string } }) {
  const viewer = await getViewer();
  const item = await prisma.contentItem.findFirst({
    where: { slug: params.slug, contentType: "TOOL", publicationStatus: viewer.isStaff ? undefined : "PUBLISHED" },
    include: { primaryCategory: true, tool: true },
  });
  if (!item?.tool) notFound();
  const t = item.tool;
  const path = `/tools/${item.slug}`;
  await trackView(viewer, item.id, path);

  // Downloads are a member benefit unless the page is public.
  const gated = item.accessLevel !== "PUBLIC" && !viewer.isMember;

  return (
    <RecordPage
      trail={["/tools", "Business tools"]}
      eyebrow={`${titleCase(t.toolType) ?? "Tool"} · ${item.primaryCategory?.name ?? "General"}`}
      title={item.title}
      brief={item.shortSummary}
      rows={[
        { label: "Category", value: item.primaryCategory?.name },
        { label: "Tool type", value: titleCase(t.toolType) },
      ]}
      texts={[{ label: "Description", text: item.overview }]}
      product={t.downloadUrl || t.calculatorRoute ? {
        kind: titleCase(t.toolType) ?? "Tool",
        title: item.title,
        href: gated ? null : t.downloadUrl,
        locked: gated && Boolean(t.downloadUrl),
        format: t.fileFormat,
        facts: [["Format", t.fileFormat], ["Works with", t.supportedSoftware], ["Editable", t.editable === null ? null : t.editable ? "Yes" : "No"], ["Contains macros", t.hasMacros === null ? null : t.hasMacros ? "Yes" : "No"], ["Licence", t.licence]],
        secondary: t.calculatorRoute && !gated ? { label: "Open the calculator", href: t.calculatorRoute } : null,
      } : undefined}
      details={{ type: "TOOL", record: t as unknown as Record<string, unknown>, gated: gated }}
      viewer={viewer}
      item={item}
      back={path}
      gateTitle="Subscribe for downloads and templates"
    />
  );
}
