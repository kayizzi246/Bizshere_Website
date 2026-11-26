import { itemMetadata } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight, BadgeCheck, Banknote, Building2, CalendarCheck, CalendarClock, CircleCheck, ExternalLink, FileText, Globe, ListChecks, LockKeyhole,
  Mail, MapPin, MessageCircle, Phone, ShieldAlert, ShieldCheck, Sparkles, Target, UserCheck, Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { googleEnabled } from "@/lib/auth";
import { popupPlan } from "@/lib/billing";
import { cachedMemberPlan } from "@/lib/cached";
import { funderCategoryOf, memberOnlyLabels } from "@/lib/content-fields";
import { date, moneyRange } from "@/lib/format";
import { SaveButton } from "@/components/Wishlist";
import { ChildSections, loadChildSections } from "@/components/ChildSections";
import { Connected, Evidence, trackView } from "@/components/DetailParts";
import { FieldSections, visibleGroups } from "@/components/FieldSections";
import { MemberValue } from "@/components/MemberValue";
import { OnboardingGate } from "@/components/Onboarding";
import { RememberVisit } from "@/components/Recent";
import { titleCase } from "@/components/RecordPage";

export const dynamic = "force-dynamic";

// A funder without a logo gets a tile in its own colour, picked from the web address so it stays the same.
const COLOURS = ["bg-[#5B21B6]", "bg-[#BE123C]", "bg-[#C2410C]", "bg-[#1D4ED8]", "bg-[#0F766E]", "bg-[#A21CAF]"];
// The same colours for the letter on the white tile (written out, so Tailwind builds them)
const TEXTS = ["text-[#5B21B6]", "text-[#BE123C]", "text-[#C2410C]", "text-[#1D4ED8]", "text-[#0F766E]", "text-[#A21CAF]"];
const pick = (slug: string) => [...slug].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7) % COLOURS.length;
const colourOf = (slug: string) => COLOURS[pick(slug)];
const textOf = (slug: string) => TEXTS[pick(slug)];
const bare = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
/** Just the site's name (msc.co.ug), without the page or anchor */
const host = (url: string) => bare(url).split(/[/?#]/)[0];
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
    include: { fundingProgramme: { include: { provider: { include: { organization: { include: { locations: { orderBy: { isPrimary: "desc" }, take: 1 } } } } }, rounds: { orderBy: { opensAt: "desc" } } } } },
  });
  if (!item || !item.fundingProgramme) notFound();
  const f = item.fundingProgramme;
  const path = `/funding/${item.slug}`;
  await trackView(viewer, item.id, path);
  const [memberPlan, sections, fundCount] = await Promise.all([
    cachedMemberPlan(),
    loadChildSections("FUNDING_PROGRAMME", { record: f.id, item: item.id, org: null }),
    prisma.fundingProgramme.count({ where: { providerId: f.providerId, contentItem: { publicationStatus: "PUBLISHED" } } }),
  ]);
  const plan = popupPlan(memberPlan);

  const gated = item.accessLevel !== "PUBLIC" && !viewer.isMember;
  const record = f as unknown as Record<string, unknown>;
  const name = item.title.replace(/^Sample:\s*/i, "");
  const org = f.provider.organization;
  const funderName = (org.tradingName ?? org.legalName).replace(/^Sample:?\s*/i, "");
  // Always shown (client, 26 Nov 2026): the fund's own, else its funder's, else a guess from the name, else Other
  const funderCategory = funderCategoryOf(f.providerCategory, f.provider.providerCategory, funderName);
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
    { label: "Category", value: funderCategory },
    ...(f.provider.phone ? [{ label: "Phone", value: f.provider.phone, locked: gated }] : []),
    ...(f.provider.organization.locations[0]?.physicalAddress ? [{ label: "Address", value: [f.provider.organization.locations[0].physicalAddress, f.provider.organization.locations[0].town].filter(Boolean).join(", ") }] : []),
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

  // The key facts as tiles at the top of the details (member detail locked)
  const facts: { label: string; value: React.ReactNode; locked?: boolean; icon: typeof Banknote; tone: string }[] = [
    ...(amount || f.amountBasis ? [{ label: "Amount", value: [amount, f.amountBasis].filter(Boolean).join(". "), locked: gated, icon: Banknote, tone: "bg-[#E3F4EA] text-[#1F7A4D]" }] : []),
    ...(tenor ? [{ label: "Repayment", value: tenor, locked: gated, icon: CalendarClock, tone: "bg-[#EEF4FF] text-[#1D4ED8]" }] : []),
    ...(f.collateralRequired !== null ? [{ label: "Collateral", value: f.collateralRequired ? "Required" : "Not required", icon: f.collateralRequired ? ShieldAlert : ShieldCheck, tone: f.collateralRequired ? "bg-[#FFF5E6] text-[#B45309]" : "bg-[#E3F4EA] text-[#1F7A4D]" }] : []),
    ...(f.targetGroup ? [{ label: "Who it's for", value: f.targetGroup, icon: Users, tone: "bg-[#F4EEFF] text-[#6D28D9]" }] : []),
  ];
  // How to apply as steps: one a line, without the numbers or bullets typed in front
  const steps = (howToApply ?? "").split(/\r?\n/).map((s) => s.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, "").trim()).filter(Boolean);
  const card = "flex flex-col gap-3.5 rounded-2xl bg-white p-5";
  const cardHead = "flex items-center gap-2.5 text-[16px] font-bold tracking-[-0.01em] text-heading";
  const headIcon = "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg";

  const lockedTerms = gated ? [...new Set([...funder, ...fund].filter((r) => r.locked).map((r) => r.label).concat(memberOnlyLabels("FUNDING_PROGRAMME", record)))] : [];
  const skip = gated ? Object.keys(record) : undefined; // visitors: the extra terms are member detail too
  const media = sections.filter((x) => x.table.layout === "gallery");
  const lowest = plan.daily ? `${plan.daily} a day` : plan.weekly ? `${plan.weekly} a week` : plan.monthly ? `${plan.monthly} a month` : null;

  const h2 = "text-[19px] font-bold leading-tight tracking-[-0.02em] text-heading sm:text-[20px]";
  // The funder's contacts for the side card (member detail: locked for visitors)
  const contacts = funder.filter((r) => ["Phone", "Email", "Website"].includes(r.label));
  // Each number on its own, callable; one marked WhatsApp ("watsapp" too) also opens a chat (Uganda's 0 becomes 256)
  const phones = gated ? [] : (f.provider.phone ?? "").split(/[,;/]+/).map((s) => s.trim()).filter(Boolean).map((s) => {
    const whatsapp = /wh?ats+ap+/i.test(s);
    const text = s.replace(/\(?\s*wh?ats+ap+\s*\)?/i, "").trim();
    const digits = text.replace(/[^\d+]/g, "");
    return { text, whatsapp, digits, intl: digits.replace(/^\+/, "").replace(/^0/, "256") };
  });
  const locked = (label: string) => (
    <Link href={path} data-onboard="" aria-label={`See the ${label.toLowerCase()}`} className="inline-flex items-center gap-2 text-brand">
      <span aria-hidden className="hidden select-none blur-[5px] sm:inline">0000 000 000</span>
      <LockKeyhole aria-hidden className="h-4 w-4 shrink-0" /><span className="whitespace-nowrap text-[13px] font-semibold">Tap to see</span>
    </Link>
  );

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
        <div className="container-site flex flex-col gap-7 pad-body">
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
                Always remember to carry out all necessary precautions when applying for loans.
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

              {/* ── The fund in one place (client, 14 Nov 2026; redesigned 26 Nov 2026, client: "redesign the fund details
                   section too"): the key facts as tiles, then what it's for, who can apply as a checklist and how to apply
                   as numbered steps with the documents to bring. Every other detail underneath, nothing folded away. ── */}
              <section id="details" aria-labelledby="fund-details" className="flex scroll-mt-28 flex-col gap-4">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <h2 id="fund-details" className={h2}>Fund details</h2>
                  {checked ? <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted"><CalendarCheck aria-hidden className="h-3.5 w-3.5" />Checked {checked}</span> : null}
                </div>

                {facts.length ? (
                  <ul className={`grid grid-cols-2 gap-2.5 ${facts.length >= 4 ? "lg:grid-cols-4" : facts.length === 3 ? "sm:grid-cols-3" : ""}`}>
                    {facts.map((x) => (
                      <li key={x.label} className="flex flex-col gap-2.5 rounded-2xl bg-white p-4">
                        <span aria-hidden className={`flex h-9 w-9 items-center justify-center rounded-xl ${x.tone}`}><x.icon className="h-4 w-4" /></span>
                        <span className="flex flex-col gap-0.5">
                          <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">{x.label}</span>
                          <span className="text-[15px] font-bold leading-snug tracking-[-0.01em] text-heading">{x.locked ? locked(x.label) : x.value}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {f.purpose || f.eligibleBusinessTypes.length ? (
                  <div className={card}>
                    <h3 className={cardHead}><span aria-hidden className={`${headIcon} bg-[#EEF4FF] text-[#1D4ED8]`}><Target className="h-4 w-4" /></span>What it&apos;s for</h3>
                    {f.purpose ? <p data-size="" className="text-[15px] leading-relaxed text-heading">{f.purpose}</p> : null}
                    {f.eligibleBusinessTypes.length ? (
                      <div className="flex flex-col gap-2">
                        <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Eligible sectors</span>
                        <ul className="flex flex-wrap gap-1.5">
                          {f.eligibleBusinessTypes.map((s) => <li key={s} className="rounded-full bg-page px-3 py-1 text-[13px] font-medium text-heading">{s}</li>)}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {needs.length ? (
                  <div className={card}>
                    <h3 className={cardHead}><span aria-hidden className={`${headIcon} bg-[#E3F4EA] text-[#1F7A4D]`}><UserCheck className="h-4 w-4" /></span>Who can apply</h3>
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
                      {needs.map((n) => (
                        <li key={n} className="flex items-start gap-2.5 rounded-xl bg-page px-3 py-2.5 text-[14px] leading-snug text-heading">
                          <CircleCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[#1F9D5C]" />{n.replace(/^[-•*\d.)\s]+/, "")}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {howToApply || documents.length ? (
                  <div className={card}>
                    <h3 className={cardHead}><span aria-hidden className={`${headIcon} bg-[#FFF5E6] text-[#B45309]`}><ListChecks className="h-4 w-4" /></span>How to apply</h3>
                    {gated ? (
                      <div className="flex flex-col items-start gap-3 rounded-xl bg-[#FFFBEB] p-4 sm:flex-row sm:items-center sm:justify-between">
                        <p data-size="" className="flex items-center gap-2.5 text-[14px] leading-snug text-ink-soft"><LockKeyhole aria-hidden className="h-4 w-4 shrink-0 text-accent-dark" />Members see each step and the documents to bring.</p>
                        <Link href={path} data-onboard="" className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-[#FFCF1A] px-4 text-[13px] font-bold text-ink hover:bg-[#FFDB52] hover:text-ink">Unlock</Link>
                      </div>
                    ) : (
                      <>
                        {steps.length > 1 ? (
                          <ol className="flex flex-col">
                            {steps.map((s, n) => (
                              <li key={s} className="relative flex gap-3 pb-4 last:pb-0">
                                {n < steps.length - 1 ? <span aria-hidden className="absolute bottom-0 left-[13px] top-7 w-px bg-line" /> : null}
                                <span aria-hidden className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-[12px] font-bold text-white">{n + 1}</span>
                                <p data-size="" className="pt-0.5 text-[14px] leading-relaxed text-heading">{s}</p>
                              </li>
                            ))}
                          </ol>
                        ) : steps.length ? <p data-size="" className="whitespace-pre-line text-[15px] leading-relaxed text-heading">{steps[0]}</p> : null}
                        {documents.length ? (
                          <div className="flex flex-col gap-2">
                            <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Documents to bring</span>
                            <ul className="flex flex-wrap gap-1.5">
                              {documents.map((d) => <li key={d} className="inline-flex items-center gap-1.5 rounded-lg bg-page px-2.5 py-1.5 text-[13px] font-semibold text-heading"><FileText aria-hidden className="h-3.5 w-3.5 text-brand" />{d}</li>)}
                            </ul>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null}
                {visibleGroups("FUNDING_PROGRAMME", record, skip).length ? (
                  <div className="mt-1 flex flex-col gap-4"><FieldSections bare type="FUNDING_PROGRAMME" record={record} gated={gated} skip={skip} back={path} /></div>
                ) : null}
              </section>

              <ChildSections sections={media} gated={gated} back={path} />
              <Evidence contentItemId={item.id} lastReviewedAt={item.lastReviewedAt} nextReviewDueAt={item.nextReviewDueAt} viewer={viewer} back={path} />
            </div>

            <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-32">
              {/* ── The funder (redesigned 26 Nov 2026, client: "make advanced and perfect", then "fix this design" when the
                   logo hung off the band and vanished into it): everything in a header in the funder's colour (the logo on
                   a white tile, the name beside it), then what kind and where, each contact as a row you can act on (call,
                   WhatsApp, email, visit), all member detail, and their other funds. Nothing overlaps. ── */}
              <section aria-labelledby="funder-name" className="overflow-hidden rounded-2xl bg-white">
                <div className={`relative overflow-hidden px-5 pb-5 pt-4 ${colourOf(item.slug)}`}>
                  <span aria-hidden className="absolute inset-0 bg-[radial-gradient(120%_90%_at_100%_0%,rgba(255,255,255,0.22),transparent_60%)]" />
                  <span aria-hidden className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:14px_14px] [mask-image:linear-gradient(to_left,#000,transparent_70%)]" />
                  <div className="relative flex flex-col gap-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/80">The funder</span>
                      {isOpen ? <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[#1F7A4D]"><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#1F9D5C]" />Taking applications</span> : null}
                    </div>
                    <div className="flex items-center gap-3.5">
                      {org.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- uploaded or editor-entered address
                        <img src={org.logoUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl bg-white object-contain p-1.5" />
                      ) : (
                        <span aria-hidden className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white text-[24px] font-bold ${textOf(item.slug)}`}>{funderName.charAt(0)}</span>
                      )}
                      <h2 id="funder-name" className="min-w-0 text-[18px] font-bold leading-tight tracking-[-0.02em] text-white">{funderName}</h2>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-4 p-5">
                  <div className="flex flex-col gap-2.5">
                    <ul className="flex flex-wrap gap-1.5">
                      {funderCategory ? <li className="inline-flex items-center gap-1.5 rounded-full bg-page px-2.5 py-1 text-[12px] font-medium text-ink-soft"><Building2 aria-hidden className="h-3.5 w-3.5 text-ink-muted" />{funderCategory}</li> : null}
                      <li className="inline-flex items-center gap-1.5 rounded-full bg-page px-2.5 py-1 text-[12px] font-medium text-ink-soft"><MapPin aria-hidden className="h-3.5 w-3.5 text-ink-muted" />{f.provider.country}</li>
                    </ul>
                  </div>

                  {contacts.length ? (
                    <ul className="flex flex-col gap-1 rounded-xl bg-page p-1.5">
                      {contacts.map((r) => {
                        const RowIcon = r.label === "Phone" ? Phone : r.label === "Email" ? Mail : Globe;
                        return (
                          <li key={r.label} className="flex items-start gap-3 rounded-lg bg-white p-2.5">
                            <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand"><RowIcon className="h-4 w-4" /></span>
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                              <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">{r.label}</span>
                              <div className="min-w-0 text-[14px] font-medium leading-snug text-heading">
                                {r.locked ? locked(r.label) : r.label === "Phone" ? (
                                  <ul className="flex flex-col gap-1.5">
                                    {phones.map((p) => (
                                      <li key={p.text} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                        <a href={`tel:${p.digits}`} className="text-heading hover:text-brand">{p.text}</a>
                                        {p.whatsapp ? <a href={`https://wa.me/${p.intl}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-[#E7F8EE] px-2 py-0.5 text-[11px] font-semibold text-[#128C4A] hover:bg-[#D3F2E0] hover:text-[#128C4A]"><MessageCircle aria-hidden className="h-3 w-3" />WhatsApp</a> : null}
                                      </li>
                                    ))}
                                  </ul>
                                ) : r.label === "Email" && f.provider.email ? (
                                  <a href={`mailto:${f.provider.email}`} className="break-all text-heading hover:text-brand">{f.provider.email}</a>
                                ) : website ? (
                                  <a href={href(website)} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 text-heading hover:text-brand"><span className="truncate">{host(website)}</span><ExternalLink aria-hidden className="h-3.5 w-3.5 shrink-0 text-ink-muted" /></a>
                                ) : null}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}

                  <div className="flex flex-col gap-2">
                    {website && !gated ? (
                      <a href={href(website)} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-[14px] font-bold text-white hover:bg-brand-dark hover:text-white"><Globe aria-hidden className="h-4 w-4" />Visit their website</a>
                    ) : null}
                    <Link href={`/funding?q=${encodeURIComponent(funderName)}`} className="group inline-flex h-11 items-center justify-between gap-3 rounded-lg bg-page px-4 text-[14px] font-semibold text-heading hover:bg-brand-tint hover:text-brand">
                      <span className="truncate">{fundCount > 1 ? `${fundCount} funds from this funder` : "More from this funder"}</span>
                      <ArrowRight aria-hidden className="h-4 w-4 shrink-0 transition group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              </section>

              {gated ? <MemberValue back={path} unlocks={lockedTerms} plan={plan} /> : null}

              {/* Help applying, as in the services panel on the list */}
              <Link href="/experts" className="group flex items-center gap-3 rounded-2xl bg-navy p-4 text-white hover:text-white">
                <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#FFCF1A]"><Users className="h-5 w-5" /></span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[14px] font-bold leading-tight">Need help applying?</span>
                  <span className="text-[12px] leading-snug text-white/70">An expert can check you qualify and get your papers ready.</span>
                </span>
                <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-[#FFCF1A] transition group-hover:translate-x-0.5" />
              </Link>

              <Connected contentItemId={item.id} title="Goes well with this" hideEmpty />
            </aside>
          </div>
        </div>
      </article>
    </OnboardingGate>
  );
}

/** Browser title, description and share picture for this page (src/lib/seo.ts). */
export const generateMetadata = ({ params }: { params: { slug: string } }) => itemMetadata("FUNDING_PROGRAMME", params.slug);
