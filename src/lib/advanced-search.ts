import type { BusinessStage, ContentType, FundingType, MachineCondition, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { asWords, searchTerms, termScore, termWhere } from "./search-terms";

/**
 * Advanced search across directories (the /search page): words, exact phrase, words to leave
 * out, directories, industry, district, business stage, budget, freshness and per-directory
 * filters, with sorting and pages.
 *
 * Budgets filter machine prices and funding amounts, which are member detail, so callers apply
 * them for members only (filtering would reveal them otherwise). "Checked contacts", "installation
 * support", machine condition, funding type and open rounds narrow only the directories they
 * concern; other results stay in the list.
 */
export type SearchParams = Record<string, string | string[] | undefined>;

export const GROUPS: { id: string; label: string; types: ContentType[] }[] = [
  { id: "ideas", label: "Business ideas", types: ["BUSINESS_IDEA"] },
  { id: "machines", label: "Machines", types: ["MACHINE"] },
  { id: "suppliers", label: "Suppliers", types: ["SUPPLIER"] },
  { id: "funding", label: "Loans and funding", types: ["FUNDING_PROGRAMME"] },
  { id: "opportunities", label: "Investment opportunities", types: ["INVESTMENT_OPPORTUNITY"] },
  { id: "guides", label: "Guides and tools", types: ["GUIDE", "TOOL", "WEBSITE"] },
  { id: "experts", label: "Business experts", types: ["CONSULTANT"] },
  { id: "news", label: "News", types: ["NEWS"] },
];
export const PRICES_GROUP = { id: "prices", label: "Market prices" };
export const CONDITIONS: [MachineCondition, string][] = [["NEW", "New"], ["USED", "Used"], ["REFURBISHED", "Refurbished"]];
export const FUNDING_TYPES: [FundingType, string][] = [["LOAN", "Loan"], ["GRANT", "Grant"], ["EQUITY", "Equity"], ["GUARANTEE", "Guarantee"], ["OTHER", "Other"]];
export const STAGES: [BusinessStage, string][] = [["IDEA", "Idea"], ["STARTING", "Starting out"], ["GROWING", "Growing"], ["ESTABLISHED", "Established"]];
export const UPDATED: [string, string][] = [["", "Any time"], ["30", "Last 30 days"], ["90", "Last 90 days"], ["365", "Last 12 months"]];
export const SORTS: [string, string][] = [["relevance", "Most relevant"], ["reviewed", "Recently reviewed"], ["newest", "Newest"], ["az", "A to Z"]];
export const PAGE_SIZE = 12;

/**
 * Tasks people come to do. Picking one shows every page that mentions any of its words, across
 * all directories: guides, tools, experts who do it, funding, news. Words are matched the same
 * forgiving way as the search box (abbreviations as whole words only).
 */
export const TOPICS: { id: string; label: string; words: string[] }[] = [
  { id: "tax-returns", label: "Tax returns", words: ["tax return", "income tax", "file returns", "filing returns", "return filing", "self-assessment", "ura", "uganda revenue authority", "tax compliance"] },
  { id: "audit", label: "Audit", words: ["audit", "auditor", "auditing", "financial statement", "statements of account", "books of account", "assurance"] },
  { id: "bookkeeping", label: "Bookkeeping and accounts", words: ["bookkeeping", "book-keeping", "keep books", "accounting", "accountant", "cash flow", "ledger"] },
  { id: "register", label: "Register a business", words: ["register a business", "business registration", "company registration", "register your business", "ursb", "incorporat", "business name"] },
  { id: "efris", label: "EFRIS and e-invoicing", words: ["efris", "e-invoic", "electronic invoic", "fiscal receipt"] },
  { id: "vat", label: "VAT", words: ["vat", "value added tax"] },
  { id: "paye", label: "PAYE and payroll", words: ["paye", "pay as you earn", "payroll"] },
  { id: "nssf", label: "NSSF", words: ["nssf", "social security"] },
  { id: "licences", label: "Licences and permits", words: ["licence", "license", "permit", "kcca", "trading licence"] },
  { id: "standards", label: "Standards and certification", words: ["unbs", "standards", "certification", "q-mark"] },
  { id: "trade", label: "Export and import", words: ["export", "import", "customs", "clearing", "shipping"] },
  { id: "finance", label: "Loans and grants", words: ["loan", "credit", "grant", "financing", "equity", "investor"] },
  { id: "plan", label: "Business plan", words: ["business plan", "feasibility", "start-up budget", "startup budget", "loan application"] },
];

const one = (v: string | string[] | undefined) => ((Array.isArray(v) ? v[0] : v) ?? "").trim();
const many = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []).map((x) => x.trim()).filter(Boolean);
const words = (s: string) => s.split(/\s+/).map((w) => w.trim()).filter(Boolean).slice(0, 10);
const num = (s: string) => { const n = Number(s.replace(/[,\s]/g, "")); return s && Number.isFinite(n) && n >= 0 ? n : null; };

export type Parsed = ReturnType<typeof parseSearch>;

/** Reads the URL. Unknown values are ignored, so a bad link can't break the query. */
export function parseSearch(sp: SearchParams) {
  // Old links: /search?in=MACHINE limited to one directory.
  const legacy = GROUPS.find((g) => g.types.includes(one(sp.in) as ContentType))?.id;
  const shown = many(sp.show).filter((s) => GROUPS.some((g) => g.id === s) || s === PRICES_GROUP.id);
  // The Directory box in the advanced panel narrows to one directory and wins over the checkboxes.
  const dir = [...GROUPS.map((g) => g.id), PRICES_GROUP.id].find((id) => id === one(sp.dir));
  const show = dir ? [dir] : shown.length ? shown : legacy ? [legacy] : GROUPS.map((g) => g.id);
  const cond = many(sp.cond).filter((c) => CONDITIONS.some(([k]) => k === c)) as MachineCondition[];
  const ftype = many(sp.ftype).filter((c) => FUNDING_TYPES.some(([k]) => k === c)) as FundingType[];
  const stage = STAGES.find(([k]) => k === one(sp.stage))?.[0] ?? null;
  const updated = UPDATED.find(([k]) => k && k === one(sp.updated))?.[0] ?? "";
  const sort = SORTS.find(([k]) => k === one(sp.sort))?.[0] ?? "relevance";
  const page = Math.max(1, Math.min(500, Number(one(sp.page)) || 1));
  return {
    q: one(sp.q), all: one(sp.all), phrase: one(sp.phrase), none: one(sp.none),
    topic: TOPICS.find((t) => t.id === one(sp.topic))?.id ?? "",
    show, cond, ftype, stage, updated, sort, page,
    category: one(sp.category), district: one(sp.district),
    budgetMin: num(one(sp.budgetMin)), budgetMax: num(one(sp.budgetMax)),
    checked: one(sp.checked) === "1", openRounds: one(sp.open) === "1", install: one(sp.install) === "1",
    advanced: one(sp.adv) === "1",
  };
}

/** True when any advanced field is set (the advanced panel then opens by itself). */
export const hasAdvanced = (p: Parsed) => Boolean(p.all || p.phrase || p.none || p.category || p.district || p.stage || p.updated || p.budgetMin !== null || p.budgetMax !== null || p.checked || p.openRounds || p.install);

const text = (w: string): Prisma.ContentItemWhereInput => ({
  OR: [{ title: { contains: w, mode: "insensitive" } }, { shortSummary: { contains: w, mode: "insensitive" } }, { overview: { contains: w, mode: "insensitive" } }],
});
// "Only for these directories" filters: other directories pass through unchanged.
const onlyFor = (types: ContentType[], where: Prisma.ContentItemWhereInput): Prisma.ContentItemWhereInput => ({ OR: [{ contentType: { notIn: types } }, where] });

export async function advancedSearch(p: Parsed, opts: { member: boolean }) {
  const types = GROUPS.filter((g) => p.show.includes(g.id)).flatMap((g) => g.types);
  if (!types.length) return { total: 0, rows: [] as Awaited<ReturnType<typeof loadRows>>, loose: false };
  const since = p.updated ? new Date(Date.now() - Number(p.updated) * 86_400_000) : null;
  const districtName = p.district ? (await prisma.location.findUnique({ where: { id: p.district }, select: { name: true } }))?.name : null;
  const budget = opts.member && (p.budgetMin !== null || p.budgetMax !== null);

  const terms = searchTerms(`${p.q} ${p.all}`);
  const topic = TOPICS.find((t) => t.id === p.topic);
  // "Without these words": exclude the pages that mention them by id. (A plain NOT on the text
  // match also dropped every page with an empty summary or overview: SQL "unknown".)
  const leaveOut = words(p.none);
  const excluded = leaveOut.length
    ? (await prisma.contentItem.findMany({ where: { contentType: { in: types }, OR: leaveOut.map(text) }, select: { id: true } })).map((r) => r.id)
    : [];
  const and: Prisma.ContentItemWhereInput[] = [
    ...(excluded.length ? [{ id: { notIn: excluded } }] : []),
    ...(topic ? [termWhere(asWords(topic.words))] : []),
    ...(p.phrase ? [text(p.phrase)] : []),
    ...(p.category ? [{ OR: [{ primaryCategoryId: p.category }, { categories: { some: { categoryId: p.category } } }] }] : []),
    ...(p.district ? [{ OR: [{ locations: { some: { locationId: p.district } } }, ...(districtName ? [{ consultant: { district: districtName } }] : [])] }] : []),
    ...(p.stage ? [{ businessStages: { has: p.stage } }] : []),
    ...(since ? [{ OR: [{ lastReviewedAt: { gte: since } }, { updatedAt: { gte: since } }] }] : []),
    ...(p.checked ? [onlyFor(["SUPPLIER", "CONSULTANT"], { checks: { some: { checkType: "BUSINESS_CONTACT", result: "PASSED" } } })] : []),
    ...(p.install ? [onlyFor(["SUPPLIER", "MACHINE"], { OR: [{ supplier: { offersInstallation: true } }, { machine: { offers: { some: { installationSupport: true, status: "PUBLISHED" } } } }] })] : []),
    ...(p.openRounds ? [onlyFor(["FUNDING_PROGRAMME"], { fundingProgramme: { rounds: { some: { status: "OPEN" } } } })] : []),
    ...(p.cond.length && p.cond.length < CONDITIONS.length ? [onlyFor(["MACHINE"], { machine: { offers: { some: { condition: { in: p.cond }, status: "PUBLISHED" } } } })] : []),
    ...(p.ftype.length && p.ftype.length < FUNDING_TYPES.length ? [onlyFor(["FUNDING_PROGRAMME"], { fundingProgramme: { fundingType: { in: p.ftype } } })] : []),
    ...(budget ? [onlyFor(["MACHINE", "FUNDING_PROGRAMME"], {
      OR: [
        { machine: { AND: [...(p.budgetMin !== null ? [{ OR: [{ priceMax: { gte: p.budgetMin } }, { priceMax: null, priceMin: { gte: p.budgetMin } }] }] : []), ...(p.budgetMax !== null ? [{ priceMin: { lte: p.budgetMax } }] : [])] } },
        { fundingProgramme: { AND: [...(p.budgetMin !== null ? [{ OR: [{ amountMax: { gte: p.budgetMin } }, { amountMax: null, amountMin: { gte: p.budgetMin } }] }] : []), ...(p.budgetMax !== null ? [{ amountMin: { lte: p.budgetMax } }] : [])] } },
      ],
    })] : []),
  ];
  const base: Prisma.ContentItemWhereInput = { publicationStatus: "PUBLISHED", contentType: { in: types }, AND: and };
  const select = { id: true, title: true, shortSummary: true, publishedAt: true, lastReviewedAt: true } as const;
  const orderBy: Prisma.ContentItemOrderByWithRelationInput = p.sort === "az" ? { title: "asc" } : p.sort === "newest" ? { publishedAt: { sort: "desc", nulls: "last" } } : { lastReviewedAt: { sort: "desc", nulls: "last" } };

  // Every word must match (each through any of its variants).
  let candidates = await prisma.contentItem.findMany({ where: { AND: [base, ...terms.map(termWhere)] }, take: 1000, select, orderBy });
  const hits = new Map<string, number>();

  // Nothing matches every word: show pages that match most of them, best first, and say so.
  const loose = candidates.length === 0 && terms.length > 1;
  if (loose) {
    const perTerm = await Promise.all(terms.map((t) => prisma.contentItem.findMany({ where: { AND: [base, termWhere(t)] }, take: 1000, select })));
    const byId = new Map<string, (typeof candidates)[number]>();
    for (const list of perTerm) for (const c of list) { byId.set(c.id, c); hits.set(c.id, (hits.get(c.id) ?? 0) + 1); }
    candidates = [...byId.values()];
  }

  // Relevance: words matched first (loose results), then title hits, then summary hits.
  let ordered = candidates;
  if (p.sort === "relevance" || loose) {
    const scored = [...searchTerms(`${p.q} ${p.all} ${p.phrase}`), ...(topic ? [asWords(topic.words)] : [])];
    const rank = (c: (typeof candidates)[number]) => (hits.get(c.id) ?? 0) * 100 + termScore(scored, c.title, c.shortSummary);
    ordered = scored.length ? [...candidates].sort((a, b) => rank(b) - rank(a)) : candidates;
  }
  const pageIds = ordered.slice((p.page - 1) * PAGE_SIZE, p.page * PAGE_SIZE).map((c) => c.id);
  const rows = await loadRows(pageIds, opts.member);
  return { total: candidates.length, rows: pageIds.map((id) => rows.find((r) => r.id === id)!).filter(Boolean), loose };
}

/** The fields a result card shows. Contacts are loaded for members only. */
function loadRows(ids: string[], member: boolean) {
  return prisma.contentItem.findMany({
    where: { id: { in: ids } },
    include: {
      primaryCategory: true,
      checks: { where: { checkType: "BUSINESS_CONTACT", result: "PASSED" }, orderBy: { checkedAt: "desc" }, take: 1 },
      businessIdea: { select: { businessType: true, pictureUrl: true, experienceLevel: true, scenarios: { select: { level: true } } } },
      machine: { select: { machineType: true, function: true, pictureUrl: true, capacityMin: true, capacityMax: true, capacityUnit: true, powerSource: true, voltage: true, phase: true, _count: { select: { offers: { where: { status: "PUBLISHED" } } } }, offers: { where: { status: "PUBLISHED" }, select: { quotedAt: true }, orderBy: { quotedAt: "desc" }, take: 1 } } },
      supplier: { select: { supplierType: true, country: true, items: true, sellsWholesale: true, sellsRetail: true, phone: member } },
      fundingProgramme: { select: { fundingType: true, eligibleBusinessTypes: true, providerCategory: true, provider: { select: { organization: { select: { legalName: true, tradingName: true } } } }, rounds: { where: { status: "OPEN" }, select: { closesAt: true, isRolling: true }, orderBy: { closesAt: "asc" }, take: 1 } } },
      investmentOpportunity: { select: { sector: true, opportunityType: true, deadline: true } },
      consultant: { select: { specialties: true, district: true, country: true, deliveryModes: true, photoUrl: true, email: member } },
      guide: { select: { resourceType: true, jurisdiction: true } },
      tool: { select: { toolType: true } },
      website: { select: { siteType: true, mainFunction: true } },
      news: { select: { articleType: true, publisher: true } },
    },
  });
}

export type ResultRow = Awaited<ReturnType<typeof loadRows>>[number];

/** Choices for the Industry and District boxes: only those with published content. */
export async function searchChoices() {
  const [categories, districts] = await Promise.all([
    prisma.category.findMany({ where: { OR: [{ primaryFor: { some: { publicationStatus: "PUBLISHED" } } }, { contentLinks: { some: {} } }] }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.location.findMany({ where: { type: "DISTRICT" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { categories, districts };
}
