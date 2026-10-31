import { $Enums, type ContentType, type Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import { searchTerms, termWhere } from "./search-terms";

/**
 * Advanced search for each directory, following the client's field list.
 *
 * Every directory has its own filters: a few always shown, the rest in its Advanced search
 * panel together with the shared keyword tools (exact phrase, words to leave out), freshness
 * and sort order. Choices are drawn from what is actually published.
 *
 * Open to everyone, so only public fields are filterable: contacts, machine prices, funding
 * amounts and loan terms stay member detail, and filtering by them would reveal them.
 */
export type Tab = ContentType | "ALL" | "PRICES";
export type Option = { value: string; label: string };
/** `advanced` filters sit in the Advanced search panel; the rest are always shown. */
export type Filter = { name: string; label: string; options?: Option[]; placeholder?: string; advanced?: boolean };

export const TABS: { id: Tab; label: string }[] = [
  { id: "ALL", label: "Everything" },
  { id: "BUSINESS_IDEA", label: "Business ideas" },
  { id: "MACHINE", label: "Machines" },
  { id: "SUPPLIER", label: "Suppliers" },
  { id: "FUNDING_PROGRAMME", label: "Loans and funding" },
  { id: "GUIDE", label: "How-to guides" },
  { id: "CONSULTANT", label: "Business experts" },
  { id: "TOOL", label: "Tools" },
  { id: "PRICES", label: "Market prices" },
  { id: "WEBSITE", label: "Websites" },
  { id: "NEWS", label: "News" },
];

export const ALL_TYPES: ContentType[] = ["BUSINESS_IDEA", "MACHINE", "SUPPLIER", "FUNDING_PROGRAMME", "GUIDE", "CONSULTANT", "TOOL", "WEBSITE", "NEWS"];

export const parseTab = (v: string | undefined): Tab => TABS.find((t) => t.id === v)?.id ?? "ALL";

const live = { publicationStatus: "PUBLISHED" as const };
const label = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
const opts = (values: (string | null | undefined)[]): Option[] =>
  [...new Set(values.filter((v): v is string => Boolean(v && v.trim())).map((v) => v.trim()))].sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v, label: v }));
const enumOpts = (values: string[]): Option[] => values.map((v) => ({ value: v, label: label(v) }));
const YES: Option[] = [{ value: "1", label: "Yes" }];
const yes = (name: string, text: string): Filter => ({ name, label: text, options: YES, advanced: true });

/** Shared advanced fields, the same in every directory. */
export const UPDATED: Option[] = [{ value: "30", label: "Last 30 days" }, { value: "90", label: "Last 90 days" }, { value: "365", label: "Last 12 months" }];
export const SORTS: Option[] = [{ value: "newest", label: "Newest" }, { value: "reviewed", label: "Recently reviewed" }, { value: "az", label: "A to Z" }];
const STAGES = enumOpts(Object.values($Enums.BusinessStage));

async function categories(type: ContentType): Promise<Option[]> {
  const rows = await prisma.category.findMany({ where: { primaryFor: { some: { contentType: type, ...live } } }, orderBy: { name: "asc" } });
  return rows.map((c) => ({ value: c.id, label: c.name }));
}

/** The filters for a directory, with choices drawn from what is actually published. */
export async function filtersFor(tab: Tab): Promise<Filter[]> {
  const pub = { contentItem: live };
  const category = async (): Promise<Filter> => ({ name: "category", label: "Category", options: await categories(tab as ContentType) });
  switch (tab) {
    case "BUSINESS_IDEA": {
      const rows = await prisma.businessIdea.findMany({ where: pub, select: { businessType: true } });
      return [
        await category(),
        { name: "businessType", label: "Business type", options: opts(rows.map((r) => r.businessType)) },
        { name: "experience", label: "Experience needed", options: enumOpts(Object.values($Enums.ExperienceLevel)), advanced: true },
        { name: "stage", label: "Business stage", options: STAGES, advanced: true },
        { name: "plan", label: "Has a budget plan", options: [{ value: "LOW", label: "Low budget" }, { value: "STANDARD", label: "Standard" }, { value: "HIGHER", label: "Higher budget" }], advanced: true },
        yes("homeBased", "Can be home-based"),
      ];
    }
    case "MACHINE": {
      const rows = await prisma.machine.findMany({ where: pub, select: { machineType: true, powerSource: true, automationLevel: true, manufacturer: true } });
      return [
        await category(),
        { name: "machineType", label: "Machine type", options: opts(rows.map((r) => r.machineType)) },
        { name: "condition", label: "Condition", options: enumOpts(Object.values($Enums.MachineCondition)), advanced: true },
        { name: "power", label: "Power source", options: opts(rows.map((r) => r.powerSource)), advanced: true },
        { name: "automation", label: "Automation", options: opts(rows.map((r) => r.automationLevel)), advanced: true },
        { name: "maker", label: "Manufacturer", options: opts(rows.map((r) => r.manufacturer)), advanced: true },
        yes("install", "Installation support"),
        yes("training", "Training support"),
        yes("spares", "Spare parts in Uganda"),
      ];
    }
    case "SUPPLIER": {
      const rows = await prisma.supplier.findMany({ where: pub, select: { supplierType: true, country: true, items: true, brandsSupplied: true } });
      return [
        await category(),
        { name: "supplierType", label: "Supplier type", options: enumOpts([...new Set(rows.map((r) => r.supplierType).filter((v): v is NonNullable<typeof v> => Boolean(v)))]) },
        { name: "item", label: "Item", options: opts(rows.flatMap((r) => r.items)) },
        { name: "country", label: "Country", options: opts(rows.map((r) => r.country)) },
        { name: "brand", label: "Brand", options: opts(rows.flatMap((r) => r.brandsSupplied)), advanced: true },
        yes("wholesale", "Sells wholesale"),
        yes("retail", "Sells retail"),
        yes("install", "Installs"),
        yes("maintenance", "Maintains"),
        yes("training", "Trains staff"),
        yes("spares", "Spare parts in Uganda"),
        yes("export", "Can export"),
        yes("checked", "Contact checked"),
      ];
    }
    case "FUNDING_PROGRAMME": {
      const rows = await prisma.fundingProgramme.findMany({ where: pub, select: { providerCategory: true, eligibleBusinessTypes: true, provider: { select: { providerCategory: true, organization: { select: { legalName: true, tradingName: true } } } } } });
      return [
        { name: "fundingType", label: "Fund type", options: enumOpts(Object.values($Enums.FundingType)) },
        { name: "provider", label: "Fund provider", options: opts(rows.map((r) => r.provider.organization.tradingName ?? r.provider.organization.legalName)) },
        { name: "providerCategory", label: "Provider category", options: opts(rows.map((r) => r.providerCategory ?? r.provider.providerCategory)) },
        { name: "bizType", label: "Eligible business type", options: opts(rows.flatMap((r) => r.eligibleBusinessTypes)) },
        { name: "stage", label: "Business stage", options: STAGES, advanced: true },
        yes("open", "Open for applications"),
        yes("noRegistration", "No registration needed"),
      ];
    }
    case "GUIDE": {
      const rows = await prisma.guide.findMany({ where: pub, select: { resourceType: true, jurisdiction: true, responsibleAuthority: true, language: true } });
      return [
        await category(),
        { name: "docType", label: "Type", options: opts(rows.map((r) => r.resourceType)) },
        { name: "authority", label: "Authority", options: opts(rows.map((r) => r.responsibleAuthority)), advanced: true },
        { name: "jurisdiction", label: "Jurisdiction", options: opts(rows.map((r) => r.jurisdiction)), advanced: true },
        { name: "language", label: "Language", options: opts(rows.map((r) => r.language)), advanced: true },
        yes("current", "Current versions only"),
      ];
    }
    case "CONSULTANT": {
      const rows = await prisma.consultant.findMany({ where: pub, select: { specialties: true, country: true, district: true, languages: true, deliveryModes: true } });
      return [
        await category(),
        { name: "specialty", label: "Specialty", options: opts(rows.flatMap((r) => r.specialties)) },
        { name: "district", label: "District", options: opts(rows.map((r) => r.district)) },
        { name: "country", label: "Country", options: opts(rows.map((r) => r.country)), advanced: true },
        { name: "language", label: "Language", options: opts(rows.flatMap((r) => r.languages)), advanced: true },
        { name: "mode", label: "Works", options: opts(rows.flatMap((r) => r.deliveryModes)), advanced: true },
        yes("checked", "Checked by BizSphere-Ug"),
      ];
    }
    case "TOOL": {
      const rows = await prisma.tool.findMany({ where: pub, select: { fileFormat: true, jurisdiction: true, publisher: true } });
      return [
        await category(),
        { name: "toolType", label: "Tool type", options: enumOpts(Object.values($Enums.ToolType)) },
        { name: "format", label: "File format", options: opts(rows.map((r) => r.fileFormat)), advanced: true },
        { name: "jurisdiction", label: "Jurisdiction", options: opts(rows.map((r) => r.jurisdiction)), advanced: true },
        { name: "publisher", label: "Publisher", options: opts(rows.map((r) => r.publisher)), advanced: true },
        yes("editable", "Editable"),
      ];
    }
    case "WEBSITE": {
      const rows = await prisma.usefulWebsite.findMany({ where: pub, select: { siteType: true, languages: true, countries: true } });
      return [
        await category(),
        { name: "siteType", label: "Type", options: opts(rows.map((r) => r.siteType)) },
        { name: "cost", label: "Cost", options: enumOpts(Object.values($Enums.AccessCost)), advanced: true },
        { name: "language", label: "Language", options: opts(rows.flatMap((r) => r.languages)), advanced: true },
        { name: "country", label: "Country served", options: opts(rows.flatMap((r) => r.countries)), advanced: true },
        yes("official", "Official sites only"),
        yes("noAccount", "No account needed"),
      ];
    }
    case "NEWS": {
      const rows = await prisma.newsArticle.findMany({ where: pub, select: { publisher: true } });
      return [
        await category(),
        { name: "articleType", label: "Type", options: enumOpts(Object.values($Enums.ArticleType)) },
        { name: "publisher", label: "Publisher", options: opts(rows.map((r) => r.publisher)), advanced: true },
      ];
    }
    case "INVESTMENT_OPPORTUNITY": {
      const rows = await prisma.investmentOpportunity.findMany({ where: pub, select: { sector: true, opportunityType: true, businessStage: true } });
      return [
        { name: "sector", label: "Sector", options: opts(rows.map((r) => r.sector)) },
        { name: "oppType", label: "Type", options: opts(rows.map((r) => r.opportunityType)) },
        { name: "oppStage", label: "Business stage", options: opts(rows.map((r) => r.businessStage)), advanced: true },
        yes("open", "Still open"),
      ];
    }
    case "RECIPE": {
      const rows = await prisma.recipe.findMany({ where: pub, select: { cuisine: true, skillLevel: true, dietaryLabels: true } });
      return [
        await category(),
        { name: "skill", label: "Skill level", options: opts(rows.map((r) => r.skillLevel)) },
        { name: "cuisine", label: "Cuisine", options: opts(rows.map((r) => r.cuisine)), advanced: true },
        { name: "diet", label: "Dietary label", options: opts(rows.flatMap((r) => r.dietaryLabels)), advanced: true },
      ];
    }
    case "PRICES": {
      const [products, markets] = await Promise.all([
        prisma.product.findMany({ where: { observations: { some: { status: "PUBLISHED" } } }, orderBy: { name: "asc" } }),
        prisma.market.findMany({ where: { observations: { some: { status: "PUBLISHED" } } }, include: { location: { include: { parent: true } } }, orderBy: { name: "asc" } }),
      ]);
      return [
        { name: "product", label: "Product", options: products.map((p) => ({ value: p.id, label: [p.name, p.variety].filter(Boolean).join(", ") })) },
        { name: "market", label: "Market", options: markets.map((m) => ({ value: m.id, label: m.name })) },
        { name: "district", label: "District", options: opts(markets.map((m) => (m.location?.type === "DISTRICT" ? m.location.name : null))) },
        { name: "country", label: "Country", options: opts(markets.map((m) => (m.location?.type === "DISTRICT" ? m.location.parent?.name : m.location?.name))) },
      ];
    }
    default:
      return [];
  }
}

type Params = Record<string, string>;

/** A value from the URL that must be one of an enum's values, or undefined (a bad link can't break the query). */
function pick<T extends string>(e: Record<string, T>, v: string | undefined): T | undefined {
  return v && (Object.values(e) as string[]).includes(v) ? (v as T) : undefined;
}

/** Prisma filter for one directory's own fields. Only filters with a value are applied. */
function recordWhere(tab: Tab, f: Params): Prisma.ContentItemWhereInput {
  const on = (k: string) => f[k] === "1";
  // Each part is a condition, or a falsy value ("" from an unset filter, false, undefined) that adds nothing.
  const all = (...parts: (Prisma.ContentItemWhereInput | false | "" | undefined)[]): Prisma.ContentItemWhereInput => ({ AND: parts.filter((p): p is Prisma.ContentItemWhereInput => Boolean(p)) });
  const stage = pick($Enums.BusinessStage, f.stage);
  const checked = on("checked") && { checks: { some: { checkType: "BUSINESS_CONTACT" as const, result: "PASSED" as const } } };
  const offer = (where: Prisma.SupplierOfferWhereInput) => ({ machine: { offers: { some: { status: "PUBLISHED" as const, ...where } } } });

  switch (tab) {
    case "BUSINESS_IDEA": {
      const exp = pick($Enums.ExperienceLevel, f.experience);
      const plan = pick($Enums.ScenarioLevel, f.plan);
      return all(
        f.businessType && { businessIdea: { businessType: f.businessType } },
        exp && { businessIdea: { experienceLevel: exp } },
        plan && { businessIdea: { scenarios: { some: { level: plan } } } },
        on("homeBased") && { businessIdea: { homeBasedSuitable: true } },
        stage && { businessStages: { has: stage } },
      );
    }
    case "MACHINE": {
      const cond = pick($Enums.MachineCondition, f.condition);
      return all(
        f.machineType && { machine: { machineType: f.machineType } },
        f.power && { machine: { powerSource: f.power } },
        f.automation && { machine: { automationLevel: f.automation } },
        f.maker && { machine: { manufacturer: f.maker } },
        cond && offer({ condition: cond }),
        on("install") && offer({ installationSupport: true }),
        on("training") && offer({ trainingSupport: true }),
        on("spares") && offer({ sparePartsLocal: true }),
      );
    }
    case "SUPPLIER": {
      const type = pick($Enums.SupplierType, f.supplierType);
      return all(
        type && { supplier: { supplierType: type } },
        f.country && { supplier: { country: f.country } },
        f.item && { supplier: { items: { has: f.item } } },
        f.brand && { supplier: { brandsSupplied: { has: f.brand } } },
        on("wholesale") && { supplier: { sellsWholesale: true } },
        on("retail") && { supplier: { sellsRetail: true } },
        on("install") && { supplier: { offersInstallation: true } },
        on("maintenance") && { supplier: { offersMaintenance: true } },
        on("training") && { supplier: { offersTraining: true } },
        on("spares") && { supplier: { sparePartsLocal: true } },
        on("export") && { supplier: { exportCapability: true } },
        checked,
      );
    }
    case "FUNDING_PROGRAMME": {
      const type = pick($Enums.FundingType, f.fundingType);
      return all(
        type && { fundingProgramme: { fundingType: type } },
        f.bizType && { fundingProgramme: { eligibleBusinessTypes: { has: f.bizType } } },
        f.provider && { fundingProgramme: { provider: { organization: { OR: [{ tradingName: f.provider }, { legalName: f.provider }] } } } },
        f.providerCategory && { fundingProgramme: { OR: [{ providerCategory: f.providerCategory }, { providerCategory: null, provider: { providerCategory: f.providerCategory } }] } },
        on("open") && { fundingProgramme: { rounds: { some: { status: "OPEN" } } } },
        on("noRegistration") && { fundingProgramme: { requiresRegistration: false } },
        stage && { businessStages: { has: stage } },
      );
    }
    case "GUIDE":
      return all(
        f.docType && { guide: { resourceType: f.docType } },
        f.authority && { guide: { responsibleAuthority: f.authority } },
        f.jurisdiction && { guide: { jurisdiction: f.jurisdiction } },
        f.language && { guide: { language: f.language } },
        on("current") && { guide: { superseded: false } },
      );
    case "CONSULTANT":
      return all(
        f.specialty && { consultant: { specialties: { has: f.specialty } } },
        f.country && { consultant: { country: f.country } },
        f.district && { consultant: { district: f.district } },
        f.language && { consultant: { languages: { has: f.language } } },
        f.mode && { consultant: { deliveryModes: { has: f.mode } } },
        on("checked") && { checks: { some: { result: "PASSED" } } },
      );
    case "TOOL": {
      const type = pick($Enums.ToolType, f.toolType);
      return all(
        type && { tool: { toolType: type } },
        f.format && { tool: { fileFormat: f.format } },
        f.jurisdiction && { tool: { jurisdiction: f.jurisdiction } },
        f.publisher && { tool: { publisher: f.publisher } },
        on("editable") && { tool: { editable: true } },
      );
    }
    case "WEBSITE": {
      const cost = pick($Enums.AccessCost, f.cost);
      return all(
        f.siteType && { website: { siteType: f.siteType } },
        cost && { website: { accessCost: cost } },
        f.language && { website: { languages: { has: f.language } } },
        f.country && { website: { countries: { has: f.country } } },
        on("official") && { website: { officialSite: true } },
        on("noAccount") && { website: { accountRequired: false } },
      );
    }
    case "NEWS": {
      const type = pick($Enums.ArticleType, f.articleType);
      return all(type && { news: { articleType: type } }, f.publisher && { news: { publisher: f.publisher } });
    }
    case "INVESTMENT_OPPORTUNITY":
      return all(
        f.sector && { investmentOpportunity: { sector: f.sector } },
        f.oppType && { investmentOpportunity: { opportunityType: f.oppType } },
        f.oppStage && { investmentOpportunity: { businessStage: f.oppStage } },
        on("open") && { investmentOpportunity: { OR: [{ deadline: null }, { deadline: { gte: new Date() } }] } },
      );
    case "RECIPE":
      return all(
        f.skill && { recipe: { skillLevel: f.skill } },
        f.cuisine && { recipe: { cuisine: f.cuisine } },
        f.diet && { recipe: { dietaryLabels: { has: f.diet } } },
      );
    default:
      return {};
  }
}

/** The shared advanced fields: exact phrase, words to leave out, freshness and order. */
export type Advanced = { phrase: string; none: string; updated: string; sort: string };

/** Listings for a directory (or every directory). Every word must match; see search-terms.ts. */
export async function searchListings(tab: Tab, q: string, f: Params, adv: Advanced = { phrase: "", none: "", updated: "", sort: "" }) {
  const types = tab === "ALL" ? ALL_TYPES : [tab as ContentType];
  const since = UPDATED.some((u) => u.value === adv.updated) ? new Date(Date.now() - Number(adv.updated) * 86_400_000) : null;
  const phrase = adv.phrase.trim();
  const orderBy: Prisma.ContentItemOrderByWithRelationInput[] =
    adv.sort === "az" ? [{ title: "asc" }]
      : adv.sort === "reviewed" ? [{ lastReviewedAt: { sort: "desc", nulls: "last" } }]
      : [{ publishedAt: { sort: "desc", nulls: "last" } }];
  // "Leave out": find the pages that DO mention those words, then exclude them by id. (A plain
  // NOT on the text match drops every page with an empty field: SQL treats "empty contains x" as
  // unknown, and NOT unknown is still unknown.)
  const leaveOut = searchTerms(adv.none);
  const excluded = leaveOut.length
    ? (await prisma.contentItem.findMany({ where: { contentType: { in: types }, OR: leaveOut.map(termWhere) }, select: { id: true } })).map((r) => r.id)
    : [];
  return prisma.contentItem.findMany({
    where: {
      ...live,
      contentType: { in: types },
      ...(excluded.length ? { id: { notIn: excluded } } : {}),
      ...(f.category && tab !== "ALL" ? { OR: [{ primaryCategoryId: f.category }, { categories: { some: { categoryId: f.category } } }] } : {}),
      AND: [
        ...searchTerms(q).map(termWhere),
        ...(phrase ? [termWhere([phrase.toLowerCase()])] : []),
        ...(since ? [{ OR: [{ lastReviewedAt: { gte: since } }, { updatedAt: { gte: since } }] }] : []),
        recordWhere(tab, f),
      ],
    },
    include: {
      primaryCategory: true,
      businessIdea: { select: { businessType: true } },
      machine: { select: { machineType: true, function: true } },
      supplier: { select: { supplierType: true, country: true, items: true } },
      fundingProgramme: { select: { fundingType: true, providerCategory: true, provider: { select: { providerCategory: true, organization: { select: { legalName: true, tradingName: true } } } } } },
      guide: { select: { resourceType: true } },
      consultant: { select: { specialties: true, district: true, country: true } },
      tool: { select: { toolType: true } },
      website: { select: { siteType: true, mainFunction: true } },
    },
    orderBy,
    take: 60,
  });
}

/** Latest published price per market and product, filtered. */
export async function searchPrices(q: string, f: Params) {
  const rows = await prisma.priceObservation.findMany({
    where: {
      status: "PUBLISHED",
      ...(f.product ? { productId: f.product } : {}),
      ...(f.market ? { marketId: f.market } : {}),
      ...(f.district ? { market: { location: { type: "DISTRICT", name: f.district } } } : {}),
      ...(f.country ? { market: { location: { OR: [{ parent: { name: f.country } }, { type: "COUNTRY", name: f.country }] } } } : {}),
      ...(q ? { OR: [{ product: { name: { contains: q, mode: "insensitive" } } }, { market: { name: { contains: q, mode: "insensitive" } } }] } : {}),
    },
    include: { product: true, market: { include: { location: { include: { parent: true } } } } },
    orderBy: { observedAt: "desc" },
    take: 300,
  });
  const latest = new Map<string, (typeof rows)[number]>();
  for (const r of rows) if (!latest.has(`${r.marketId}:${r.productId}`)) latest.set(`${r.marketId}:${r.productId}`, r);
  return [...latest.values()].sort((a, b) => a.product.name.localeCompare(b.product.name) || a.market.name.localeCompare(b.market.name));
}

export type SearchParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => ((Array.isArray(v) ? v[0] : v) ?? "").trim();

/** filtersFor, cached between requests; admin saves clear it (tag "site-data", see src/lib/cached.ts). */
export const cachedFilters = unstable_cache((tab: Tab) => filtersFor(tab), ["directory-filters-v2"], { tags: ["site-data"], revalidate: 300 });

/** Keywords, this directory's filters, the shared advanced fields, and the values picked in the URL (unknown keys ignored). */
export async function readSearch(tab: Tab, sp: SearchParams) {
  const filters = await cachedFilters(tab);
  const q = first(sp.q);
  const values: Params = Object.fromEntries(filters.map((f) => [f.name, first(sp[f.name])]).filter(([, v]) => v));
  const adv: Advanced = {
    phrase: first(sp.phrase),
    none: first(sp.none),
    updated: UPDATED.some((u) => u.value === first(sp.updated)) ? first(sp.updated) : "",
    sort: SORTS.some((s) => s.value === first(sp.sort)) ? first(sp.sort) : "",
  };
  const advancedActive = Boolean(adv.phrase || adv.none || adv.updated || filters.some((f) => f.advanced && values[f.name]));
  return { q, filters, values, adv, advancedActive, active: Boolean(q || Object.keys(values).length || adv.phrase || adv.none || adv.updated || adv.sort) };
}
