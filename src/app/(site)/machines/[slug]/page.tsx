import Link from "next/link";
import { notFound } from "next/navigation";
import { PROVIDER_FIELDS } from "@/lib/content-fields";
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
    include: {
      primaryCategory: true,
      machine: { include: { supplier: { select: { phone: true, email: true, website: true, contentItem: { select: { slug: true, title: true, publicationStatus: true } } } } } },
    },
  });
  if (!item || !item.machine) notFound();
  const { supplier, ...m } = item.machine;
  const path = `/machines/${item.slug}`;
  await trackView(viewer, item.id, path);

  // Price and where to buy (the provider and their contacts) are member detail.
  const gated = item.accessLevel !== "PUBLIC" && !viewer.isMember;
  const price = m.priceMin === null && m.priceMax === null ? null : moneyRange(m.priceMin, m.priceMax, m.currency);
  const videos: LinkItem[] = m.videoUrls.map((href, n) => ({ label: m.videoUrls.length > 1 ? `Watch video ${n + 1}` : "Watch video", href, icon: "video" }));

  // The provider: a linked supplier (its page, when live, and its contacts), with anything typed on the machine taking precedence.
  const supplierLive = supplier?.contentItem.publicationStatus === "PUBLISHED";
  const providerName = m.providerName || supplier?.contentItem.title.replace(/^Sample:\s*/i, "") || null;
  const contacts = {
    phone: m.providerPhone || supplier?.phone || null,
    email: m.providerEmail || supplier?.email || null,
    website: m.providerWebsite || supplier?.website || null,
  };
  const hasContacts = Boolean(contacts.phone || contacts.email || contacts.website);
  // Visitors get a lock, and the values are never sent
  const contact = !hasContacts ? undefined : gated ? ("locked" as const) : contacts;
  const where = providerName || m.sources ? (
    <span className="flex flex-col gap-1.5">
      {providerName ? (
        <span className="font-bold">
          {supplier && supplierLive ? <Link href={`/suppliers/${supplier.contentItem.slug}`} className="text-brand hover:text-brand-dark">{providerName} →</Link> : providerName}
        </span>
      ) : null}
      {m.sources ? <span className="whitespace-pre-line">{m.sources}</span> : null}
    </span>
  ) : null;

  return (
    <RecordPage
      layout="product"
      trail={["/machines", "Business Machines"]}
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
        gated ? { label: "Source", locked: true } : { label: "Source", value: where },
      ]}
      contact={contact}
      texts={[
        { label: "Description", text: item.overview },
        { label: "Remarks", text: m.remarks },
      ]}
      links={videos}
      details={{ type: "MACHINE", record: m as unknown as Record<string, unknown>, gated: gated, skip: PROVIDER_FIELDS }}
      viewer={viewer}
      item={item}
      back={path}
      gateTitle="Subscribe to see prices and sellers"
    />
  );
}
