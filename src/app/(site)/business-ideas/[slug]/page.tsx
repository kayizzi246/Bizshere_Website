import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, ClipboardList, ExternalLink, FileDown, FileText, Lightbulb, LockKeyhole, Rocket, Wallet } from "lucide-react";
import type { ScenarioLevel } from "@prisma/client";
import { cachedMemberPlan } from "@/lib/cached";
import { getIdea, moreIdeas, plansOf, requirementsPath } from "@/lib/ideas";
import { getViewer, FREE_PREVIEW } from "@/lib/access";
import { googleEnabled } from "@/lib/auth";
import { compactRange, contentTypeLabel, date, itemHref, money, moneyRange } from "@/lib/format";
import { DIRECTORIES } from "@/config/directories";
import { SectionTitle } from "@/components/SectionTitle";
import { prisma } from "@/lib/prisma";
import { budgetTotal } from "@/lib/costing";
import { trackView } from "@/components/DetailParts";
import { Icon } from "@/components/Icon";
import { ChildSections, loadChildSections } from "@/components/ChildSections";
import { IdeaCard, PLAN_LABEL, PLAN_ORDER, points, titleCase } from "@/components/IdeaParts";
import { DropHint } from "@/components/DropHint";
import { MemberValue } from "@/components/MemberValue";
import { OnboardingGate } from "@/components/Onboarding";
import { RecentStrip, RememberVisit } from "@/components/Recent";
import { ProductGallery, type GalleryImage, type GalleryVideo } from "@/components/ProductGallery";
import { WishlistButton } from "@/components/Wishlist";
import { videoId } from "@/lib/youtube";
import { popupPlan } from "@/lib/billing";

/** The template rows that matter most, highlighted in the table. */
const KEY_ROWS = ["Starting Capital", "Profit Potential", "Time to setup"];

export const dynamic = "force-dynamic";

// Client business idea template (Oct 2026): Business Idea, Size, Category, Description, Key
// Requirements, Best Location, Starting Capital, Special Requirements, Target Market, Success
// Factor, Profit Potential, Key Skills, Time to Setup, and the Start-up Budget as a sub-table
// (Sn, Item, Qty, Price (est), Amount, Remarks). Each row can carry notes.
//
// Kept simple and in the document's order: photo gallery, name, starting capital and actions at the
// top; then the template table (S/N, Name, Details, Notes, all 14 rows), the Start-up Budget
// sub-table, the business plan PDF, and more ideas. The steps and the full detail are in the PDF.
//
// Gating happens here on the server: visitors receive only the first budget lines, and no totals. Every "Unlock" opens the onboarding pop-up.
export default async function IdeaPage({ params, searchParams }: { params: { slug: string }; searchParams: { scenario?: string } }) {
  const viewer = await getViewer();
  const [item, memberPlan] = await Promise.all([getIdea(params.slug, viewer.isStaff), cachedMemberPlan()]);
  if (!item || !item.businessIdea) notFound();
  const idea = item.businessIdea;
  const path = `/business-ideas/${item.slug}`;
  const reqPath = requirementsPath(item.slug);
  await trackView(viewer, item.id, path);
  const [media, { inCategory, list: more }, linked, next] = await Promise.all([
    loadChildSections("BUSINESS_IDEA", { record: idea.id, item: item.id, org: null }),
    moreIdeas(item),
    // For the gallery: photos of the machines and suppliers this idea is linked to (Related, set in the admin)
    prisma.relatedContent.findMany({
      where: { fromItemId: item.id, toItem: { publicationStatus: "PUBLISHED", contentType: { in: ["MACHINE", "SUPPLIER"] } } },
      orderBy: { displayOrder: "asc" },
      take: 8,
      select: { toItem: { select: { title: true, slug: true, contentType: true, machine: { select: { pictureUrl: true, pictureCredit: true } }, supplier: { select: { pictureUrl: true, pictureCredit: true } } } } },
    }),
    // For "What you need to start": everything this idea is linked to, except other ideas
    prisma.relatedContent.findMany({
      where: { fromItemId: item.id, toItem: { publicationStatus: "PUBLISHED", contentType: { not: "BUSINESS_IDEA" } } },
      orderBy: { displayOrder: "asc" },
      take: 6,
      select: { toItem: { select: { id: true, title: true, slug: true, contentType: true } } },
    }),
  ]);

  const scenarios = plansOf(idea);
  const wanted = PLAN_ORDER.find((l) => l === searchParams.scenario) as ScenarioLevel | undefined;
  const scenario = scenarios.find((s) => s.level === wanted) ?? scenarios.find((s) => s.level === "STANDARD") ?? scenarios[0];
  // The PDF follows the plan size picked here (Small, Medium, Large).
  const pdfPath = `${path}/pdf${scenario ? `?scenario=${scenario.level}` : ""}`;
  const pdfDownload = `${pdfPath}${scenario ? "&" : "?"}download=1`;

  const gated = item.accessLevel !== "PUBLIC" && !viewer.isMember;
  const lines = scenario ? (gated ? scenario.lines.slice(0, FREE_PREVIEW.budgetLines) : scenario.lines) : [];
  const hiddenLines = scenario ? scenario.lines.length - lines.length : 0;
  // How many items have a sourced price (a count only: public)
  const priced = scenario ? scenario.lines.filter((l) => l.unitCost !== null).length : 0;
  const plan = popupPlan(memberPlan);

  const unlock = (label: string, cls = "") => (
    <Link href={path} data-onboard="" className={`inline-flex items-center gap-1.5 font-semibold text-brand hover:text-brand-dark ${cls}`}><LockKeyhole aria-hidden className="h-3.5 w-3.5" />{label}</Link>
  );

  // Key requirements, one per line in the admin, for the template's "Key Requirements" row.
  const keyPoints = points(idea.keyRequirements);

  // The template's own figures.
  const name = item.title.replace(/^Sample:\s*/i, "");
  const capital = compactRange(idea.capitalMin, idea.capitalMax, idea.currency);
  const capitalFull = idea.capitalMin != null || idea.capitalMax != null ? moneyRange(idea.capitalMin, idea.capitalMax, idea.currency).replace("–", " – ") : null;
  const profit = titleCase(idea.profitPotential);
  const size = titleCase(idea.businessSize);
  const locations = points(idea.locationRequirements);
  const skills = points(idea.requiredSkills);
  const special = points(idea.licencesToInvestigate);

  // The client's template (BUSINESS IDEA TEMPLATE), word for word: S/N, Name, Details, Notes.
  // All 14 rows always show, in the document's order; an empty one says "—".
  const join = (xs: string[]) => (xs.length ? xs.join(", ") : null);
  const template: [string, React.ReactNode, string | null][] = [
    ["Business Idea", name, null],
    ["Business Size", size, null],
    ["Business Category", [item.primaryCategory?.name, idea.businessType].filter(Boolean).filter((v, n, a) => a.indexOf(v) === n).join(" · ") || null, null],
    ["Business Description", item.shortSummary ?? item.overview, null],
    ["Key Requirements", join(keyPoints), null],
    ["Best Location", join(locations), idea.locationNotes],
    ["Starting Capital", capitalFull, idea.capitalNotes],
    ["Special Requirements", join(special), null],
    ["Target Market", idea.targetCustomers, null],
    ["Success Factor", idea.successFactors ? join(points(idea.successFactors)) : null, null],
    ["Profit Potential", profit, null],
    ["Key Skills", join(skills), null],
    ["Time to setup", idea.setupTime, null],
    ["Startup Budget", scenarios.length ? <Link href={`?scenario=${scenario!.level}#budget`} className="font-semibold text-brand">See the start-up budget below ↓</Link> : null, null],
  ];

  // Gallery: the main photo, then extra photos and videos added under "Photos and media".
  const mediaRows = media.filter((s) => s.table.key === "media").flatMap((s) => s.rows).filter((r) => !gated || r.accessLevel === "PUBLIC");
  const images: GalleryImage[] = [
    ...(idea.pictureUrl ? [{ src: idea.pictureUrl, alt: name, credit: idea.pictureCredit }] : []),
    ...mediaRows.filter((r) => r.mediaType === "image").map((r) => ({ src: String(r.fileLocation), alt: String(r.altText || r.caption || name), credit: (r.credit as string) ?? null, label: (r.caption as string) || null })),
    // Then what it takes, with a way to open each: the machines and suppliers it is linked to
    ...linked.flatMap(({ toItem: t }) => {
      const pic = t.machine ?? t.supplier;
      if (!pic?.pictureUrl) return [];
      const kind = t.contentType === "MACHINE" ? "Machine" : "Supplier";
      return [{ src: pic.pictureUrl, alt: t.title, credit: pic.pictureCredit, label: `${kind} · ${t.title.replace(/^Sample:s*/i, "")}`, href: itemHref(t) }];
    }),
  ];
  const videos: GalleryVideo[] = mediaRows.filter((r) => r.mediaType === "video").map((r, n) => ({ label: String(r.caption || `Video ${n + 1}`), href: String(r.fileLocation), youtubeId: videoId(String(r.fileLocation)) }));
  // Documents stay in their own list; photos and videos are in the gallery.
  const otherMedia = media
    .map((s) => (s.table.key === "media" ? { ...s, rows: s.rows.filter((r) => r.mediaType !== "image" && r.mediaType !== "video") } : s))
    .filter((s) => s.rows.length);

  const dropHead = "flex cursor-pointer list-none items-center justify-between gap-3";
  const card = "flex scroll-mt-36 flex-col gap-5 rounded-3xl border border-line bg-white p-4 shadow-[0_8px_30px_rgba(7,26,51,0.04)] sm:p-7";
  const h2 = "font-display text-lg font-extrabold text-heading";

  return (
    <OnboardingGate signedIn={Boolean(viewer.userId)} isMember={viewer.isMember} googleEnabled={googleEnabled} plan={plan}>
      <article className="bg-page">
        {/* ── Shop-style top: photo gallery on the left; name, starting capital, key facts and actions on the right ── */}
        {/* Its own soft background (light blue into warm peach), running up behind the floating header */}
        <section className="under-header-pad border-b border-line bg-[radial-gradient(70%_90%_at_0%_0%,#DCEBF8_0%,transparent_60%),radial-gradient(60%_80%_at_100%_10%,#FFE8D2_0%,transparent_55%),linear-gradient(180deg,#F5F9FD,#FFFFFF)]">
          <div className="container-site flex flex-col gap-3 py-3 sm:gap-4 sm:py-5">
            <Link href="/business-ideas" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-brand">
              <ArrowLeft aria-hidden className="h-4 w-4" />All business ideas
            </Link>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-[minmax(0,420px)_minmax(0,1fr)] md:items-start md:gap-6 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:gap-8">
              <div className="mx-auto w-full max-w-[520px] md:max-w-none">
                <ProductGallery images={images} videos={videos} icon="idea" />
              </div>

              {/* A slim gradient divider down the left of the details (desktop): blue into orange, fading out at both ends */}
              <div className="flex min-w-0 flex-col gap-4 md:border-l-2 md:border-transparent md:pl-6 md:[border-image:linear-gradient(to_bottom,transparent,#157EC2_18%,#F28C28_82%,transparent)_1] lg:pl-8">
                <div className="flex flex-col gap-2.5">
                  {item.primaryCategory ? (
                    <Link href={`/business-ideas?category=${item.primaryCategory.id}`} className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-tint px-3 py-1 text-xs font-bold text-brand-dark hover:text-brand">
                      <Icon name="idea" className="h-3.5 w-3.5" />{item.primaryCategory.name}
                    </Link>
                  ) : null}
                  <h1 className="font-display text-[28px] font-extrabold leading-[1.1] tracking-[-0.03em] text-heading sm:text-[34px]">{name} business</h1>
                  {item.shortSummary ? <p className="text-[15px] leading-relaxed text-ink-soft">{item.shortSummary}</p> : null}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <RememberVisit item={{ href: path, title: name, kind: "Business idea", icon: "idea", picture: idea.pictureUrl }} />
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-ink-soft"><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />Reviewed {date(item.lastReviewedAt)}</span>
                    {viewer.isMember ? <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-tint px-3 py-1 font-bold text-accent-dark"><BadgeCheck aria-hidden className="h-3.5 w-3.5" />Full access</span> : null}
                  </div>
                </div>

                {/* Starting capital, shown like a price, on a tinted card */}
                <div className="relative flex items-center gap-4 overflow-hidden rounded-2xl bg-[linear-gradient(120deg,#E8F2FA,#FFF4E8)] p-4 sm:p-5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-accent-dark shadow-sm"><Wallet aria-hidden className="h-6 w-6" /></span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">Starting capital</span>
                    <span className="font-display text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-brand-dark sm:text-[30px]">{capitalFull ?? <span className="text-lg font-semibold text-ink-soft">Being priced</span>}</span>
                    <span className="text-xs text-ink-muted">Costed for {scenario?.location?.name ?? "Uganda"}{idea.capitalNotes ? ` · ${idea.capitalNotes}` : ""}</span>
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {/* No costed budget yet: say so instead of opening an empty page */}
                  {scenarios.some((sc) => sc.lines.length) ? (
                    <Link href={reqPath} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-[15px] font-bold text-white hover:bg-brand-dark hover:text-white"><ClipboardList aria-hidden className="h-4 w-4" />Startup budget</Link>
                  ) : (
                    <span aria-disabled="true" className="inline-flex h-12 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-page px-5 text-[15px] font-semibold text-ink-muted ring-1 ring-line"><ClipboardList aria-hidden className="h-4 w-4" />Startup budget unavailable</span>
                  )}
                  <WishlistButton id={item.id} />
                </div>
                <a href={pdfDownload} className="-mt-1 inline-flex h-11 w-fit items-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold text-heading hover:border-brand hover:text-brand"><FileDown aria-hidden className="h-4 w-4" />Download business plan (PDF)</a>
                {gated ? (
                  <p className="-mt-1 text-[13px] text-ink-muted">Members see the full budget with totals and every step. {unlock("Unlock", "text-[13px]")}</p>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <div className="container-site flex flex-col gap-4 py-5 sm:py-6">
          {/* ── 1. The template, as in the client's document: S/N, Name, Details, Notes ── */}
          <section id="template" className={card} data-reveal="">
            <details className="group/drop [&>summary::-webkit-details-marker]:hidden">
              <summary className={dropHead}><SectionTitle n="01" kicker="The idea" title="Business idea" sub="Everything about this business, as one simple table." icon={Lightbulb} /><DropHint /></summary>
            <div className="mt-5 overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[640px] text-left text-[15px] sm:text-[16px]">
                <thead className="bg-brand-deep text-[14px] text-white">
                  <tr><th className="w-12 px-3 py-3 font-bold">S/N</th><th className="w-56 px-3 py-3 font-bold">Name</th><th className="px-3 py-3 font-bold">Details</th><th className="px-3 py-3 font-bold">Notes</th></tr>
                </thead>
                <tbody>
                  {template.map(([k, v, note], n) => (
                    <tr key={k} className={`border-t border-line align-top ${KEY_ROWS.includes(k) ? "bg-accent-tint/60" : n % 2 ? "bg-white" : "bg-brand-tint/40"}`}>
                      <td className="px-3 py-2.5 text-ink-muted">{n + 1}</td>
                      <td className="px-3 py-2.5 font-display font-extrabold text-heading">{KEY_ROWS.includes(k) ? <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />{k}</span> : k}</td>
                      <td className={`whitespace-pre-line break-words px-3 py-2.5 font-semibold ${KEY_ROWS.includes(k) ? "text-brand-dark" : "text-heading"}`}>{v || <span className="font-normal text-ink-muted">—</span>}</td>
                      <td className="whitespace-pre-line break-words px-3 py-2.5 text-ink-muted">{note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </details>
          </section>

          {/* ── 2. Start-up Budget, the template's separate sub-table: Sn, Item, Qty, Price (est), Amount, Remarks ── */}
          <section id="budget" className={card} data-reveal="">
            <details open={Boolean(wanted)} className="group/drop [&>summary::-webkit-details-marker]:hidden">
              <summary className={dropHead}><SectionTitle n="02" kicker="What it costs" title="Start-up Budget" sub="What to buy and pay to open, item by item." icon={Wallet} /><DropHint /></summary>
            <div className="mt-5 flex flex-col gap-5">
              {scenarios.length > 1 ? (
                <nav aria-label="Business size" className="inline-flex w-fit gap-1 rounded-full border border-line bg-page p-1">
                  {scenarios.map((s) => (
                    <Link key={s.id} href={`?scenario=${s.level}#budget`} scroll={false} aria-current={s.level === scenario!.level ? "true" : undefined}
                      className={`rounded-full px-3 py-1 text-[13px] font-semibold ${s.level === scenario!.level ? "bg-brand text-white hover:text-white" : "text-ink-soft hover:text-brand"}`}>{PLAN_LABEL[s.level]}</Link>
                  ))}
                </nav>
              ) : null}
            {scenario ? (
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <Stat label="Items" value={String(scenario.lines.length)} />
                <div className="flex flex-col gap-1.5 rounded-2xl bg-page p-3 sm:p-4">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Priced</span>
                  <span className="font-display text-[18px] font-extrabold leading-tight text-heading sm:text-[22px]">{priced}<span className="text-[14px] font-semibold text-ink-muted"> / {scenario.lines.length}</span></span>
                  <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-line"><span className="block h-full rounded-full bg-brand" style={{ width: `${scenario.lines.length ? Math.round((priced / scenario.lines.length) * 100) : 0}%` }} /></span>
                </div>
                <Stat label="Total" value={gated ? "Members" : budgetTotal(scenario.lines) === null ? "Pending" : money(budgetTotal(scenario.lines)!, scenario.currency)} accent />
              </div>
            ) : null}
            {scenario ? (
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[640px] text-left text-[13px] sm:text-sm">
                  <thead className="bg-brand-deep text-xs text-white/90">
                    <tr>
                      <th className="w-12 px-3 py-2.5 font-semibold">Sn</th><th className="px-3 py-2.5 font-semibold">Item</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Qty</th><th className="px-3 py-2.5 text-right font-semibold">Price (est)</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Amount</th><th className="px-3 py-2.5 font-semibold">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l, n) => (
                      <tr key={l.id} className={`border-t border-line align-top ${n % 2 ? "bg-white" : "bg-brand-tint/40"}`}>
                        <td className="px-3 py-2.5 text-ink-muted">{n + 1}</td>
                        <td className="px-3 py-2.5 font-semibold text-heading">{l.description}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right">{Number(l.quantity).toLocaleString("en-UG")}{l.unit ? ` ${l.unit}` : ""}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right">{l.unitCost === null ? <span className="text-ink-muted">—</span> : money(l.unitCost, scenario.currency)}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold">{l.unitCost === null ? <span className="font-normal text-ink-muted">—</span> : money(Number(l.unitCost) * Number(l.quantity), scenario.currency)}</td>
                        <td className="px-3 py-2.5 text-ink-muted">{[l.unitCost === null ? (l.unknownReason ?? "Price to be confirmed") : null, l.isOptional ? "Optional" : null, l.details].filter(Boolean).join(" · ") || null}</td>
                      </tr>
                    ))}
                    {hiddenLines > 0 ? (
                      <tr className="border-t border-line"><td colSpan={6} className="bg-page px-3 py-2.5">
                        <span className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-ink-muted">{hiddenLines} more {hiddenLines === 1 ? "item" : "items"} and the total</span>{unlock("Unlock the full budget", "text-sm")}</span>
                      </td></tr>
                    ) : null}
                  </tbody>
                  {!gated ? (
                    <tfoot>
                      <tr className="border-t-2 border-heading">
                        <td colSpan={4} className="px-3 py-2.5 font-bold">Total</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold">{(() => { const t = budgetTotal(scenario.lines); return t === null ? "Some costs pending" : money(t, scenario.currency); })()}</td>
                        <td />
                      </tr>
                    </tfoot>
                  ) : null}
                </table>
              </div>
            ) : <p className="text-sm text-ink-muted">Being prepared.</p>}
            </div>
            </details>
          </section>

          {/* ── What it takes: the machines, funding, experts and tools linked to this idea ── */}
          {next.length ? (
            <section className={card} data-reveal="">
              <SectionTitle n="+" kicker="Keep going" title="What you need to start" sub="Machines, money and people for this business, checked by our team." icon={Rocket} />
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {next.map(({ toItem: t }) => (
                  <li key={t.id}>
                    <Link href={itemHref(t)} className="group flex h-full items-center gap-3 rounded-2xl border border-line bg-page/50 p-3.5 text-ink transition hover:-translate-y-0.5 hover:border-brand hover:bg-white hover:text-ink">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-brand ring-1 ring-line transition group-hover:bg-brand group-hover:text-white group-hover:ring-brand"><Icon name={t.contentType === "RECIPE" ? "recipe" : DIRECTORIES.find((d) => d.type === t.contentType)?.icon ?? "link"} className="h-5 w-5" /></span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-accent-dark">{contentTypeLabel[t.contentType] ?? "Related"}</span>
                        <span className="truncate font-display text-[15px] font-bold text-heading group-hover:text-brand">{t.title.replace(/^Sample:?\s*/i, "")}</span>
                      </span>
                      <span aria-hidden className="text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-brand">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* ── 3. The business plan as a designed PDF (src/lib/idea-pdf.tsx), viewed right here ── */}
          <section id="plan-pdf" className={card} data-reveal="">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SectionTitle n="03" kicker="Your plan" title="Business plan (PDF)" sub="The whole plan, with the steps to start, to keep or print." icon={FileText} />
              <span className="flex gap-2">
                <a href={pdfPath} target="_blank" rel="noopener" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-[13px] font-semibold text-heading hover:border-brand hover:text-brand"><ExternalLink aria-hidden className="h-3.5 w-3.5" />Open</a>
                <a href={pdfDownload} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-[13px] font-semibold text-white hover:bg-brand-dark hover:text-white"><FileDown aria-hidden className="h-3.5 w-3.5" />Download</a>
              </span>
            </div>
            {/* Phones often can't show a PDF inside a page: they get the buttons above */}
            <iframe src={`${pdfPath}#view=FitH`} title={`${name} business plan (PDF)`} loading="lazy" className="hidden h-[760px] w-full rounded-xl border border-line bg-page sm:block" />
            <p className="text-[13px] text-ink-muted sm:hidden">Tap Open to read the plan, or Download to keep it.</p>
            {gated ? <p className="text-[12px] text-ink-muted">This is the free preview. Members get the full plan with every budget size and step.</p> : null}
          </section>

          <ChildSections compact sections={otherMedia} gated={gated} back={path} />

          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-muted">
            <span className="inline-flex items-center gap-1.5"><BadgeCheck aria-hidden className="h-4 w-4 text-brand" />Checked {date(item.lastReviewedAt)}</span>
            <span aria-hidden>·</span>
            <Link href={`/corrections?item=${item.id}`} className="font-semibold text-ink-soft hover:text-brand">Report a mistake</Link>
          </p>

          {gated ? <MemberValue wide back={path} plan={plan} unlocks={[hiddenLines > 0 ? `${hiddenLines} more budget item${hiddenLines === 1 ? "" : "s"}` : "The full start-up budget", ...(scenarios.length > 1 ? ["Every budget size"] : []), "Every step to start"]} /> : null}

          {/* ── More ideas: the same category, or others when it has none ── */}
          {more.length ? (
            <section className="flex flex-col gap-3">
              <div className="flex items-end justify-between gap-3">
                <h2 className={h2}>{inCategory ? `More ${item.primaryCategory!.name.toLowerCase()} businesses` : "More business ideas"}</h2>
                <Link href={inCategory ? `/business-ideas?category=${item.primaryCategory!.id}` : "/business-ideas"} className="shrink-0 text-sm font-semibold">View all →</Link>
              </div>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
                {more.map((m) => <li key={m.id}><IdeaCard idea={m} /></li>)}
              </ul>
            </section>
          ) : null}

          {/* What they looked at before: easy to go back to, and the site feels like theirs */}
          <RecentStrip exclude={path} title="You looked at these recently" />
        </div>
      </article>
    </OnboardingGate>
  );
}


/** A number in the budget summary. */
function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex flex-col gap-1.5 rounded-2xl p-3 sm:p-4 ${accent ? "bg-brand text-white" : "bg-page"}`}>
      <span className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${accent ? "text-white/75" : "text-ink-muted"}`}>{label}</span>
      <span className={`truncate font-display text-[18px] font-extrabold leading-tight sm:text-[22px] ${accent ? "" : "text-heading"}`}>{value}</span>
    </div>
  );
}
