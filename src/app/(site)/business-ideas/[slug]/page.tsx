import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, BookOpen, Calculator, Check, ChevronDown, Clock, ClipboardList, LockKeyhole, MapPin, Ruler, Table2, TrendingUp, Wallet, Wrench } from "lucide-react";
import type { ScenarioLevel } from "@prisma/client";
import { cachedMemberPlan } from "@/lib/cached";
import { getIdea, moreIdeas, plansOf, requirementsPath } from "@/lib/ideas";
import { getViewer, FREE_PREVIEW } from "@/lib/access";
import { googleEnabled } from "@/lib/auth";
import { compactRange, date, money, moneyRange } from "@/lib/format";
import { budgetTotal } from "@/lib/costing";
import { Connected, Evidence, trackView } from "@/components/DetailParts";
import { Icon } from "@/components/Icon";
import { FieldSections } from "@/components/FieldSections";
import { ChildSections, loadChildSections } from "@/components/ChildSections";
import { IdeaCard, LEVEL_DOTS, PLAN_LABEL, PLAN_ORDER, points, titleCase } from "@/components/IdeaParts";
import { OnboardingGate } from "@/components/Onboarding";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

// Client business idea template (Oct 2026): Business Idea, Size, Category, Description, Key
// Requirements, Best Location, Starting Capital, Special Requirements, Target Market, Success
// Factor, Profit Potential, Key Skills, Time to Setup, and the Start-up Budget as a sub-table
// (Item, Qty, Price, Amount). Each row can carry notes.
//
// Laid out as a start-up guide: photo hero with the requirement count and starting capital, the
// description, an overview strip, a four-part guide, popular requirements and their categories,
// the template as a business profile table, the start-up budget, the steps, questions answered
// from the plan's own data, a call to action and more ideas in the same category. Only facts the
// plan has are shown; nothing is filled in.
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

  const gated = item.accessLevel !== "PUBLIC" && !viewer.isMember;
  const lines = scenario ? (gated ? scenario.lines.slice(0, FREE_PREVIEW.budgetLines) : scenario.lines) : [];
  const hiddenLines = scenario ? scenario.lines.length - lines.length : 0;
  const steps = gated ? idea.steps.slice(0, FREE_PREVIEW.steps) : idea.steps;
  const hiddenSteps = idea.steps.length - steps.length;
  const plan = {
    name: memberPlan?.name ?? "Member",
    monthly: memberPlan?.priceMonthly != null ? money(memberPlan.priceMonthly, memberPlan.currency) : null,
    yearly: memberPlan?.priceYearly != null ? money(memberPlan.priceYearly, memberPlan.currency) : null,
  };

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
  const byCategory = [...allLines.reduce((m, l) => m.set(l.costCategory || "Other", (m.get(l.costCategory || "Other") ?? 0) + 1), new Map<string, number>())];
  const categories: [string, number][] = [...(keyPoints.length ? [["Key requirements", keyPoints.length] as [string, number]] : []), ...byCategory];
  const biggest = Math.max(1, ...categories.map(([, n]) => n));
  const totals = scenarios.map((s) => ({ level: s.level, total: budgetTotal(s.lines), currency: s.currency }));
  const firstStep = idea.steps[0]?.title;

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

  // Overview strip: only the facts this plan has.
  const overview = ([
    [Wallet, "Starting capital", capital, idea.capitalNotes ?? (scenarios.length ? `${scenarios.length} budget ${scenarios.length === 1 ? "plan" : "plans"} below` : null), null],
    [Clock, "Time to set up", idea.setupTime, null, null],
    [TrendingUp, "Profit potential", profit, null, idea.profitPotential],
    [Wrench, "Skill level", experience, skills.length ? `${skills.length} key ${skills.length === 1 ? "skill" : "skills"}` : null, idea.experienceLevel],
    [Ruler, "Business size", size, idea.businessType, null],
  ] as [typeof Wallet, string, string | null, string | null, string | null][]).filter(([, , v]) => v);

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

  // Questions answered from the plan's own data; a question without an answer is left out.
  const faq = ([
    [`How much does it cost to start a ${name.toLowerCase()} business in Uganda?`,
      capitalFull || scenarios.length ? <>
        {capitalFull ? <>Starting capital is about {capitalFull}{idea.capitalNotes ? `. ${idea.capitalNotes.replace(/\.$/, "")}` : ""}. </> : null}
        {scenarios.length === 0 ? null
          : gated ? <>The start-up budget lists {allLines.length} costed items{scenario?.estimateDate ? `, priced as of ${date(scenario.estimateDate)}` : ""}. Members see every cost and the total. {unlock("Unlock the budget")}</>
          : <>Budget plans: {totals.map((t) => `${PLAN_LABEL[t.level]} ${t.total === null ? "(some costs pending)" : money(t.total, t.currency)}`).join(" · ")}. Prices change, so confirm quotes with suppliers before you pay.</>}
      </> : null],
    [`How long does it take to set up a ${name.toLowerCase()} business?`, idea.setupTime ? <>About {idea.setupTime}{firstStep ? <>, starting with “{firstStep}”</> : null}.</> : null],
    [`What do I need to start a ${name.toLowerCase()} business?`, keyPoints.length ? <>{keyPoints.join("; ")}{special.length ? <>, plus {special.join(", ").toLowerCase()}</> : null}. See the full checklist under Requirements.</> : null],
    [`Is a ${name.toLowerCase()} business profitable?`, profit ? <>Our researchers rate its profit potential as {profit.toLowerCase()}.{idea.successFactors ? <> It depends most on {points(idea.successFactors).join(", ").toLowerCase()}.</> : null}</> : null],
    ["Do I need special skills?", experience || skills.length ? <>{experience ? `${experience} level. ` : ""}{skills.length ? `Key skills: ${skills.join(", ").toLowerCase()}.` : ""}</> : null],
    ["Where is the best place to set it up?", locations.length ? <>{locations.join(", ")}.{idea.locationNotes ? ` ${idea.locationNotes}` : ""}</> : null],
    ["Who are the customers?", idea.targetCustomers],
  ] as [string, React.ReactNode][]).filter(([, a]) => Boolean(a));

  return (
    <OnboardingGate signedIn={Boolean(viewer.userId)} isMember={viewer.isMember} googleEnabled={googleEnabled} plan={plan}>
      <article className="bg-page">
        {/* ── Hero: the photo full width, name, requirement count, capital and the main action ── */}
        <header className="relative isolate overflow-hidden bg-[#071A33] text-white">
          {idea.pictureUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={idea.pictureUrl} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
              <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-[#071A33]/90 via-[#071A33]/70 to-[#071A33]/30" />
            </>
          ) : null}
          <div className={`container-site flex flex-col justify-end gap-5 py-10 sm:py-14 ${idea.pictureUrl ? "min-h-[340px] sm:min-h-[420px]" : ""}`}>
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[13px] text-white/70">
              <Link href="/business-ideas" className="inline-flex items-center gap-1 text-white/70 hover:text-white"><ArrowLeft aria-hidden className="h-3.5 w-3.5" />Business ideas</Link>
              {item.primaryCategory ? <><span aria-hidden>›</span><Link href={`/business-ideas?category=${item.primaryCategory.id}`} className="text-white/70 hover:text-white">{item.primaryCategory.name}</Link></> : null}
              <span aria-hidden>›</span>
              <span className="max-w-[32ch] truncate font-semibold text-white">{name}</span>
            </nav>
            <h1 className="text-page-title max-w-3xl">{name} business in Uganda</h1>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3.5 text-sm backdrop-blur"><ClipboardList aria-hidden className="h-4 w-4 text-accent" /><strong>{requirementCount}</strong> requirements</span>
              {capital ? <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3.5 text-sm backdrop-blur"><Wallet aria-hidden className="h-4 w-4 text-accent" /><strong>{capital}</strong> starting capital</span> : null}
              <Link href={reqPath} className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-bold text-ink hover:bg-white hover:text-ink">View full requirements →</Link>
              {viewer.isMember ? <PrintButton /> : null}
            </div>
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-white/60">
              <span>Costed for {scenario?.location?.name ?? "Uganda"}</span>
              <span>Reviewed {date(item.lastReviewedAt)}</span>
              {idea.pictureCredit ? <span>{idea.pictureCredit}</span> : null}
              {viewer.isMember ? <span className="inline-flex items-center gap-1 text-accent"><BadgeCheck aria-hidden className="h-3.5 w-3.5" />Full access</span> : null}
            </p>
          </div>
        </header>

        {/* ── Description ── */}
        {item.overview || item.shortSummary ? (
          <div className="bg-white">
            <div className="container-site py-8">
              <p className="max-w-3xl whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{item.overview ?? item.shortSummary}</p>
            </div>
          </div>
        ) : null}

        {/* ── Overview strip ── */}
        {overview.length || locations.length ? (
          <section aria-labelledby="ov" className="border-y border-line bg-white">
            <div className="container-site flex flex-col gap-5 py-10">
              <h2 id="ov" className="text-block-title text-heading">{name} business overview</h2>
              <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                {overview.map(([I, k, v, sub, level]) => (
                  <div key={k} className="flex flex-col gap-1.5 rounded-2xl border border-line bg-page/60 p-4">
                    <span className="mb-1 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-tint text-brand"><I aria-hidden className="h-[18px] w-[18px]" /></span>
                    <dt className="text-xs text-ink-muted">{k}</dt>
                    <dd className="font-display text-[15px] font-bold leading-snug text-heading">{v}</dd>
                    {level && LEVEL_DOTS[level] ? <Dots n={LEVEL_DOTS[level]} /> : null}
                    {sub ? <dd className="text-xs text-ink-muted">{sub}</dd> : null}
                  </div>
                ))}
                {locations.length ? (
                  <div className="col-span-2 flex flex-col gap-1.5 rounded-2xl border border-line bg-page/60 p-4 md:col-span-1">
                    <span className="mb-1 flex h-9 w-9 items-center justify-center rounded-xl bg-accent-tint text-accent-dark"><MapPin aria-hidden className="h-[18px] w-[18px]" /></span>
                    <dt className="text-xs text-ink-muted">Best locations</dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {locations.map((l) => <span key={l} className="rounded-full border border-accent/30 bg-accent-tint px-2.5 py-0.5 text-xs font-semibold text-accent-dark">{l}</span>)}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </section>
        ) : null}

        <div className="container-site flex flex-col gap-12 py-12">
          {/* ── The guide in four parts ── */}
          <section aria-labelledby="guide" className="flex flex-col gap-5">
            <h2 id="guide" className="text-block-title text-heading">Complete guide to starting a {name.toLowerCase()} business</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {([
                [reqPath, ClipboardList, "Requirements checklist", `${requirementCount} things you need: equipment, documents, licences and more, by category.`, false],
                ["#profile", Table2, "Business profile", "Size, capital, location, target market, skills and time to set up, at a glance.", true],
                [`${reqPath}#calculator`, Calculator, "Start-up cost calculator", scenarios.length ? `Pick a business size and add what you need to work out your own start-up cost.` : "Being prepared.", false],
                ["#steps", BookOpen, "How to start", idea.steps.length ? `${idea.steps.length} steps in order, from registration to your first customers.` : "Being prepared.", true],
              ] as [string, typeof ClipboardList, string, string, boolean][]).map(([href, I, title, text, orange]) => (
                <Link key={href} href={href} className={`group flex items-start gap-4 rounded-2xl border-2 bg-white p-5 text-ink transition hover:-translate-y-0.5 hover:text-ink hover:shadow-[0_14px_30px_-16px_rgba(7,26,51,0.3)] ${orange ? "border-accent/40" : "border-brand/40"}`}>
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${orange ? "bg-accent-tint text-accent-dark" : "bg-brand-tint text-brand"}`}><I aria-hidden className="h-5 w-5" /></span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className={`font-display text-base font-bold ${orange ? "text-accent-dark" : "text-brand"}`}>{title}</span>
                    <span className="text-[13px] leading-relaxed text-ink-muted">{text}</span>
                  </span>
                  <span aria-hidden className="text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-brand">→</span>
                </Link>
              ))}
            </div>
          </section>

          {/* ── Requirements: the most common first, the full checklist on its own page; categories beside ── */}
          <section id="requirements" aria-labelledby="req" className="flex scroll-mt-24 flex-col gap-5">
            <h2 id="req" className="text-block-title text-heading">{name} business requirements</h2>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
              <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_3px_rgba(7,26,51,0.06)]">
                <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
                  <h3 className="font-display text-[15px] font-bold text-heading">Popular requirements</h3>
                  <Link href={reqPath} className="text-[13px] font-semibold">View all {requirementCount} →</Link>
                </div>
                {checklist.length ? <ul className="divide-y divide-line">{checklist.slice(0, 5).map((r) => <Requirement key={r.id} {...r} />)}</ul>
                  : <p className="px-5 py-4 text-sm text-ink-muted">The requirements for this idea are being prepared.</p>}
                {requirementCount > 0 ? (
                  <div className="border-t border-line p-4">
                    <Link href={reqPath} className="flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-dark hover:text-white">View full requirements checklist →</Link>
                  </div>
                ) : null}
              </div>
              {categories.length ? (
                <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_3px_rgba(7,26,51,0.06)]">
                  <h3 className="border-b border-line px-5 py-4 font-display text-[15px] font-bold text-heading">Requirement categories</h3>
                  <ul className="divide-y divide-line">
                    {categories.map(([c, n]) => (
                      <li key={c} className="flex flex-col gap-2 px-5 py-3.5">
                        <span className="flex items-baseline justify-between gap-3"><span className="text-sm font-semibold text-heading">{c}</span><span className="text-xs text-ink-muted">{n} {n === 1 ? "item" : "items"}</span></span>
                        <span className="h-1.5 overflow-hidden rounded-full bg-page"><span className="block h-full rounded-full bg-brand" style={{ width: `${(n / biggest) * 100}%` }} /></span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </section>

          {/* ── The client's template as a table ── */}
          <section id="profile" aria-labelledby="prof" className="flex scroll-mt-24 flex-col gap-5">
            <h2 id="prof" className="text-block-title text-heading">{name} business profile</h2>
            <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_3px_rgba(7,26,51,0.06)]">
              <table className="w-full text-left text-sm">
                <thead className="hidden bg-[#071A33] text-xs uppercase tracking-wider text-white/80 sm:table-header-group">
                  <tr><th className="w-12 px-4 py-3 font-semibold">S/N</th><th className="w-48 px-4 py-3 font-semibold">Name</th><th className="px-4 py-3 font-semibold">Details</th><th className="w-[28%] px-4 py-3 font-semibold">Notes</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {profile.map(([k, v, note], n) => (
                    <tr key={k} className="flex flex-col gap-1 px-4 py-3 even:bg-page/50 sm:table-row sm:p-0">
                      <td className="hidden px-4 py-3 align-top text-ink-muted sm:table-cell">{n + 1}</td>
                      <th scope="row" className="align-top text-xs font-semibold uppercase tracking-wide text-ink-muted sm:px-4 sm:py-3 sm:text-sm sm:normal-case sm:tracking-normal sm:text-heading">{k}</th>
                      <td className="whitespace-pre-line align-top leading-relaxed text-ink sm:px-4 sm:py-3">{v}</td>
                      <td className="align-top text-[13px] leading-relaxed text-ink-muted sm:px-4 sm:py-3">{note ? <><span className="font-semibold sm:hidden">Note: </span>{note}</> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Start-up budget: the template's sub-table (Sn, Item, Qty, Price, Amount) for one size; the calculator is on the requirements page ── */}
          <section id="budget" aria-labelledby="bud" className="flex scroll-mt-24 flex-col gap-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="bud" className="text-block-title text-heading">Start-up budget</h2>
              {scenarios.length > 1 ? (
                <nav aria-label="Business size" className="inline-flex gap-1 rounded-full border border-line bg-white p-1">
                  {scenarios.map((s) => (
                    <Link key={s.id} href={`?scenario=${s.level}#budget`} scroll={false} aria-current={s.level === scenario!.level ? "true" : undefined}
                      className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${s.level === scenario!.level ? "bg-brand text-white hover:text-white" : "text-ink-soft hover:text-brand"}`}>{PLAN_LABEL[s.level]}</Link>
                  ))}
                </nav>
              ) : null}
            </div>
            {scenario ? (
              <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_3px_rgba(7,26,51,0.06)]">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-4">
                  <span className="font-display text-[15px] font-bold text-heading">{PLAN_LABEL[scenario.level]} {name.toLowerCase()} business{scenario.operatingScale ? <span className="font-sans text-sm font-normal text-ink-muted"> · {scenario.operatingScale}</span> : null}</span>
                  <span className="text-xs text-ink-muted">{scenario.location?.name ?? "Uganda"} · {scenario.estimateDate ? `prices as of ${date(scenario.estimateDate)}` : "estimate date pending"}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="bg-page text-xs uppercase tracking-wider text-ink-muted">
                      <tr><th className="w-12 px-4 py-3 font-semibold">Sn</th><th className="px-4 py-3 font-semibold">Item</th><th className="px-4 py-3 text-right font-semibold">Qty</th><th className="px-4 py-3 text-right font-semibold">Price</th><th className="px-4 py-3 text-right font-semibold">Amount</th></tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {lines.map((l, n) => (
                        <tr key={l.id}>
                          <td className="px-4 py-3 align-top text-ink-muted">{n + 1}</td>
                          <td className="px-4 py-3 align-top">{l.description}<span className="block text-xs text-ink-muted">{l.costCategory || "Other"}{l.isOptional ? " · optional" : ""}</span></td>
                          <td className="whitespace-nowrap px-4 py-3 text-right align-top">{Number(l.quantity).toLocaleString("en-UG")}{l.unit ? ` ${l.unit}` : ""}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-right align-top">{l.unitCost === null ? <span className="text-ink-muted">—</span> : money(l.unitCost, scenario.currency)}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-right align-top font-semibold">{l.unitCost === null ? <span className="font-normal text-ink-muted">{l.unknownReason ?? "To be confirmed"}</span> : money(Number(l.unitCost) * Number(l.quantity), scenario.currency)}</td>
                        </tr>
                      ))}
                      {hiddenLines > 0 ? (
                        <tr><td colSpan={5} className="bg-page/60 px-4 py-3">
                          <span className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-ink-muted">{hiddenLines} more {hiddenLines === 1 ? "item" : "items"} and the total</span>{unlock("Unlock the full budget", "text-sm")}</span>
                        </td></tr>
                      ) : null}
                    </tbody>
                    {!gated ? (
                      <tfoot>
                        <tr className="border-t-2 border-heading">
                          <td colSpan={4} className="px-4 py-3 font-bold">Total</td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-base font-bold">{(() => { const t = budgetTotal(scenario.lines); return t === null ? "Some costs pending" : money(t, scenario.currency); })()}</td>
                        </tr>
                      </tfoot>
                    ) : null}
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-brand-tint/40 px-5 py-4">
                  <span className="text-sm text-ink-soft">{scenario.assumptions ? <><strong className="font-semibold">Assumptions:</strong> {scenario.assumptions}</> : "Choose only what you need in the cost calculator."}</span>
                  <Link href={`${reqPath}#calculator`} className="inline-flex items-center gap-1.5 text-sm font-semibold"><Calculator aria-hidden className="h-4 w-4" />Open the cost calculator →</Link>
                </div>
              </div>
            ) : <p className="rounded-2xl border border-line bg-white px-5 py-4 text-ink-muted">The budget for this idea is being prepared.</p>}
          </section>

          {idea.steps.length ? (
            <section id="steps" aria-labelledby="st" className="flex scroll-mt-24 flex-col gap-5">
              <h2 id="st" className="text-block-title text-heading">How to start</h2>
              <ol className="flex flex-col rounded-2xl border border-line bg-white p-6 shadow-[0_1px_3px_rgba(7,26,51,0.06)] sm:p-8">
                {steps.map((s, n) => (
                  <li key={s.id} className="flex gap-4">
                    <span className="flex flex-col items-center">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{s.stepNumber}</span>
                      {n < steps.length - 1 || hiddenSteps > 0 ? <span aria-hidden className="w-0.5 flex-1 bg-line" /> : null}
                    </span>
                    <span className="flex flex-col gap-1 pb-6">
                      <strong className="pt-1 font-bold">{s.title}</strong>
                      {s.description ? <span className="leading-relaxed text-ink-soft">{s.description}</span> : null}
                    </span>
                  </li>
                ))}
                {hiddenSteps > 0 ? (
                  <li className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-line-strong text-ink-muted"><LockKeyhole aria-hidden className="h-3.5 w-3.5" /></span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
                      <span className="text-ink-muted">{hiddenSteps} more {hiddenSteps === 1 ? "step" : "steps"}</span>
                      {unlock("Unlock all steps", "text-sm")}
                    </span>
                  </li>
                ) : null}
              </ol>
            </section>
          ) : null}

          <ChildSections sections={media} gated={gated} back={path} />
          <FieldSections type="BUSINESS_IDEA" record={idea as unknown as Record<string, unknown>} gated={gated} back={path} />

          {/* ── Questions answered from this plan, with linked machines, suppliers and funding beside ── */}
          <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            {faq.length ? (
              <section id="faq" aria-labelledby="fq" className="flex scroll-mt-24 flex-col gap-5">
                <h2 id="fq" className="text-block-title text-heading">Frequently asked questions: {name.toLowerCase()} business</h2>
                <div className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_3px_rgba(7,26,51,0.06)]">
                  {faq.map(([q, a], n) => (
                    <details key={q} open={n === 0} className="group px-5 [&_summary::-webkit-details-marker]:hidden">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-[15px] font-semibold text-heading">
                        {q}<ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-ink-muted transition group-open:rotate-180" />
                      </summary>
                      <div className="pb-4 text-sm leading-relaxed text-ink-soft">{a}</div>
                    </details>
                  ))}
                </div>
              </section>
            ) : <span className="hidden lg:block" />}
            <aside className="flex flex-col gap-5 lg:sticky lg:top-24">
              <Connected contentItemId={item.id} />
            </aside>
          </div>

          <Evidence contentItemId={item.id} lastReviewedAt={item.lastReviewedAt} nextReviewDueAt={item.nextReviewDueAt} viewer={viewer} back={path} />

          {/* ── Call to action ── */}
          <section className="flex flex-col items-center gap-4 rounded-3xl bg-gradient-to-br from-brand-deep via-brand to-[#0A8FE8] px-6 py-10 text-center text-white sm:px-10">
            <h2 className="text-section-title max-w-2xl">Ready to start your {name.toLowerCase()} business?</h2>
            <p className="max-w-xl text-[15px] text-white/85">
              {viewer.isMember
                ? "Work through the requirements checklist and the start-up budget, and get everything in order before you launch."
                : `Unlock every requirement, the full start-up budget with totals, and all the steps${plan.monthly ? `, from ${plan.monthly} a month` : ""}. Pay with MoMo, Airtel Money or card.`}
            </p>
            {viewer.isMember ? (
              <Link href={reqPath} className="inline-flex h-12 items-center gap-2 rounded-lg bg-white px-6 text-sm font-bold text-brand-deep hover:bg-accent hover:text-ink">View all {requirementCount} requirements →</Link>
            ) : (
              <Link href={path} data-onboard="" className="inline-flex h-12 items-center gap-2 rounded-lg bg-white px-6 text-sm font-bold text-brand-deep hover:bg-accent hover:text-ink"><LockKeyhole aria-hidden className="h-4 w-4" />Unlock the full plan <Icon name="arrow" className="h-4 w-4" /></Link>
            )}
          </section>

          {/* ── More ideas: the same category, or others when it has none ── */}
          {more.length ? (
            <section aria-labelledby="more" className="flex flex-col gap-5">
              <div className="flex items-end justify-between gap-3">
                <span className="flex flex-col gap-1">
                  <h2 id="more" className="text-block-title text-heading">{inCategory ? `More ${item.primaryCategory!.name.toLowerCase()} businesses` : "More business ideas"}</h2>
                  <span className="text-sm text-ink-muted">Other businesses you might want to explore</span>
                </span>
                <Link href={inCategory ? `/business-ideas?category=${item.primaryCategory!.id}` : "/business-ideas"} className="shrink-0 text-sm font-semibold">View all →</Link>
              </div>
              <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                {more.map((m) => <li key={m.id}><IdeaCard idea={m} /></li>)}
              </ul>
            </section>
          ) : null}
        </div>
      </article>
    </OnboardingGate>
  );
}

/** A level as three dots, the first `n` filled. */
function Dots({ n }: { n: number }) {
  return (
    <span aria-hidden className="flex gap-1">
      {[1, 2, 3].map((i) => <span key={i} className={`h-2 w-2 rounded-full ${i <= n ? "bg-accent" : "bg-line"}`} />)}
    </span>
  );
}

function Requirement({ name, group, isKey }: { name: string; group: string; isKey: boolean }) {
  return (
    <li className="flex items-center gap-3 px-5 py-3.5">
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${isKey ? "bg-brand text-white" : "bg-brand-tint text-brand"}`}><Check aria-hidden className="h-3.5 w-3.5" strokeWidth={3} /></span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-semibold text-heading">{name}</span>
        <span className="text-xs text-ink-muted">{group}</span>
      </span>
      {isKey ? <span className="hidden rounded-full bg-accent-tint px-2.5 py-0.5 text-[11px] font-semibold text-accent-dark sm:inline">Key</span> : null}
    </li>
  );
}
