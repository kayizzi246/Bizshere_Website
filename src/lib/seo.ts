import type { Metadata } from "next";
import type { ContentType } from "@prisma/client";
import { prisma } from "./prisma";
import { contentTypeLabel } from "./format";

/**
 * The browser title, description and share picture of one record's page, for generateMetadata.
 * Only public words: the title, the brief and the picture, never a price or a contact. A page that
 * isn't published falls back to the directory's name (the page itself shows "not found").
 */
export async function itemMetadata(type: ContentType, slug: string): Promise<Metadata> {
  const item = await prisma.contentItem.findFirst({
    where: { slug, contentType: type, publicationStatus: "PUBLISHED" },
    select: {
      title: true, shortSummary: true, overview: true, primaryCategory: { select: { name: true } },
      businessIdea: { select: { pictureUrl: true } }, machine: { select: { pictureUrl: true } },
      supplier: { select: { pictureUrl: true, country: true, items: true } }, consultant: { select: { photoUrl: true, professionalTitle: true, district: true } },
    },
  }).catch(() => null);
  if (!item) return { title: contentTypeLabel[type] };
  const title = item.title.replace(/^Sample:\s*/i, "");
  const kind = contentTypeLabel[type];
  const fallback = type === "SUPPLIER" && item.supplier
    ? [item.supplier.items.slice(0, 4).join(", "), item.supplier.country].filter(Boolean).join(" · ")
    : type === "CONSULTANT" && item.consultant
      ? [item.consultant.professionalTitle, item.consultant.district].filter(Boolean).join(" · ")
      : item.primaryCategory?.name;
  const description = (item.shortSummary || item.overview?.split(/\n/)[0] || fallback || `${kind} on BizSphere-Ug`).slice(0, 160);
  const picture = item.businessIdea?.pictureUrl || item.machine?.pictureUrl || item.supplier?.pictureUrl || item.consultant?.photoUrl || null;
  const absolute = picture && /^https?:\/\//i.test(picture);
  return {
    title: `${title} · ${kind}`,
    description,
    openGraph: { title, description, type: "article", ...(absolute ? { images: [{ url: picture }] } : {}) },
    twitter: { card: absolute ? "summary_large_image" : "summary", title, description },
  };
}
