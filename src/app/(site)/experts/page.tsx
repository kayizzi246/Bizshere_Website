import { prisma } from "@/lib/prisma";
import { directory, directoryMetadata } from "@/config/directories";
import { itemHref, money } from "@/lib/format";
import { getViewer } from "@/lib/access";
import { ExpertBrowser, type BrowseExpert } from "@/components/ExpertBrowser";

export const dynamic = "force-dynamic";
export const metadata = directoryMetadata("/experts");

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => ((Array.isArray(v) ? v[0] : v) ?? "").trim();

/**
 * Business Experts, laid out like Business Ideas (client, 13 Nov 2026): a short hero with the search, pinned tabs
 * (specialties and "Advises online") with the sort, and a photo grid four a row beside the side column
 * (ExpertBrowser). Public fields only: email and phone stay on the member profile.
 * Older links still work: ?specialty= picks that tab, ?online=1 the online tab, ?district= goes into the search.
 */
export default async function ExpertsPage({ searchParams }: { searchParams: SP }) {
  const d = directory("/experts");
  const viewer = await getViewer();
  const all = await prisma.consultant.findMany({
    where: { contentItem: { publicationStatus: "PUBLISHED" } },
    include: {
      contentItem: { select: { id: true, slug: true, title: true, contentType: true, shortSummary: true, primaryCategory: { select: { name: true } } } },
      reviews: { where: { moderation: "APPROVED" }, select: { rating: true } },
    },
    orderBy: { contentItem: { publishedAt: { sort: "desc", nulls: "last" } } },
    take: 500,
  });

  const experts: BrowseExpert[] = all.map((c, order) => {
    const business = c.contentItem.title.replace(/^Sample:\s*/i, "");
    // Fee is member-only (MEMBER_ONLY.CONSULTANT): non-members see it locked, never the number.
    const feeLocked = !viewer.isMember && c.feeMin != null;
    const fee = viewer.isMember && c.feeMin != null ? `From ${money(c.feeMin, c.currency)}${c.pricingBasis ? ` ${c.pricingBasis}` : ""}` : null;
    const reviews = c.reviews.length;
    const rating = reviews ? Math.round((c.reviews.reduce((s, r) => s + r.rating, 0) / reviews) * 10) / 10 : null;
    return {
      id: c.contentItem.id,
      slug: c.contentItem.slug,
      href: itemHref(c.contentItem),
      name: business,
      person: (c.fullName || "").trim() || null,
      about: c.contentItem.shortSummary ?? c.professionalTitle ?? c.businessName,
      place: [c.district, c.country].filter(Boolean).join(", ") || null,
      category: c.contentItem.primaryCategory?.name ?? null,
      specialties: c.specialties,
      online: c.deliveryModes.some((m) => /online|remote|phone|video/i.test(m)),
      photo: c.photoUrl,
      fee, feeLocked, rating, reviews,
      order,
      text: [c.fullName, business, c.professionalTitle, c.contentItem.shortSummary, c.contentItem.primaryCategory?.name, c.district, c.country, ...c.specialties, ...c.languages].filter(Boolean).join(" ").toLowerCase(),
    };
  });

  const q = [one(searchParams.q), one(searchParams.district)].filter(Boolean).join(" ");
  const category = one(searchParams.category) || one(searchParams.specialty) || (one(searchParams.online) === "1" ? "online" : "");
  return (
    <ExpertBrowser experts={experts} intro={d.text}
      initial={{ q, category, sort: one(searchParams.sort), page: Math.max(1, Number.parseInt(one(searchParams.page), 10) || 1) }} />
  );
}
