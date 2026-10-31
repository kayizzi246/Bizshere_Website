import type { ContentType } from "@prisma/client";

/**
 * The directories, in the client's order (recipes left out at the client's request), named and described in
 * plain, short words so first-time visitors know at once what each one is for. One list feeds the
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
    title: "Business ideas", nav: "Business ideas", short: "business ideas",
    text: "Pick a business. See what you need and how much it costs to start.",
  },
  {
    href: "/machines", icon: "machine", type: "MACHINE", unit: ["machine", "machines"],
    title: "Machines", nav: "Machines", short: "machines",
    text: "See what each machine does, where to buy it and what it costs.",
  },
  {
    href: "/suppliers", icon: "supplier", type: "SUPPLIER", unit: ["supplier", "suppliers"],
    title: "Suppliers", nav: "Suppliers", short: "suppliers",
    text: "Checked suppliers for your stock and materials, in Uganda and abroad.",
  },
  {
    href: "/funding", icon: "funding", type: "FUNDING_PROGRAMME", unit: ["source", "sources"],
    title: "Loans and funding", nav: "Funding", short: "funding",
    text: "Banks, government and other lenders: what they give, their terms and how to apply.",
  },
  {
    href: "/guides", icon: "guide", type: "GUIDE", unit: ["guide", "guides"],
    title: "How-to guides", nav: "Guides", short: "guides",
    text: "Step-by-step help to register your business, get licences, use EFRIS and pay taxes.",
  },
  {
    href: "/experts", icon: "expert", type: "CONSULTANT", unit: ["expert", "experts"],
    title: "Business experts", nav: "Experts", short: "experts",
    text: "Checked advisors for tax, accounting, import, export, farming and more.",
  },
  {
    href: "/tools", icon: "tool", type: "TOOL", unit: ["tool", "tools"],
    title: "Business tools", nav: "Tools", short: "tools",
    text: "Calculators and templates: VAT, PAYE, business plans and cash flow.",
  },
  {
    href: "/prices", icon: "prices", type: "PRICES", unit: ["price", "prices"],
    title: "Market prices", nav: "Market prices", short: "market prices",
    text: "Latest prices for rice, coffee, milk and other goods, market by market.",
  },
  {
    href: "/websites", icon: "link", type: "WEBSITE", unit: ["website", "websites"],
    title: "Useful websites", nav: "Websites", short: "websites",
    text: "Government and business websites you will need, in one list.",
  },
  {
    href: "/news", icon: "news", type: "NEWS", unit: ["update", "updates"],
    title: "Business news", nav: "News", short: "news",
    text: "Latest business, education and career news.",
  },
];

/**
 * Paths only members can open; links into them show the sign-up and payment pop-up. Markets and prices is free.
 * Investment opportunities (listed under Guidelines) and recipes aren't directories of their own, but their pages are paid too.
 */
export const PAID_PATHS = [...DIRECTORIES.filter((d) => d.href !== "/prices").map((d) => d.href), "/opportunities", "/recipes"];

/** Title and description for a directory's list page. */
export const directory = (href: string) => DIRECTORIES.find((d) => d.href === href)!;
