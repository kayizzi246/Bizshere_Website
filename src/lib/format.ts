import type { Prisma } from "@prisma/client";

type Num = Prisma.Decimal | number | null | undefined;

const toNumber = (v: Num) => (v === null || v === undefined ? null : Number(v));

/** "UGX 1,250,000". Empty values show a placeholder; zero shows as 0. */
export function money(v: Num, currency = "UGX", empty = "To be confirmed") {
  const n = toNumber(v);
  if (n === null) return empty;
  return `${currency} ${n.toLocaleString("en-UG", { maximumFractionDigits: 0 })}`;
}

export function moneyRange(min: Num, max: Num, currency = "UGX", empty = "Price to be confirmed") {
  const a = toNumber(min);
  const b = toNumber(max);
  if (a === null && b === null) return empty;
  if (a !== null && b !== null && a !== b) return `${currency} ${fmt(a)}–${fmt(b)}`;
  return `${currency} ${fmt((a ?? b) as number)}`;
}

const fmt = (n: number) => n.toLocaleString("en-UG", { maximumFractionDigits: 0 });

export function date(d: Date | string | null | undefined, empty = "—") {
  if (!d) return empty;
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Kampala" });
}

export function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function isOlderThan(d: Date | null | undefined, days: number) {
  if (!d) return false;
  return Date.now() - new Date(d).getTime() > days * 86_400_000;
}

export const checkLabel: Record<string, string> = {
  BUSINESS_CONTACT: "Business contact",
  REGISTRATION: "Registration",
  PHYSICAL_ADDRESS: "Physical address",
  IDENTITY: "Identity",
  CREDENTIAL: "Credentials",
  PROFESSIONAL_REGISTRATION: "Professional registration",
  OFFICIAL_TERMS: "Terms against official source",
  PRICE_EVIDENCE: "Price evidence",
  LINK: "Link",
};

export const contentTypeLabel: Record<string, string> = {
  BUSINESS_IDEA: "Business idea",
  MACHINE: "Machine",
  SUPPLIER: "Supplier",
  FUNDING_PROGRAMME: "Funding source",
  INVESTMENT_OPPORTUNITY: "Investment opportunity",
  GUIDE: "Guide",
  CONSULTANT: "Expert",
  RECIPE: "Recipe",
  TOOL: "Tool",
  WEBSITE: "Website",
  NEWS: "News",
};

export const contentTypePath: Record<string, string> = {
  BUSINESS_IDEA: "/business-ideas",
  MACHINE: "/machines",
  SUPPLIER: "/suppliers",
  FUNDING_PROGRAMME: "/funding",
  GUIDE: "/guides",
  CONSULTANT: "/experts",
  INVESTMENT_OPPORTUNITY: "/opportunities",
  RECIPE: "/recipes",
  TOOL: "/tools",
  WEBSITE: "/websites",
  NEWS: "/news",
};

/** Detail URL for any content item. */
export const itemHref = (i: { contentType: string; slug: string }) => `${contentTypePath[i.contentType]}/${i.slug}`;

/** "Yes" / "No" / "—" for nullable booleans (unknown is not "No"). */
export function yesNo(v: boolean | null | undefined, yes = "Yes", no = "No") {
  return v === null || v === undefined ? "—" : v ? yes : no;
}

/** "45 min", "1 h 30 min". */
export function minutes(m: number | null | undefined) {
  if (m === null || m === undefined) return "—";
  const h = Math.floor(m / 60);
  return h ? `${h} h${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`;
}

/** Guide and directory sub-sections shown as tabs on the Guides and tools pages. */
export const GUIDE_TABS: [string, string][] = [
  ["/guides", "Information and guidelines"],
  ["/tools", "Business tools"],
  ["/websites", "Useful websites"],
  ["/news", "Business news"],
];

export const FUNDING_TABS: [string, string][] = [
  ["/funding", "Funding sources"],
  ["/opportunities", "Investment opportunities"],
];

export const MACHINE_TABS: [string, string][] = [
  ["/machines", "Business machines"],
  ["/suppliers", "Suppliers"],
];
