import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, ExternalLink, FileText, LockKeyhole } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { googleEnabled } from "@/lib/auth";
import { popupPlan } from "@/lib/billing";
import { cachedMemberPlan } from "@/lib/cached";
import { memberOnlyLabels } from "@/lib/content-fields";
import { moneyRange } from "@/lib/format";
import { ChildSections, loadChildSections } from "@/components/ChildSections";
import { Connected, Evidence, trackView } from "@/components/DetailParts";
import { DropHint } from "@/components/DropHint";
import { FieldSections, visibleGroups } from "@/components/FieldSections";
import { MemberValue } from "@/components/MemberValue";
import { OnboardingGate } from "@/components/Onboarding";
import { RememberVisit } from "@/components/Recent";
import { titleCase } from "@/components/RecordPage";

export const dynamic = "force-dynamic";

// A funder without a logo gets a tile in its own colour, picked from the web address so it stays the same.
const COLOURS = ["bg-[#5B21B6]", "bg-[#BE123C]", "bg-[#C2410C]", "bg-[#1D4ED8]", "bg-[#0F766E]", "bg-[#A21CAF]"];
const colourOf = (slug: string) => COLOURS[[...slug].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7) % COLOURS.length];
const bare = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
const href = (url: string) => (/^https?:\/\//.test(url) ? url : `https://${url}`);

type Row = { label: string; value: React.ReactNode; strong?: boolean; locked?: boolean };

/**
 * One fund, laid out like the client's funding template (Nov 2026): the funder (photo or logo, name,
 * phone, country, email, website), then the fund in numbered rows: name, amount, eligibility,
 * collateral, target group, tenor, eligible sectors and how to apply.
 *
 * Member detail (the amount, tenor, how to apply and the funder's phone, email and website) is checked
 * here on the server: a visitor who hasn't paid gets a lock in its place, and the value is never sent.
 */
export default async function FundingPage({ params }: { params: { slug: string } }) {
  const viewer = await getViewer();
  const item = await prisma.contentItem.findFirst({
    where: { slug: params.slug, contentType: "FUNDING_PROGRAMME", publicationStatus: viewer.isStaff ? undefined : "PUBLISHED" },
    include: { fundingProgramme: { include: { provider: { include: { organization: true } }, rounds: { orderBy: { opensAt: "desc" } } } } },
  });
  if (!item || !item.fundingProgramme) notFound();
  const f = item.fundingProgramme;
  const path = `/funding/${item.slug}`;
  await trackView(viewer, item.id, path);
  const [memberPlan, sections] = await Promise.all([cachedMemberPlan(), loadChildSections("FUNDING_PROGRAMME", { record: f.id, item: item.id, org: null })]);
  const plan = popupPlan(memberPlan);

  const gated = item.accessLevel !== "PUBLIC" && !viewer.isMember;
  const record = f as unknown as Record<string, unknown>;
  const name = item.title.replace(/^Sample:\s*/i, "");
  const org = f.provider.organization;
  const funderName = (org.tradingName ?? org.legalName).replace(/^Sample:?\s*/i, "");
  const website = org.website;
  const applyAt = f.officialTermsUrl ?? (website ? href(website) : null);

  // The round that matters: one open now, then the next to open, then the latest.
  const now = new Date();
  const round = f.rounds.find((r) => r.status === "OPEN" && (r.isRolling || !r.closesAt || r.closesAt >= now)) ?? f.rounds.find((r) => r.status === "UPCOMING") ?? f.rounds[0];
  const isOpen = round?.status === "OPEN" && (round.isRolling || !round.closesAt || round.closesAt >= now);
  const status = !round ? null : isOpen ? "Open now" : round.status === "UPCOMING" ? "Opening soon" : "Closed for now";

  // ── The funder ──
  const funder: Row[] = [
    { label: "Funder name", value: funderName, strong: true },
    ...((f.providerCategory ?? f.provider.providerCategory) ? [{ label: "Category", value: f.providerCategory ?? f.provider.providerCategory }] : []),
    ...(f.provider.phone ? [{ label: "Phone", value: f.provider.phone, locked: gated }] : []),
    { label: "Country", value: f.provider.country },
    ...(f.provider.email ? [{ label: "Email", value: <a href={`mailto:${f.provider.email}`} className="break-all">{f.provider.email}</a>, locked: gated }] : []),
    ...(website ? [{ label: "Website", value: <a href={href(website)} target="_blank" rel="noopener noreferrer" className="break-all">{bare(website)}</a>, locked: gated }] : []),
  ];

  // ── The fund: the template's numbered rows, the empty ones left out ──
  const amount = f.amountMin === null && f.amountMax === null ? null : moneyRange(f.amountMin, f.amountMax, f.currency);
  const needs = (f.eligibilityText ?? "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const tenor = f.tenor ?? (f.repaymentMonths !== null ? `Up to ${f.repaymentMonths} months` : null);
  const howToApply = f.howToApply ?? round?.process ?? null;
  const documents = round?.requiredDocuments ?? [];
  const fund: Row[] = [
    { label: "Fund name", value: name, strong: true },
    ...(f.purpose ? [{ label: "Purpose", value: f.purpose }] : []),
    ...(amount || f.amountBasis ? [{ label: "Amount", strong: true, locked: gated, value: [amount, f.amountBasis].filter(Boolean).join(". ") }] : []),
    ...(needs.length ? [{ label: "Eligibility", value: needs.length === 1 ? needs[0] : <ul className="flex list-disc flex-col gap-1 pl-5">{needs.map((n) => <li key={n}>{n}</li>)}</ul> }] : []),
    ...(f.collateralRequired !== null ? [{ label: "Collateral", strong: true, value: f.collateralRequired ? "Collateral required" : "No collateral required" }] : []),
    ...(f.targetGroup ? [{ label: "Target group", value: f.targetGroup }] : []),
    ...(tenor ? [{ label: "Tenor", value: tenor, locked: gated }] : []),
    ...(f.eligibleBusinessTypes.length ? [{ label: "Eligible sectors", value: f.eligibleBusinessTypes.join(", ") }] : []),
    ...(howToApply || documents.length ? [{
      label: "How to apply", locked: gated, value: (
        <div className="flex flex-col gap-2">
          {howToApply ? <p className="whitespace-pre-line">{howToApply}</p> : null}
          {documents.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {documents.map((d) => <li key={d} className="inline-flex items-center gap-1.5 rounded-lg bg-page px-2.5 py-1 text-[14px] font-semibold text-heading"><FileText aria-hidden className="h-3.5 w-3.5 text-brand" />{d}</li>)}
            </ul>
          ) : null}
        </div>
      ),
    }] : []),
  ];

  const lockedTerms = gated ? [...new Set([...funder, ...fund].filter((r) => r.locked).map((r) => r.label).concat(memberOnlyLabels("FUNDING_PROGRAMME", record)))] : [];
  const skip = gated ? Object.keys(record) : undefined; // visitors: the extra terms are member detail too
  const media = sections.filter((x) => x.table.layout === "gallery");
  const lowest = plan.daily ? `${plan.daily} a day` : plan.weekly ? `${plan.weekly} a week` : plan.monthly ? `${plan.monthly} a month` : null;

  const card = "flex scroll-mt-28 flex-col gap-4 rounded-3xl border border-line bg-white p-5 sm:p-7";
  const h2 = "font-display text-[20px] font-extrabold leading-tight text-heading sm:text-[22px]";
  const locked = (label: string) => (
    <Link href={path} data-onboard="" aria-label={`See the ${label.toLowerCase()}`} className="inline-flex items-center gap-2 text-brand">
      <span aria-hidden className="hidden select-none blur-[5px] sm:inline">0000 000 000</span>
      <LockKeyhole aria-hidden className="h-4 w-4 shrink-0" /><span className="whitespace-nowrap text-[13px] font-semibold">For members</span>
    </Link>
  );
  const cell = (r: Row) => (r.locked ? locked(r.label) : r.value);

  return (
    <OnboardingGate signedIn={Boolean(viewer.userId)} isMember={viewer.isMember} googleEnabled={googleEnabled} plan={plan}>
      <article className="under-header-pad bg-page">
        <div className="container-site flex flex-col gap-4 pb-8 pt-5 sm:pt-7">
          {/* ── Heading ── */}
          <header className="flex flex-col items-start gap-3">
            <Link href="/funding" className="inline-flex items-center gap-1.5 text-sm font-semibold"><ArrowLeft aria-hidden className="h-4 w-4" />All funding sources</Link>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand px-3 py-1 text-[13px] font-bold text-white">{titleCase(f.fundingType)}</span>
              {status ? <span className={`rounded-full px-3 py-1 text-[13px] font-bold ${isOpen ? "bg-[#E3F4EA] text-[#1F7A4D]" : "bg-white text-ink-soft"}`}>{status}</span> : null}
              {viewer.isMember ? <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[13px] font-bold text-accent-dark"><BadgeCheck aria-hidden className="h-4 w-4" />Full access</span> : null}
            </div>
            <h1 className="text-hero text-[30px] leading-[1.05] text-heading sm:text-[40px]">{name}</h1>
            {item.shortSummary ? <p className="max-w-2xl text-[17px] leading-relaxed text-ink-soft">{item.shortSummary}</p> : null}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {viewer.isMember && applyAt ? (
                <a data-visit="" href={applyAt} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-6 text-[15px] font-bold text-white hover:bg-brand-dark hover:text-white">Apply now<ExternalLink aria-hidden className="h-4 w-4" /></a>
              ) : null}
              {gated ? (
                <>
                  <Link href={path} data-onboard="" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-[15px] font-bold text-ink hover:bg-accent-dark hover:text-white"><LockKeyhole aria-hidden className="h-4 w-4" />See the full details</Link>
                  {lowest ? <span className="text-[15px] text-ink-soft">From <strong className="font-display font-extrabold text-heading">{lowest}</strong></span> : null}
                </>
              ) : null}
              <RememberVisit item={{ href: path, title: name, kind: "Funding", icon: "funding" }} />
            </div>
          </header>

          <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
            <div className="flex min-w-0 flex-col gap-4">
              {/* ── The funder: photo or logo, then its details ── */}
              <section aria-label="The funder" className="grid grid-cols-[minmax(0,1fr)] overflow-hidden rounded-3xl border border-line bg-white sm:grid-cols-[220px_minmax(0,1fr)]">
                <div className={`flex min-h-[160px] items-center justify-center p-5 ${org.logoUrl ? "bg-white sm:border-r sm:border-line" : `${colourOf(item.slug)} text-white`}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or editor-entered address */}
                  {org.logoUrl ? <img src={org.logoUrl} alt={`${funderName} logo`} className="max-h-[140px] w-full object-contain" /> : (
                    <span className="flex flex-col items-center gap-2 text-center">
                      <span aria-hidden className="font-display text-[52px] font-extrabold leading-none">{funderName.charAt(0)}</span>
                      <span className="font-display text-[15px] font-bold leading-tight">{funderName}</span>
                    </span>
                  )}
                </div>
                <dl className="divide-y divide-line">
                  {funder.map((r) => (
                    <div key={r.label} className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 px-4 py-3 text-[15px] sm:grid-cols-[140px_minmax(0,1fr)] sm:px-5">
                      <dt className="text-ink-muted">{r.label}</dt>
                      <dd className={`min-w-0 text-heading ${r.strong ? "font-bold" : ""}`}>{cell(r)}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {/* ── The fund, in numbered rows ── */}
              <section id="details" aria-label="Fund details" className="overflow-hidden rounded-3xl border border-line bg-white">
                <ol className="divide-y divide-line">
                  {fund.map((r, n) => (
                    <li key={r.label} className="grid grid-cols-[minmax(0,1fr)] gap-1 px-4 py-3.5 text-[16px] sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-4 sm:px-5">
                      <span className="flex items-baseline gap-2 font-semibold text-ink-soft">
                        <span className="w-6 shrink-0 font-display font-extrabold text-brand">{n + 1}.</span>{r.label}
                      </span>
                      <div className={`min-w-0 pl-8 leading-relaxed text-heading sm:pl-0 ${r.strong ? "font-bold" : ""}`}>{cell(r)}</div>
                    </li>
                  ))}
                </ol>
              </section>

              {item.overview ? (
                <section className={card}>
                  <h2 className={h2}>About this fund</h2>
                  <p className="whitespace-pre-line text-[16px] leading-relaxed text-ink-soft">{item.overview}</p>
                </section>
              ) : null}

              {visibleGroups("FUNDING_PROGRAMME", record, skip).length ? (
                <section className={card}>
                  <details className="group/drop [&>summary::-webkit-details-marker]:hidden">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3"><h2 className={h2}>More about this fund</h2><DropHint /></summary>
                    <div className="mt-4 flex flex-col gap-4"><FieldSections bare type="FUNDING_PROGRAMME" record={record} gated={gated} skip={skip} back={path} /></div>
                  </details>
                </section>
              ) : null}

              <ChildSections sections={media} gated={gated} back={path} />
              <Evidence contentItemId={item.id} lastReviewedAt={item.lastReviewedAt} nextReviewDueAt={item.nextReviewDueAt} viewer={viewer} back={path} />
            </div>

            <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-32">
              {gated ? <MemberValue back={path} unlocks={lockedTerms} plan={plan} /> : null}
              <Connected contentItemId={item.id} title="Goes well with this" />
            </aside>
          </div>
        </div>
      </article>
    </OnboardingGate>
  );
}
