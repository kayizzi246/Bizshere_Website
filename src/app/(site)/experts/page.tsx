import { prisma } from "@/lib/prisma";
import { directory, directoryMetadata } from "@/config/directories";
import { itemHref } from "@/lib/format";
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
  const all = await prisma.consultant.findMany({
    where: { contentItem: { publicationStatus: "PUBLISHED" } },
    include: { contentItem: { select: { id: true, slug: true, title: true, contentType: true, shortSummary: true, primaryCategory: { select: { name: true } } } } },
    orderBy: { contentItem: { publishedAt: { sort: "desc", nulls: "last" } } },
    take: 500,
  });

  const experts: BrowseExpert[] = all.map((c, order) => ({
    id: c.contentItem.id,
    slug: c.contentItem.slug,
    href: itemHref(c.contentItem),
    name: (c.fullName || c.contentItem.title).replace(/^Sample:\s*/i, ""),
    about: c.contentItem.shortSummary ?? c.professionalTitle ?? c.businessName,
    place: [c.district, c.country].filter(Boolean).join(", ") || null,
    category: c.contentItem.primaryCategory?.name ?? null,
    specialties: c.specialties,
    online: c.deliveryModes.some((m) => /online|remote|phone|video/i.test(m)),
    photo: c.photoUrl,
    order,
    text: [c.fullName, c.businessName, c.professionalTitle, c.contentItem.title, c.contentItem.shortSummary, c.contentItem.primaryCategory?.name, c.district, c.country, ...c.specialties, ...c.languages].filter(Boolean).join(" ").toLowerCase(),
  }));

  const q = [one(searchParams.q), one(searchParams.district)].filter(Boolean).join(" ");
  const category = one(searchParams.category) || one(searchParams.specialty) || (one(searchParams.online) === "1" ? "online" : "");
  return (
    <ExpertBrowser experts={experts} intro={d.text}
      initial={{ q, category, sort: one(searchParams.sort), page: Math.max(1, Number.parseInt(one(searchParams.page), 10) || 1) }} />
  );
}
