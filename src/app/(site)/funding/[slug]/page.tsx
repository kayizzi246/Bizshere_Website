import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { moneyRange } from "@/lib/format";
import { trackView } from "@/components/DetailParts";
import { RecordPage, list, titleCase } from "@/components/RecordPage";

export const dynamic = "force-dynamic";

// Client fields: Fund Name, Brief, Fund Type, Fund Provider, Provider Category,
// Eligibility, Amount Given, Eligible Biz Type, Source Link
export default async function FundingPage({ params }: { params: { slug: string } }) {
  const viewer = await getViewer();
  const item = await prisma.contentItem.findFirst({
    where: { slug: params.slug, contentType: "FUNDING_PROGRAMME", publicationStatus: viewer.isStaff ? undefined : "PUBLISHED" },
    include: { primaryCategory: true, fundingProgramme: { include: { provider: { include: { organization: true } } } } },
  });
  if (!item || !item.fundingProgramme) notFound();
  const f = item.fundingProgramme;
  const path = `/funding/${item.slug}`;
  await trackView(viewer, item.id, path);

  // The amount is part of the full terms, which are member detail.
  const gated = item.accessLevel !== "PUBLIC" && !viewer.isMember;
  const org = f.provider.organization;
  const amount = f.amountMin === null && f.amountMax === null ? null : moneyRange(f.amountMin, f.amountMax, f.currency);

  return (
    <RecordPage
      trail={["/funding", "Funding sources"]}
      eyebrow={`Funding · ${titleCase(f.fundingType)}`}
      title={item.title}
      brief={item.shortSummary}
      rows={[
        { label: "Fund type", value: titleCase(f.fundingType) },
        { label: "Fund provider", value: org.tradingName ?? org.legalName },
        { label: "Provider category", value: f.providerCategory ?? f.provider.providerCategory },
        gated ? { label: "Amount given", locked: true } : { label: "Amount given", value: amount },
        { label: "Eligible business types", value: list(f.eligibleBusinessTypes) },
      ]}
      texts={[
        { label: "Eligibility", text: f.eligibilityText },
        ...(item.overview ? [{ label: "Description", text: item.overview }] : []),
      ]}
      links={[{ label: "Source link", href: f.officialTermsUrl }]}
      details={{ type: "FUNDING_PROGRAMME", record: f as unknown as Record<string, unknown>, gated: gated }}
      viewer={viewer}
      item={item}
      back={path}
      gateTitle="Subscribe to see full funding terms"
    />
  );
}
