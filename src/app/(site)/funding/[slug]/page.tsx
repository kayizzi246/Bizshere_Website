import { itemMetadata } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Banknote, Building2, CalendarCheck, ExternalLink, FileText, LockKeyhole, MapPin, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { googleEnabled } from "@/lib/auth";
import { popupPlan } from "@/lib/billing";
import { cachedMemberPlan } from "@/lib/cached";
import { memberOnlyLabels } from "@/lib/content-fields";
import { date, moneyRange } from "@/lib/format";
import { SaveButton } from "@/components/Wishlist";
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
 * One fund, laid out like a job page (client example, 13 Nov 2026): breadcrumb, the funder, the fund's name, key
 * facts with icons and tags, Apply now and Save; then "In short", About, the fund in numbered rows (name, amount,
 * eligibility, collateral, target group, tenor, eligible sectors, how to apply), and a side card for the funder
 * (logo, name, category, country, phone, email, website, more funds from them).
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
  const h2 = "text-[19px] font-bold leading-tight tracking-[-0.02em] text-heading sm:text-[20px]";
  // The funder's contacts for the side card (member detail: locked for visitors)
  const contacts = funder.filter((r) => ["Phone", "Email", "Website"].includes(r.label));
  const locked = (label: string) => (
    <Link href={path} data-onboard="" aria-label={`See the ${label.toLowerCase()}`} className="inline-flex items-center gap-2 text-brand">
      <span aria-hidden className="hidden select-none blur-[5px] sm:inline">0000 000 000</span>
      <LockKeyhole aria-hidden className="h-4 w-4 shrink-0" /><span className="whitespace-nowrap text-[13px] font-semibold">Tap to see</span>
    </Link>
  );
  const cell = (r: Row) => (r.locked ? locked(r.label) : r.value);

  // Small logo (or colour tile with the first letter) for the funder line and the side card
  const logo = (size: string, text: string) => org.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- uploaded or editor-entered address
    <img src={org.logoUrl} alt="" className={`${size} shrink-0 rounded-lg border border-line bg-white object-contain p-0.5`} />
  ) : (
    <span aria-hidden className={`${size} ${colourOf(item.slug)} flex shrink-0 items-center justify-center rounded-lg font-bold text-white ${text}`}>{funderName.charAt(0)}</span>
  );
  const checked = item.lastReviewedAt ? date(item.lastReviewedAt) : null;
  const tags = [...new Set([...f.eligibleBusinessTypes, ...(f.targetGroup ? [f.targetGroup] : [])])].slice(0, 8);
  const meta = "inline-flex items-center gap-1.5";

  return (
    <OnboardingGate signedIn={Boolean(viewer.userId)} isMember={viewer.isMember} googleEnabled={googleEnabled} plan={plan}>
      <article className="under-header-pad bg-page">
        <div className="container-site flex flex-col gap-6 pb-10 pt-5 sm:pt-7">
          {/* ── Heading, like a job page (client example, 13 Nov 2026): where you are, who funds it, the name, the key facts
              with icons, tags; Apply now and Save on the right. Member detail stays locked. ── */}
          <header className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-10">
            <div className="flex min-w-0 flex-col items-start gap-3">
              <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[13px] text-ink-muted">
                <Link href="/funding" className="text-ink-muted hover:text-brand">Funding Sources</Link>
                <span aria-hidden>/</span>
                <span className="text-ink-soft">{titleCase(f.fundingType)}s</span>
              </nav>
              <span className="flex items-center gap-2.5 text-[15px] text-ink-soft">
                {logo("h-8 w-8", "text-[14px]")}{funderName}
              </span>
              <h1 className="max-w-4xl text-[24px] font-bold leading-[1.15] tracking-[-0.03em] text-heading sm:text-[28px] lg:text-[32px]">{name}</h1>
              <p data-size="" className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[14px] text-ink-soft">
                {checked ? <span className={meta}><CalendarCheck aria-hidden className="h-4 w-4 text-ink-muted" />Checked {checked}</span> : null}
                <span className={meta}><MapPin aria-hidden className="h-4 w-4 text-ink-muted" />{f.provider.country}</span>
                {amount ? (gated
                  ? <Link href={path} data-onboard="" className={`${meta} font-semibold text-brand`}><LockKeyhole aria-hidden className="h-4 w-4" />Amount for members</Link>
                  : <span className={`${meta} font-semibold text-heading`}><Banknote aria-hidden className="h-4 w-4 text-ink-muted" />{amount}</span>) : null}
                {status ? <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${isOpen ? "bg-[#E3F4EA] text-[#1F7A4D]" : "bg-white text-ink-soft ring-1 ring-line"}`}>{status}</span> : null}
                {viewer.isMember ? <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[12px] font-semibold text-accent-dark ring-1 ring-line"><BadgeCheck aria-hidden className="h-3.5 w-3.5" />Full access</span> : null}
              </p>
              {tags.length ? (
                <ul className="flex flex-wrap gap-1.5">
                  <li className="rounded-full bg-brand px-3 py-1 text-[12px] font-semibold text-white">{titleCase(f.fundingType)}</li>
                  {tags.map((t) => <li key={t} className="rounded-full border border-line bg-white px-3 py-1 text-[12px] text-ink-soft">{t}</li>)}
                </ul>
              ) : (
                <span className="rounded-full bg-brand px-3 py-1 text-[12px] font-semibold text-white">{titleCase(f.fundingType)}</span>
              )}
            </div>

            <div className="flex flex-col gap-2 lg:w-[290px] lg:pt-14">
              <div className="flex gap-2">
                {viewer.isMember && applyAt ? (
                  <a data-visit="" href={applyAt} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-brand px-5 text-[16px] font-bold text-white hover:bg-brand-dark hover:text-white">Apply now<ExternalLink aria-hidden className="h-4 w-4" /></a>
                ) : gated ? (
                  <Link href={path} data-onboard="" className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-brand px-5 text-[16px] font-bold text-white hover:bg-brand-dark hover:text-white"><LockKeyhole aria-hidden className="h-4 w-4" />Apply now</Link>
                ) : null}
                <div className="w-[7.5rem] shrink-0 [&>button]:h-12"><SaveButton id={item.id} /></div>
              </div>
              <p data-size="" className="text-[12px] text-ink-muted">
                {gated && lowest ? <>Members see the full details, from <strong className="font-semibold text-heading">{lowest}</strong>. </> : null}
                Please mention <strong className="font-semibold text-ink-soft">BizSphere-Ug</strong> when applying.
              </p>
              <RememberVisit item={{ href: path, title: name, kind: "Funding", icon: "funding" }} />
            </div>
          </header>

          <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
            <div className="flex min-w-0 flex-col gap-6">
              {item.shortSummary ? (
                <section aria-label="In short" className="flex flex-col gap-1.5 rounded-2xl border border-accent/20 bg-accent-tint/60 p-5">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-dark"><Sparkles aria-hidden className="h-3.5 w-3.5" />In short</span>
                  <p data-size="" className="text-[15px] leading-relaxed text-heading">{item.shortSummary}</p>
                </section>
              ) : null}

              {item.overview ? (
                <section className="flex flex-col gap-2.5">
                  <h2 className={h2}>About this fund</h2>
                  <p className="whitespace-pre-line text-[16px] leading-relaxed text-ink-soft">{item.overview}</p>
                </section>
              ) : null}

              {/* ── The fund, in numbered rows ── */}
              <section id="details" aria-labelledby="fund-details" className="flex scroll-mt-28 flex-col gap-3">
                <h2 id="fund-details" className={h2}>Fund details</h2>
                <ol className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
                  {fund.map((r, n) => (
                    <li key={r.label} className="grid grid-cols-[minmax(0,1fr)] gap-1 px-4 py-3 text-[15px] sm:grid-cols-[190px_minmax(0,1fr)] sm:gap-4 sm:px-5">
                      <span className="flex items-baseline gap-2 font-medium text-ink-muted">
                        <span className="w-5 shrink-0 font-semibold text-brand">{n + 1}.</span>{r.label}
                      </span>
                      <div className={`min-w-0 pl-7 leading-relaxed text-heading sm:pl-0 ${r.strong ? "font-semibold" : ""}`}>{cell(r)}</div>
                    </li>
                  ))}
                </ol>
              </section>

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
              {/* ── The funder: logo, name, what kind and where, then contacts (member detail) ── */}
              <section aria-label="The funder" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5">
                {logo("h-14 w-14", "text-[24px]")}
                <h2 className="text-[20px] font-bold leading-tight tracking-[-0.02em] text-heading">{funderName}</h2>
                <ul className="flex flex-wrap gap-1.5">
                  {f.providerCategory ?? f.provider.providerCategory ? <li className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[12px] text-ink-soft"><Building2 aria-hidden className="h-3.5 w-3.5 text-ink-muted" />{f.providerCategory ?? f.provider.providerCategory}</li> : null}
                  <li className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[12px] text-ink-soft"><MapPin aria-hidden className="h-3.5 w-3.5 text-ink-muted" />{f.provider.country}</li>
                </ul>
                {contacts.length ? (
                  <dl className="flex flex-col divide-y divide-line border-y border-line text-[14px]">
                    {contacts.map((r) => (
                      <div key={r.label} className="grid grid-cols-[72px_minmax(0,1fr)] gap-2 py-2.5">
                        <dt className="text-ink-muted">{r.label}</dt>
                        <dd className="min-w-0 text-heading">{cell(r)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                <Link href={`/funding?q=${encodeURIComponent(funderName)}`} className="inline-flex h-11 items-center justify-center rounded-lg border border-line px-4 text-center text-[14px] font-semibold text-heading hover:border-brand hover:text-brand">More funds from {funderName}</Link>
              </section>
              {gated ? <MemberValue back={path} unlocks={lockedTerms} plan={plan} /> : null}
              <Connected contentItemId={item.id} title="Goes well with this" />
            </aside>
          </div>
        </div>
      </article>
    </OnboardingGate>
  );
}

/** Browser title, description and share picture for this page (src/lib/seo.ts). */
export const generateMetadata = ({ params }: { params: { slug: string } }) => itemMetadata("FUNDING_PROGRAMME", params.slug);
