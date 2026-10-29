import { $Enums, type ContentType, type FundingType, type Prisma, type SupplierType, type ToolType } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import { searchTerms, termWhere } from "./search-terms";

/**
 * Search with filters per service, following the client's field list.
 *
 * Open to everyone. Only public fields are filterable or shown in results:
 * contacts, machine prices and funding amounts stay member detail, so you can't
 * filter by them either (that would reveal them).
 */
export type Tab = ContentType | "ALL" | "PRICES";
export type Option = { value: string; label: string };
export type Filter = { name: string; label: string; options?: Option[]; placeholder?: string };

export const TABS: { id: Tab; label: string }[] = [
  { id: "ALL", label: "Everything" },
  { id: "BUSINESS_IDEA", label: "Business ideas" },
  { id: "MACHINE", label: "Machines" },
  { id: "SUPPLIER", label: "Suppliers" },
  { id: "FUNDING_PROGRAMME", label: "Funding" },
  { id: "GUIDE", label: "Guidelines" },
  { id: "CONSULTANT", label: "Experts" },
  { id: "TOOL", label: "Tools" },
  { id: "PRICES", label: "Markets and prices" },
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

async function categories(type: ContentType): Promise<Option[]> {
  const rows = await prisma.category.findMany({ where: { primaryFor: { some: { contentType: type, ...live } } }, orderBy: { name: "asc" } });
  return rows.map((c) => ({ value: c.id, label: c.name }));
}

/** The filters shown for a tab, with choices drawn from what is actually published. */
export async function filtersFor(tab: Tab): Promise<Filter[]> {
  const pub = { contentItem: live };
  switch (tab) {
    case "BUSINESS_IDEA": {
      const rows = await prisma.businessIdea.findMany({ where: pub, select: { businessType: true } });
      return [{ name: "businessType", label: "Business type", options: opts(rows.map((r) => r.businessType)) }, { name: "category", label: "Category", options: await categories(tab) }];
    }
    case "MACHINE": {
      const rows = await prisma.machine.findMany({ where: pub, select: { machineType: true } });
      return [{ name: "machineType", label: "Type", options: opts(rows.map((r) => r.machineType)) }, { name: "category", label: "Category", options: await categories(tab) }];
    }
    case "SUPPLIER": {
      const rows = await prisma.supplier.findMany({ where: pub, select: { supplierType: true, country: true, items: true } });
      return [
        { name: "supplierType", label: "Type", options: enumOpts([...new Set(rows.map((r) => r.supplierType).filter((v): v is NonNullable<typeof v> => Boolean(v)))]) },
        { name: "category", label: "Category", options: await categories(tab) },
        { name: "country", label: "Country", options: opts(rows.map((r) => r.country)) },
        { name: "item", label: "Item", options: opts(rows.flatMap((r) => r.items)) },
      ];
    }
    case "FUNDING_PROGRAMME": {
      const rows = await prisma.fundingProgramme.findMany({ where: pub, select: { fundingType: true, providerCategory: true, eligibleBusinessTypes: true, provider: { select: { providerCategory: true, organization: { select: { legalName: true, tradingName: true } } } } } });
      return [
        { name: "fundingType", label: "Fund type", options: enumOpts([...new Set(rows.map((r) => r.fundingType))]) },
        { name: "provider", label: "Fund provider", options: opts(rows.map((r) => r.provider.organization.tradingName ?? r.provider.organization.legalName)) },
        { name: "providerCategory", label: "Provider category", options: opts(rows.map((r) => r.providerCategory ?? r.provider.providerCategory)) },
        { name: "bizType", label: "Eligible business type", options: opts(rows.flatMap((r) => r.eligibleBusinessTypes)) },
      ];
    }
    case "GUIDE": {
      const rows = await prisma.guide.findMany({ where: pub, select: { resourceType: true } });
      return [{ name: "docType", label: "Doc type", options: opts(rows.map((r) => r.resourceType)) }, { name: "category", label: "Category", options: await categories(tab) }];
    }
    case "CONSULTANT": {
      const rows = await prisma.consultant.findMany({ where: pub, select: { specialties: true, country: true, district: true } });
      return [
        { name: "category", label: "Category", options: await categories(tab) },
        { name: "specialty", label: "Specialty", options: opts(rows.flatMap((r) => r.specialties)) },
        { name: "country", label: "Country", options: opts(rows.map((r) => r.country)) },
        { name: "district", label: "District", options: opts(rows.map((r) => r.district)) },
      ];
    }
    case "TOOL": {
      const rows = await prisma.tool.findMany({ where: pub, select: { toolType: true } });
      return [{ name: "category", label: "Category", options: await categories(tab) }, { name: "toolType", label: "Tool type", options: enumOpts([...new Set(rows.map((r) => r.toolType))]) }];
    }
    case "WEBSITE": {
      const rows = await prisma.usefulWebsite.findMany({ where: pub, select: { siteType: true } });
      return [{ name: "siteType", label: "Type", options: opts(rows.map((r) => r.siteType)) }, { name: "category", label: "Category", options: await categories(tab) }];
    }
    case "NEWS":
      return [{ name: "category", label: "Category", options: await categories(tab) }];
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

// Enum values from the URL are checked before use, so a bad link can't break the query.
const SUPPLIER_TYPES = Object.values($Enums.SupplierType) as string[];
const FUNDING_TYPES = Object.values($Enums.FundingType) as string[];
const TOOL_TYPES = Object.values($Enums.ToolType) as string[];

/** Prisma filter for the specialised record of a tab. */
function recordWhere(tab: Tab, f: Params): Prisma.ContentItemWhereInput {
  const has = (k: string) => Boolean(f[k]);
  switch (tab) {
    case "BUSINESS_IDEA": return has("businessType") ? { businessIdea: { businessType: f.businessType } } : {};
    case "MACHINE": return has("machineType") ? { machine: { machineType: f.machineType } } : {};
    case "SUPPLIER": return { supplier: {
      ...(SUPPLIER_TYPES.includes(f.supplierType) ? { supplierType: f.supplierType as SupplierType } : {}),
      ...(has("country") ? { country: f.country } : {}),
      ...(has("item") ? { items: { has: f.item } } : {}),
    } };
    case "FUNDING_PROGRAMME": return { fundingProgramme: {
      ...(FUNDING_TYPES.includes(f.fundingType) ? { fundingType: f.fundingType as FundingType } : {}),
      ...(has("bizType") ? { eligibleBusinessTypes: { has: f.bizType } } : {}),
      ...(has("provider") ? { provider: { organization: { OR: [{ tradingName: f.provider }, { legalName: f.provider }] } } } : {}),
      ...(has("providerCategory") ? { OR: [{ providerCategory: f.providerCategory }, { providerCategory: null, provider: { providerCategory: f.providerCategory } }] } : {}),
    } };
    case "GUIDE": return has("docType") ? { guide: { resourceType: f.docType } } : {};
    case "CONSULTANT": return { consultant: {
      ...(has("specialty") ? { specialties: { has: f.specialty } } : {}),
      ...(has("country") ? { country: f.country } : {}),
      ...(has("district") ? { district: f.district } : {}),
    } };
    case "TOOL": return TOOL_TYPES.includes(f.toolType) ? { tool: { toolType: f.toolType as ToolType } } : {};
    case "WEBSITE": return has("siteType") ? { website: { siteType: f.siteType } } : {};
    default: return {};
  }
}


/** Listings for a content tab (or every tab). Every word must appear in the title, brief or description. */
export async function searchListings(tab: Tab, q: string, f: Params) {
  const types = tab === "ALL" ? ALL_TYPES : [tab as ContentType];
  return prisma.contentItem.findMany({
    where: {
      ...live,
      contentType: { in: types },
      ...(f.category && tab !== "ALL" ? { primaryCategoryId: f.category } : {}),
      AND: [
        ...searchTerms(q).map(termWhere),
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
    orderBy: [{ publishedAt: "desc" }],
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

/** Keywords, this tab's filters, and the values picked in the URL (unknown keys ignored). */
/** filtersFor, cached between requests; admin saves clear it (tag "site-data", see src/lib/cached.ts). */
export const cachedFilters = unstable_cache((tab: Tab) => filtersFor(tab), ["filters"], { tags: ["site-data"], revalidate: 300 });

export async function readSearch(tab: Tab, sp: SearchParams) {
  const filters = await cachedFilters(tab);
  const q = first(sp.q);
  const values: Params = Object.fromEntries(filters.map((f) => [f.name, first(sp[f.name])]).filter(([, v]) => v));
  return { q, filters, values, active: Boolean(q || Object.keys(values).length) };
}
