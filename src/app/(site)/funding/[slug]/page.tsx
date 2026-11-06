import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, CalendarClock, Check, ExternalLink, FileText, Globe, LockKeyhole, Percent, Repeat, Wallet, type LucideIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { googleEnabled } from "@/lib/auth";
import { popupPlan } from "@/lib/billing";
import { cachedMemberPlan } from "@/lib/cached";
import { directoryFor, isMemberOnly } from "@/lib/content-fields";
import { date, moneyRange } from "@/lib/format";
import { ChildSections, loadChildSections } from "@/components/ChildSections";
import { Connected, Evidence, trackView } from "@/components/DetailParts";
import { DropHint } from "@/components/DropHint";
import { FieldSections, visibleGroups } from "@/components/FieldSections";
import { MemberValue } from "@/components/MemberValue";
import { OnboardingGate } from "@/components/Onboarding";
import { RememberVisit } from "@/components/Recent";
import { titleCase } from "@/components/RecordPage";

export const dynamic = "force-dynamic";

const empty = (v: unknown) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
const DAY = 86_400_000;

// Each fund gets its own solid colour, picked from its web address so they stay the same on every visit.
// All are deep enough for white text.
const COLOURS = [
  "bg-[#5B21B6]", // violet
  "bg-[#BE123C]", // red
  "bg-[#C2410C]", // orange
  "bg-[#1D4ED8]", // blue
  "bg-[#0F766E]", // teal
  "bg-[#A21CAF]", // magenta
];
const colourOf = (slug: string) => COLOURS[[...slug].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7) % COLOURS.length];

/**
 * One fund, built around what a person needs to decide: the amount and deadline at the top, then
 * whether they qualify, how to apply and the full terms.
 *
 * Client fields: Fund Name, Brief, Fund Type, Fund Provider, Provider Category, Eligibility, Amount
 * Given, Eligible Biz Type, Source Link. The amount and the terms are member detail (MEMBER_ONLY in
 * src/lib/content-fields.ts): for visitors the blurred figures are placeholders, the real values are
 * never sent, and only the names of the terms are shown, so they can see what membership opens.
 */
export default async function FundingPage({ params }: { params: { slug: string } }) {
  const viewer = await getViewer();
  const item = await prisma.contentItem.findFirst({
    where: { slug: params.slug, contentType: "FUNDING_PROGRAMME", publicationStatus: viewer.isStaff ? undefined : "PUBLISHED" },
    include: {
      primaryCategory: true,
      fundingProgramme: { include: { provider: { include: { organization: true } }, rounds: { orderBy: { opensAt: "desc" } } } },
    },
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
  const provider = (org.tradingName ?? org.legalName).replace(/^Sample:?\s*/i, "");
  const category = f.providerCategory ?? f.provider.providerCategory;
  const amount = f.amountMin === null && f.amountMax === null ? null : moneyRange(f.amountMin, f.amountMax, f.currency);

  // The round that matters: one open now, then the next to open, then the latest.
  const now = new Date();
  const round = f.rounds.find((r) => r.status === "OPEN" && (r.isRolling || !r.closesAt || r.closesAt >= now)) ?? f.rounds.find((r) => r.status === "UPCOMING") ?? f.rounds[0];
  const isOpen = round?.status === "OPEN" && (round.isRolling || !round.closesAt || round.closesAt >= now);
  const daysLeft = isOpen && round?.closesAt && !round.isRolling ? Math.max(0, Math.ceil((round.closesAt.getTime() - now.getTime()) / DAY)) : null;
  const status = !round ? null : isOpen ? (daysLeft === null ? "Open now" : daysLeft === 0 ? "Closes today" : `Open: ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`) : round.status === "UPCOMING" ? "Opening soon" : "Closed for now";

  // What membership opens on this fund: the names only.
  const dir = directoryFor("FUNDING_PROGRAMME")!;
  const memberFields = dir.fields.filter((x) => isMemberOnly("FUNDING_PROGRAMME", x) && !empty(record[x.name]));
  const lockedTerms = [...(amount ? ["Exact amount"] : []), ...memberFields.filter((x) => x.name !== "amountMin" && x.name !== "amountMax").map((x) => x.label)];
  const skip = gated ? memberFields.map((x) => x.name) : undefined;
  const needs = (f.eligibilityText ?? "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const media = sections.filter((x) => x.table.layout === "gallery");
  const lowest = plan.daily ? `${plan.daily} a day` : plan.weekly ? `${plan.weekly} a week` : plan.monthly ? `${plan.monthly} a month` : null;

  const glance: { icon: LucideIcon; label: string; value: string | null; fake?: string; note?: string }[] = [
    ...(amount ? [{ icon: Wallet, label: "Amount you can get", value: gated ? null : amount, fake: "UGX 00,000,000" }] : []),
    ...(round ? [{ icon: CalendarClock, label: isOpen ? "Apply by" : round.status === "UPCOMING" ? "Opens" : "Last closed", value: round.isRolling ? "Any time" : (date(isOpen ? round.closesAt : round.status === "UPCOMING" ? round.opensAt : round.closesAt) || "To be confirmed") }] : []),
    ...(f.interestRate !== null ? [{ icon: Percent, label: "Interest rate", value: gated ? null : `${Number(f.interestRate)}%${f.rateBasis ? ` ${f.rateBasis}` : ""}`, fake: "00.0%" }] : []),
    ...(f.repaymentMonths !== null ? [{ icon: Repeat, label: "Time to repay", value: gated ? null : `${f.repaymentMonths} months`, fake: "00 months" }] : []),
  ];
  const unlock = "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-[15px] font-bold text-ink hover:bg-accent-dark hover:text-white";
  const card = "flex scroll-mt-28 flex-col gap-4 rounded-3xl border border-line bg-white p-5 sm:p-7";
  const dropHead = "flex cursor-pointer list-none items-center justify-between gap-3";
  const h2 = "font-display text-[20px] font-extrabold leading-tight text-heading sm:text-[22px]";

  return (
    <OnboardingGate signedIn={Boolean(viewer.userId)} isMember={viewer.isMember} googleEnabled={googleEnabled} plan={plan}>
      <article>
        {/* ── The decision: what it is, how much, and by when ── */}
        <header className={`under-header-pad text-white ${colourOf(item.slug)}`}>
          <div className="container-site grid grid-cols-[minmax(0,1fr)] items-center gap-6 py-6 sm:py-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-10">
            <div className="flex min-w-0 flex-col items-start gap-3">
              <Link href="/funding" className="inline-flex items-center gap-1.5 text-sm font-semibold text-white hover:text-white/80"><ArrowLeft aria-hidden className="h-4 w-4" />All funding sources</Link>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-[13px] font-bold text-heading">{titleCase(f.fundingType)}</span>
                {status ? <span className={`rounded-full px-3 py-1 text-[13px] font-bold ${isOpen ? "bg-white text-[#1F7A4D]" : "bg-white text-ink-soft"}`}>{status}</span> : null}
                {viewer.isMember ? <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[13px] font-bold text-accent-dark"><BadgeCheck aria-hidden className="h-4 w-4" />Full access</span> : null}
              </div>
              <h1 className="font-display text-[28px] font-extrabold leading-[1.1] tracking-[-0.03em] sm:text-[38px]">{name}</h1>
              <p className="text-[16px] font-semibold">From {provider}{category ? ` · ${category}` : ""}</p>
              {item.shortSummary ? <p className="max-w-2xl text-[17px] leading-relaxed">{item.shortSummary}</p> : null}
              {gated ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
                  <Link href={path} data-onboard="" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-[15px] font-bold text-heading hover:bg-accent hover:text-ink"><LockKeyhole aria-hidden className="h-4 w-4" />See the full terms</Link>
                  {lowest ? <span className="text-[15px]">From <strong className="font-display font-extrabold">{lowest}</strong></span> : null}
                </div>
              ) : null}
              <span className="rounded-full bg-white"><RememberVisit tone="light" item={{ href: path, title: name, kind: "Funding", icon: "funding" }} /></span>
            </div>

            {glance.length ? (
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line">
                {glance.map(({ icon: Glyph, label, value, fake }, n) => {
                  // The amount leads: its own full row, in the heaviest type the site has (Inter Black, .text-hero)
                  const lead = n === 0 && Boolean(amount);
                  const alone = n === glance.length - 1 && (amount ? glance.length % 2 === 0 : glance.length % 2 === 1);
                  const figure = lead ? "text-hero text-[26px] leading-[1.1] text-heading sm:text-[32px] lg:text-[34px]" : "font-display text-[18px] font-extrabold leading-tight text-heading sm:text-[21px]";
                  return (
                  <div key={label} className={`flex min-w-0 flex-col gap-1.5 bg-white p-4 sm:p-5 ${lead || alone ? "col-span-2" : ""}`}>
                    <dt className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-muted"><Glyph aria-hidden className="h-4 w-4 text-brand" />{label}</dt>
                    <dd className="min-w-0">
                      {value !== null ? <span data-figure={lead ? "" : undefined} className={figure}>{value}</span> : (
                        <Link href={path} data-onboard="" aria-label={`See the ${label.toLowerCase()}`} className="flex items-center gap-2 text-brand">
                          <span aria-hidden className={`select-none blur-[6px] ${figure}`}>{fake}</span>
                          <LockKeyhole aria-hidden className="h-4 w-4 shrink-0" />
                        </Link>
                      )}
                    </dd>
                  </div>
                  );
                })}
              </dl>
            ) : null}
          </div>
        </header>

        <div className="bg-page">
          <div className="container-site grid grid-cols-[minmax(0,1fr)] items-start gap-4 py-5 sm:py-7 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
            <div className="flex min-w-0 flex-col gap-4">
              {/* ── Do I qualify? ── */}
              {needs.length || f.eligibleBusinessTypes.length ? (
                <section id="eligibility" className={card}>
                  <h2 className={h2}>Can you apply?</h2>
                  {needs.length ? (
                    <ul className="flex flex-col gap-2.5">
                      {needs.map((n) => <li key={n} className="flex items-start gap-2.5 text-[16px] leading-snug text-heading"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand"><Check aria-hidden className="h-3.5 w-3.5" strokeWidth={3} /></span>{n}</li>)}
                    </ul>
                  ) : null}
                  {f.eligibleBusinessTypes.length ? (
                    <div className="flex flex-col gap-2 border-t border-line pt-4">
                      <h3 className="text-[14px] font-semibold text-ink-soft">Open to these businesses</h3>
                      <ul className="flex flex-wrap gap-2">{f.eligibleBusinessTypes.map((t) => <li key={t} className="rounded-full bg-page px-3 py-1.5 text-[14px] font-semibold text-heading">{t}</li>)}</ul>
                    </div>
                  ) : null}
                </section>
              ) : null}

              {/* ── How do I apply? ── */}
              {round && (round.requiredDocuments.length || round.process || round.applicationUrl) ? (
                <section id="apply" className={card}>
                  <details className="group/drop [&>summary::-webkit-details-marker]:hidden">
                  <summary className={dropHead}><h2 className={h2}>How to apply</h2><DropHint /></summary>
                  <div className="mt-4 flex flex-col gap-4">
                  {round.requiredDocuments.length ? (
                    <div className="flex flex-col gap-2">
                      <h3 className="text-[14px] font-semibold text-ink-soft">Get these documents ready</h3>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {round.requiredDocuments.map((d) => <li key={d} className="flex items-center gap-2.5 rounded-xl bg-page px-3 py-2.5 text-[15px] font-semibold text-heading"><FileText aria-hidden className="h-4 w-4 shrink-0 text-brand" />{d}</li>)}
                      </ul>
                    </div>
                  ) : null}
                  {round.process ? <p className="whitespace-pre-line text-[16px] leading-relaxed text-ink-soft">{round.process}</p> : null}
                  {round.applicationUrl ? <a href={round.applicationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 w-fit items-center gap-2 rounded-xl bg-brand px-5 text-[15px] font-bold text-white hover:bg-brand-dark hover:text-white">Apply on their website<ExternalLink aria-hidden className="h-4 w-4" /></a> : null}
                  </div>
                  </details>
                </section>
              ) : null}

              {item.overview ? (
                <section className={card}>
                  <h2 className={h2}>About this fund</h2>
                  <p className="whitespace-pre-line text-[16px] leading-relaxed text-ink-soft">{item.overview}</p>
                </section>
              ) : null}

              {/* ── The terms: the names for visitors, everything for members ── */}
              {gated && lockedTerms.length ? (
                <section id="terms" className={card}>
                  <div className="flex flex-col gap-1">
                    <h2 className={h2}>The full terms</h2>
                    <p className="text-[15px] text-ink-soft">Know {lockedTerms.length === 1 ? "this" : "these"} before you apply.</p>
                  </div>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {lockedTerms.map((t) => (
                      <li key={t}>
                        <Link href={path} data-onboard="" className="flex items-center justify-between gap-3 rounded-xl bg-page px-3 py-2.5 text-heading hover:text-heading">
                          <span className="min-w-0 text-[15px] font-semibold">{t}</span>
                          <span className="flex shrink-0 items-center gap-1.5 text-brand"><span aria-hidden className="h-2.5 w-14 rounded-full bg-line-strong/70" /><LockKeyhole aria-hidden className="h-4 w-4" /></span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {visibleGroups("FUNDING_PROGRAMME", record, skip).length ? (
                <section id="details" className={card}>
                  <details className="group/drop [&>summary::-webkit-details-marker]:hidden">
                  <summary className={dropHead}><h2 className={h2}>More about this fund</h2><DropHint /></summary>
                  <div className="mt-4 flex flex-col gap-4"><FieldSections bare type="FUNDING_PROGRAMME" record={record} gated={gated} skip={skip} back={path} /></div>
                  </details>
                </section>
              ) : null}

              <ChildSections sections={media} gated={gated} back={path} />
              <Evidence contentItemId={item.id} lastReviewedAt={item.lastReviewedAt} nextReviewDueAt={item.nextReviewDueAt} viewer={viewer} back={path} />
            </div>

            {/* ── What to do next ── */}
            <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-32">
              {gated ? <MemberValue back={path} unlocks={lockedTerms} plan={plan} /> : null}
              {f.officialTermsUrl ? (
                <a data-visit="" href={f.officialTermsUrl} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 rounded-2xl bg-navy p-3.5 text-white transition-colors hover:bg-brand hover:text-white">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15"><Globe aria-hidden className="h-5 w-5" /></span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-display text-[16px] font-extrabold leading-tight">Visit official website</span>
                    <span className="truncate text-[13px] text-white/80">{f.officialTermsUrl.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}</span>
                  </span>
                  <ExternalLink aria-hidden className="h-5 w-5 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5" />
                </a>
              ) : null}
              <Connected contentItemId={item.id} title="Goes well with this" />
            </aside>
          </div>
        </div>
      </article>
    </OnboardingGate>
  );
}
