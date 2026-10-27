import type { ContentType } from "@prisma/client";

/**
 * The directories, in the client's order and wording (recipes left out at the client's request). One list feeds the
 * header menu, the homepage blocks and the footer, so they never drift apart.
 *
 *   title  card and menu heading      nav    short label for the header and footer
 *   short  "Open …" link on the card  unit   live count label: [one, many]
 *   type   what the count is based on ("PRICES" counts published price observations)
 */
export type Directory = {
  href: string;
  icon: string;
  type: ContentType | "PRICES";
  unit: [string, string];
  title: string;
  nav: string;
  short: string;
  text: string;
};

export const DIRECTORIES: Directory[] = [
  {
    href: "/business-ideas", icon: "idea", type: "BUSINESS_IDEA", unit: ["plan", "plans"],
    title: "Business ideas and plans", nav: "Business ideas", short: "business ideas",
    text: "Structured database of business ideas, with brief guidelines for their implementation and basic start-up budgets.",
  },
  {
    href: "/machines", icon: "machine", type: "MACHINE", unit: ["machine", "machines"],
    title: "Business machines", nav: "Machines", short: "machines",
    text: "Database of business machines, their business applications, possible sources in Uganda and overseas, and estimated prices.",
  },
  {
    href: "/suppliers", icon: "supplier", type: "SUPPLIER", unit: ["supplier", "suppliers"],
    title: "Suppliers", nav: "Suppliers", short: "suppliers",
    text: "Database of verified suppliers of business commodities, both local and foreign.",
  },
  {
    href: "/funding", icon: "funding", type: "FUNDING_PROGRAMME", unit: ["source", "sources"],
    title: "Funding sources", nav: "Funding", short: "funding sources",
    text: "Structured database of funding sources (banks, government agencies and private sources) with their terms and conditions, criteria and contact information.",
  },
  {
    href: "/guides", icon: "guide", type: "GUIDE", unit: ["guide", "guides"],
    title: "Business information and guidelines", nav: "Guidelines", short: "guidelines",
    text: "Guidelines, books, investment opportunities, videos, websites and other sources for business processes like business registration, export licences, EFRIS registration and tax compliance.",
  },
  {
    href: "/experts", icon: "expert", type: "CONSULTANT", unit: ["expert", "experts"],
    title: "Business consultants and experts", nav: "Experts", short: "experts",
    text: "Database of verified business consultants and advisors in areas like taxation, accounting, importation, export, farming, coffee processing, mining and manufacturing.",
  },
  {
    href: "/tools", icon: "tool", type: "TOOL", unit: ["tool", "tools"],
    title: "Business tools", nav: "Business tools", short: "tools",
    text: "A collection of downloadable business tools and templates, like a VAT calculator, PAYE calculator, business plan templates and cash flow templates.",
  },
  {
    href: "/prices", icon: "prices", type: "PRICES", unit: ["price", "prices"],
    title: "Markets and prices", nav: "Markets and prices", short: "markets and prices",
    text: "Structured database of verified markets for produce like rice, coffee and milk, and product prices.",
  },
  {
    href: "/websites", icon: "link", type: "WEBSITE", unit: ["website", "websites"],
    title: "Useful websites", nav: "Useful websites", short: "websites",
    text: "A collection of business-related and other useful websites.",
  },
  {
    href: "/news", icon: "news", type: "NEWS", unit: ["update", "updates"],
    title: "Business news and updates", nav: "News", short: "news",
    text: "Business, education and career news and updates.",
  },
];

/** Title and description for a directory's list page. */
export const directory = (href: string) => DIRECTORIES.find((d) => d.href === href)!;
