import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, Calculator, Check, ClipboardList, ExternalLink, FileDown, LockKeyhole } from "lucide-react";
import type { ScenarioLevel } from "@prisma/client";
import { cachedMemberPlan } from "@/lib/cached";
import { getIdea, moreIdeas, plansOf, requirementsPath } from "@/lib/ideas";
import { getViewer, FREE_PREVIEW } from "@/lib/access";
import { googleEnabled } from "@/lib/auth";
import { compactRange, date, money, moneyRange } from "@/lib/format";
import { budgetTotal } from "@/lib/costing";
import { Connected, trackView } from "@/components/DetailParts";
import { Icon } from "@/components/Icon";
import { FieldSections } from "@/components/FieldSections";
import { ChildSections, loadChildSections } from "@/components/ChildSections";
import { IdeaCard, PLAN_LABEL, PLAN_ORDER, points, titleCase } from "@/components/IdeaParts";
import { OnboardingGate } from "@/components/Onboarding";
import { RememberVisit } from "@/components/Recent";
import { ProductGallery, type GalleryImage, type GalleryVideo } from "@/components/ProductGallery";
import { WishlistButton } from "@/components/Wishlist";
import { videoId } from "@/lib/youtube";
import { popupPlan } from "@/lib/billing";

export const dynamic = "force-dynamic";

// Client business idea template (Oct 2026): Business Idea, Size, Category, Description, Key
// Requirements, Best Location, Starting Capital, Special Requirements, Target Market, Success
// Factor, Profit Potential, Key Skills, Time to Setup, and the Start-up Budget as a sub-table
// (Item, Qty, Price, Amount). Each row can carry notes.
//
// Laid out like a shop product page: photo gallery on the left; name, starting capital (shown like
// a price), key facts and actions on the right. Then, as you scroll: overview, the first
// requirements, the start-up budget, the steps, the template as a business profile table,
// related items and more ideas in the same category. Only facts the plan has are shown.
//
// Gating happens here on the server: visitors receive only the first budget lines and steps, and
// no totals. Every "Unlock" opens the onboarding pop-up.
export default async function IdeaPage({ params, searchParams }: { params: { slug: string }; searchParams: { scenario?: string } }) {
  const viewer = await getViewer();
  const [item, memberPlan] = await Promise.all([getIdea(params.slug, viewer.isStaff), cachedMemberPlan()]);
  if (!item || !item.businessIdea) notFound();
  const idea = item.businessIdea;
  const path = `/business-ideas/${item.slug}`;
  const reqPath = requirementsPath(item.slug);
  await trackView(viewer, item.id, path);
  const [media, { inCategory, list: more }] = await Promise.all([
    loadChildSections("BUSINESS_IDEA", { record: idea.id, item: item.id, org: null }),
    moreIdeas(item),
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
  const steps = gated ? idea.steps.slice(0, FREE_PREVIEW.steps) : idea.steps;
  const hiddenSteps = idea.steps.length - steps.length;
  const plan = popupPlan(memberPlan);

  const unlock = (label: string, cls = "") => (
    <Link href={path} data-onboard="" className={`inline-flex items-center gap-1.5 font-semibold text-brand hover:text-brand-dark ${cls}`}><LockKeyhole aria-hidden className="h-3.5 w-3.5" />{label}</Link>
  );

  // Requirements: the plan's key requirements, then the costed items of the chosen budget plan
  // (by cost category). Visitors see the free preview of the costed items; counts are public.
  const keyPoints = points(idea.keyRequirements);
  const allLines = scenario?.lines ?? [];
  const requirementCount = allLines.length + keyPoints.length;
  const checklist = [
    ...keyPoints.map((p) => ({ id: `k-${p}`, name: p, group: "Key requirement", isKey: true })),
    ...lines.map((l) => ({ id: l.id, name: l.description, group: l.costCategory || "Other", isKey: false })),
  ];

  // The template's own figures.
  const name = item.title.replace(/^Sample:\s*/i, "");
  const capital = compactRange(idea.capitalMin, idea.capitalMax, idea.currency);
  const capitalFull = idea.capitalMin != null || idea.capitalMax != null ? moneyRange(idea.capitalMin, idea.capitalMax, idea.currency).replace("–", " – ") : null;
  const profit = titleCase(idea.profitPotential);
  const size = titleCase(idea.businessSize);
  const experience = titleCase(idea.experienceLevel);
  const locations = points(idea.locationRequirements);
  const skills = points(idea.requiredSkills);
  const special = points(idea.licencesToInvestigate);

  // The template as a table: name, details, notes. Empty rows are left out.
  const profile = ([
    ["Business idea", name, null],
    ["Business size", size, null],
    ["Business category", [item.primaryCategory?.name, idea.businessType].filter(Boolean).filter((v, n, a) => a.indexOf(v) === n).join(" · ") || null, null],
    ["Business description", item.shortSummary ?? item.overview, null],
    ["Key requirements", keyPoints.length ? keyPoints.join(", ") : null, null],
    ["Best location", locations.length ? locations.join(", ") : null, idea.locationNotes],
    ["Starting capital", capitalFull, idea.capitalNotes],
    ["Special requirements", special.length ? special.join(", ") : null, null],
    ["Target market", idea.targetCustomers, null],
    ["Success factors", idea.successFactors ? points(idea.successFactors).join(", ") : null, null],
    ["Profit potential", profit, null],
    ["Key skills", skills.length ? skills.join(", ") : null, null],
    ["Time to set up", idea.setupTime, null],
    ["Start-up budget", scenarios.length ? <a href="#budget" className="font-semibold">{allLines.length} items in the {PLAN_LABEL[scenario!.level].toLowerCase()} plan, see below ↓</a> : null, null],
    ["Remarks", idea.remarks, null],
  ] as [string, React.ReactNode, string | null][]).filter(([, v]) => Boolean(v));

  // Gallery: the main photo, then extra photos and videos added under "Photos and media".
  const mediaRows = media.filter((s) => s.table.key === "media").flatMap((s) => s.rows).filter((r) => !gated || r.accessLevel === "PUBLIC");
  const images: GalleryImage[] = [
    ...(idea.pictureUrl ? [{ src: idea.pictureUrl, alt: name, credit: idea.pictureCredit }] : []),
    ...mediaRows.filter((r) => r.mediaType === "image").map((r) => ({ src: String(r.fileLocation), alt: String(r.altText || r.caption || name), credit: (r.credit as string) ?? null })),
  ];
  const videos: GalleryVideo[] = mediaRows.filter((r) => r.mediaType === "video").map((r, n) => ({ label: String(r.caption || `Video ${n + 1}`), href: String(r.fileLocation), youtubeId: videoId(String(r.fileLocation)) }));
  // Documents stay in their own list; photos and videos are in the gallery.
  const otherMedia = media
    .map((s) => (s.table.key === "media" ? { ...s, rows: s.rows.filter((r) => r.mediaType !== "image" && r.mediaType !== "video") } : s))
    .filter((s) => s.rows.length);

  // Key facts beside the photo: only what this plan has.
  const facts = ([
    ["Requirements", requirementCount ? `${requirementCount} items` : null],
    ["Time to set up", idea.setupTime],
    ["Profit potential", profit],
    ["Skill level", experience],
    ["Business size", size],
    ["Best locations", locations.length ? locations.join(", ") : null],
  ] as [string, string | null][]).filter(([, v]) => v);

  const tabs: [string, string][] = [
    ...(item.overview || item.shortSummary ? [["overview", "Overview"] as [string, string]] : []),
    ["requirements", "Requirements"],
    ["budget", "Start-up budget"],
    ...(idea.steps.length ? [["steps", "How to start"] as [string, string]] : []),
    ["profile", "Business profile"],
    ["plan-pdf", "PDF"],
    ["related", "Related"],
  ];
  const card = "flex scroll-mt-36 flex-col gap-3 rounded-2xl border border-line bg-white p-4";
  const h2 = "font-display text-lg font-extrabold text-heading";

  return (
    <OnboardingGate signedIn={Boolean(viewer.userId)} isMember={viewer.isMember} googleEnabled={googleEnabled} plan={plan}>
      <article className="bg-page">
        {/* ── Shop-style top: photo gallery on the left; name, starting capital, key facts and actions on the right ── */}
        <section className="bg-white">
          <div className="container-site flex flex-col gap-3 py-3 sm:gap-4 sm:py-5">
            <Link href="/business-ideas" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-brand">
              <ArrowLeft aria-hidden className="h-4 w-4" />All business ideas
            </Link>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-[minmax(0,420px)_minmax(0,1fr)] md:items-start md:gap-6 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:gap-8">
              <div className="mx-auto w-full max-w-[520px] md:max-w-none">
                <ProductGallery images={images} videos={videos} icon="idea" />
              </div>

              <div className="flex min-w-0 flex-col gap-4">
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

                {/* Starting capital, shown like a price */}
                <div className="flex flex-col gap-0.5 border-y border-line py-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Starting capital</span>
                  <span className="font-display text-[28px] font-extrabold tracking-[-0.02em] text-brand-dark sm:text-[32px]">{capitalFull ?? <span className="text-lg font-semibold text-ink-muted">Being priced</span>}</span>
                  <span className="text-xs text-ink-muted">Costed for {scenario?.location?.name ?? "Uganda"}{idea.capitalNotes ? ` · ${idea.capitalNotes}` : ""}</span>
                </div>

                {facts.length ? (
                  <dl className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line">
                    {facts.map(([k, v], n) => (
                      <div key={k} className={`flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:gap-4 ${n % 2 ? "bg-white" : "bg-brand-tint/40"}`}>
                        <dt className="shrink-0 text-[13px] text-ink-muted sm:w-36">{k}</dt>
                        <dd className="min-w-0 text-[14px] font-semibold text-heading">{v}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}

                <div className="grid gap-2 sm:grid-cols-2">
                  <Link href={reqPath} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-[15px] font-bold text-white hover:bg-brand-dark hover:text-white"><ClipboardList aria-hidden className="h-4 w-4" />Startup budget</Link>
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

        {/* Section tabs: jump links; they scroll with the page (nothing sticky on detail pages) */}
        <nav aria-label="On this page" className="border-y border-line bg-white">
          <div className="container-site flex gap-1 overflow-x-auto py-2 [scrollbar-width:none]">
            {tabs.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-page hover:text-heading">{label}</a>
            ))}
          </div>
        </nav>

        <div className="container-site flex flex-col gap-4 py-4 sm:py-5">
          {item.overview || item.shortSummary ? (
            <section id="overview" className={card}>
              <h2 className={h2}>Overview</h2>
              <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">{item.overview ?? item.shortSummary}</p>
            </section>
          ) : null}

          {/* ── Requirements: the first few, the full checklist on its own page ── */}
          <section id="requirements" className={card}>
            <div className="flex items-center justify-between gap-3">
              <h2 className={h2}>Requirements</h2>
              {requirementCount ? <Link href={reqPath} className="text-[13px] font-semibold">View all {requirementCount} →</Link> : null}
            </div>
            {checklist.length ? <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">{checklist.slice(0, 5).map((r) => <Requirement key={r.id} {...r} />)}</ul>
              : <p className="text-sm text-ink-muted">Being prepared.</p>}
          </section>

          {/* ── Start-up budget for one size; the calculator is on the requirements page ── */}
          <section id="budget" className={card}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className={h2}>Start-up budget</h2>
              {scenarios.length > 1 ? (
                <nav aria-label="Business size" className="inline-flex gap-1 rounded-full border border-line bg-page p-1">
                  {scenarios.map((s) => (
                    <Link key={s.id} href={`?scenario=${s.level}#budget`} scroll={false} aria-current={s.level === scenario!.level ? "true" : undefined}
                      className={`rounded-full px-3 py-1 text-[13px] font-semibold ${s.level === scenario!.level ? "bg-brand text-white hover:text-white" : "text-ink-soft hover:text-brand"}`}>{PLAN_LABEL[s.level]}</Link>
                  ))}
                </nav>
              ) : null}
            </div>
            {scenario ? (
              <>
                <div className="overflow-x-auto rounded-xl border border-line">
                  <table className="w-full min-w-[480px] text-left text-[13px] sm:text-sm">
                    <thead className="bg-brand-deep text-xs text-white/85">
                      <tr><th className="px-3 py-2.5 font-semibold">Item</th><th className="px-3 py-2.5 text-right font-semibold">Qty</th><th className="px-3 py-2.5 text-right font-semibold">Price</th><th className="px-3 py-2.5 text-right font-semibold">Amount</th></tr>
                    </thead>
                    <tbody>
                      {lines.map((l, n) => (
                        <tr key={l.id} className={n % 2 ? "bg-white" : "bg-brand-tint/40"}>
                          <td className="px-3 py-2.5 align-top text-heading">{l.description}<span className="block text-xs text-ink-muted">{l.costCategory || "Other"}{l.isOptional ? " · optional" : ""}</span></td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right align-top">{Number(l.quantity).toLocaleString("en-UG")}{l.unit ? ` ${l.unit}` : ""}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right align-top">{l.unitCost === null ? <span className="text-ink-muted">—</span> : money(l.unitCost, scenario.currency)}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right align-top font-semibold">{l.unitCost === null ? <span className="font-normal text-ink-muted">{l.unknownReason ?? "To be confirmed"}</span> : money(Number(l.unitCost) * Number(l.quantity), scenario.currency)}</td>
                        </tr>
                      ))}
                      {hiddenLines > 0 ? (
                        <tr><td colSpan={4} className="bg-page px-3 py-2.5">
                          <span className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-ink-muted">{hiddenLines} more {hiddenLines === 1 ? "item" : "items"} and the total</span>{unlock("Unlock the full budget", "text-sm")}</span>
                        </td></tr>
                      ) : null}
                    </tbody>
                    {!gated ? (
                      <tfoot>
                        <tr className="border-t-2 border-heading">
                          <td colSpan={3} className="px-3 py-2.5 font-bold">Total</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold">{(() => { const t = budgetTotal(scenario.lines); return t === null ? "Some costs pending" : money(t, scenario.currency); })()}</td>
                        </tr>
                      </tfoot>
                    ) : null}
                  </table>
                </div>
                <Link href={`${reqPath}#calculator`} className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold"><Calculator aria-hidden className="h-4 w-4" />Work out your own cost →</Link>
              </>
            ) : <p className="text-sm text-ink-muted">Being prepared.</p>}
          </section>

          {idea.steps.length ? (
            <section id="steps" className={card}>
              <h2 className={h2}>How to start</h2>
              <ol className="flex flex-col">
                {steps.map((s, n) => (
                  <li key={s.id} className="flex gap-3">
                    <span className="flex flex-col items-center">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">{s.stepNumber}</span>
                      {n < steps.length - 1 || hiddenSteps > 0 ? <span aria-hidden className="w-0.5 flex-1 bg-line" /> : null}
                    </span>
                    <span className="flex flex-col gap-0.5 pb-4">
                      <strong className="pt-0.5 text-[14px] font-bold text-heading">{s.title}</strong>
                      {s.description ? <span className="text-[13px] leading-relaxed text-ink-soft">{s.description}</span> : null}
                    </span>
                  </li>
                ))}
                {hiddenSteps > 0 ? (
                  <li className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-line-strong text-ink-muted"><LockKeyhole aria-hidden className="h-3 w-3" /></span>
                    <span className="text-sm text-ink-muted">{hiddenSteps} more {hiddenSteps === 1 ? "step" : "steps"}</span>{unlock("Unlock", "text-sm")}
                  </li>
                ) : null}
              </ol>
            </section>
          ) : null}

          {/* ── The client's template as a plain table, rows in alternating colours ── */}
          <section id="profile" className={card}>
            <h2 className={h2}>Business profile</h2>
            <dl className="overflow-hidden rounded-xl border border-line">
              {profile.map(([k, v, note], n) => (
                <div key={k} className={`grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-4 py-2.5 text-[13px] sm:text-sm ${n % 2 ? "bg-white" : "bg-brand-tint/40"}`}>
                  <dt className="text-ink-muted">{k}</dt>
                  <dd className="min-w-0 whitespace-pre-line break-words font-semibold text-heading">{v}{note ? <span className="mt-0.5 block text-xs font-normal text-ink-muted">{note}</span> : null}</dd>
                </div>
              ))}
            </dl>
            <FieldSections table type="BUSINESS_IDEA" record={idea as unknown as Record<string, unknown>} gated={gated} back={path} />
          </section>

          {/* ── The business plan as a designed PDF (src/lib/idea-pdf.tsx), viewed right here ── */}
          <section id="plan-pdf" className={card}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className={h2}>Business plan (PDF)</h2>
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

          <div id="related" className="scroll-mt-36"><Connected contentItemId={item.id} title="Related" /></div>

          {!viewer.isMember ? (
            <section className="flex flex-col items-start justify-between gap-3 rounded-2xl bg-brand-deep p-5 text-white sm:flex-row sm:items-center">
              <span className="font-display text-base font-extrabold">See the full budget and every step{plan.monthly ? `, from ${plan.monthly} a month` : ""}.</span>
              <Link href={path} data-onboard="" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-accent px-5 text-sm font-bold text-ink hover:bg-white hover:text-ink"><LockKeyhole aria-hidden className="h-4 w-4" />Unlock</Link>
            </section>
          ) : null}

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
        </div>
      </article>
    </OnboardingGate>
  );
}

function Requirement({ name, group, isKey }: { name: string; group: string; isKey: boolean }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${isKey ? "bg-brand text-white" : "bg-brand-tint text-brand"}`}><Check aria-hidden className="h-3.5 w-3.5" strokeWidth={3} /></span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-semibold text-heading">{name}</span>
        <span className="text-xs text-ink-muted">{group}</span>
      </span>
      {isKey ? <span className="hidden rounded-full bg-accent-tint px-2.5 py-0.5 text-[11px] font-semibold text-accent-dark sm:inline">Key</span> : null}
    </li>
  );
}
