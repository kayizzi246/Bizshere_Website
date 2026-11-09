import Link from "next/link";
import type { ContentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { date, itemHref } from "@/lib/format";
import { ListingHeader } from "@/components/DirectoryList";

export const dynamic = "force-dynamic";
export const metadata = { title: "What's new" };

const DAYS = 14;
const HEADING: Partial<Record<ContentType, string>> = {
  FUNDING_PROGRAMME: "Funding sources", SUPPLIER: "Trusted suppliers", BUSINESS_IDEA: "Business ideas", MACHINE: "Business machines",
  BUSINESS_TIP: "Business tips", GUIDE: "Business guides", NEWS: "Business news", CONSULTANT: "Business experts", TOOL: "Business tools",
  INVESTMENT_OPPORTUNITY: "Investment opportunities", WEBSITE: "Useful websites",
};
// The order the sections are shown in: what people come back for first
const ORDER: ContentType[] = ["FUNDING_PROGRAMME", "SUPPLIER", "BUSINESS_IDEA", "MACHINE", "BUSINESS_TIP", "GUIDE", "NEWS", "CONSULTANT", "TOOL", "INVESTMENT_OPPORTUNITY", "WEBSITE"];

/**
 * Everything published in the last two weeks, newest first, grouped by directory. The weekly SMS
 * (src/lib/jobs.ts weeklyDigest) links here, so a tap on the text lands on the new things themselves.
 * Titles and briefs only: what a visitor may see anyway.
 */
export default async function WhatsNewPage() {
  const since = new Date(Date.now() - DAYS * 86_400_000);
  const items = await prisma.contentItem.findMany({
    where: { publicationStatus: "PUBLISHED", publishedAt: { gt: since, lte: new Date() }, contentType: { in: ORDER } },
    select: { id: true, slug: true, title: true, contentType: true, shortSummary: true, publishedAt: true },
    orderBy: { publishedAt: "desc" },
    take: 200,
  });
  const groups = ORDER.map((type) => ({ type, rows: items.filter((i) => i.contentType === type) })).filter((g) => g.rows.length);

  return (
    <>
      <ListingHeader title="What's new" intro={`Everything added to BizSphere-Ug in the last ${DAYS} days, newest first.`} />
      <div className="container-site flex flex-col gap-5 py-6 sm:py-8">
        {groups.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-10 text-center">
            <p className="font-bold text-heading">Nothing new in the last {DAYS} days.</p>
            <Link href="/" className="font-semibold">Back to the homepage</Link>
          </div>
        ) : groups.map((g) => (
          <section key={g.type} className="card flex flex-col gap-1 p-5 sm:p-6">
            <h2 className="font-display text-[19px] font-extrabold text-heading">{HEADING[g.type]} <span className="font-normal text-ink-muted">({g.rows.length})</span></h2>
            <ul className="flex flex-col divide-y divide-line">
              {g.rows.map((r) => (
                <li key={r.id}>
                  <Link href={itemHref(r)} className="group flex flex-col gap-0.5 py-3 text-ink hover:text-ink">
                    <span className="font-display text-[16px] font-bold text-heading group-hover:text-brand">{r.title.replace(/^Sample:\s*/i, "")}</span>
                    {r.shortSummary ? <span className="line-clamp-2 text-[15px] text-ink-soft">{r.shortSummary}</span> : null}
                    <span className="text-[12px] text-ink-muted">Added {date(r.publishedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
