import { DirectoryList } from "@/components/DirectoryList";
import { FUNDING_TABS, date, moneyRange } from "@/lib/format";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const metadata = { title: "Funding programmes" };

async function meta(ids: string[]) {
  const rows = await prisma.fundingProgramme.findMany({
    where: { contentItemId: { in: ids } },
    include: { rounds: { where: { status: "OPEN" }, orderBy: { closesAt: "asc" }, take: 1 } },
  });
  return Object.fromEntries(rows.map((p) => {
    const r = p.rounds[0];
    const when = r ? (r.isRolling ? "Rolling applications" : `Closes ${date(r.closesAt)}`) : "No open round";
    return [p.contentItemId, `${p.fundingType.toLowerCase()} · ${moneyRange(p.amountMin, p.amountMax, p.currency, "Amount to be confirmed")} · ${when}`];
  }));
}

export default function Page() {
  return <DirectoryList types={["FUNDING_PROGRAMME"]} tabs={FUNDING_TABS} active="/funding" meta={meta} title="Funding programmes" intro="Loans, grants and equity, with eligibility and round dates. Upper amounts are ceilings, not guaranteed awards." />;
}
