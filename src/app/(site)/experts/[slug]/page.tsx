import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { trackView } from "@/components/DetailParts";
import { extLink, RecordPage, list } from "@/components/RecordPage";

export const dynamic = "force-dynamic";

// Client fields: Consultant Name, Profile, Category, Specialty, Country, District,
// Email, Phone, Website
export default async function ExpertPage({ params }: { params: { slug: string } }) {
  const viewer = await getViewer();
  const item = await prisma.contentItem.findFirst({
    where: { slug: params.slug, contentType: "CONSULTANT", publicationStatus: viewer.isStaff ? undefined : "PUBLISHED" },
    include: { primaryCategory: true, consultant: true },
  });
  if (!item?.consultant) notFound();
  const c = item.consultant;
  const path = `/experts/${item.slug}`;
  await trackView(viewer, item.id, path);

  // Email and phone are member-only and are not passed on for visitors.
  const gated = item.accessLevel !== "PUBLIC" && !viewer.isMember;

  return (
    <RecordPage
      trail={["/experts", "Business experts"]}
      eyebrow={`Expert · ${item.primaryCategory?.name ?? c.professionalTitle ?? "Consultant"}`}
      title={c.fullName}
      brief={item.shortSummary}
      rows={[
        { label: "Category", value: item.primaryCategory?.name },
        { label: "Specialty", value: list(c.specialties) },
        { label: "Country", value: c.country },
        { label: "District", value: c.district },
        { label: "Website", value: extLink(c.website) },
      ]}
      texts={[{ label: "Profile", text: item.overview }]}
      contact={gated ? "locked" : { email: c.email, phone: c.phone }}
      details={{ type: "CONSULTANT", record: c as unknown as Record<string, unknown>, gated: gated }}
      viewer={viewer}
      item={item}
      back={path}
      gateTitle="Subscribe to contact experts"
    />
  );
}
