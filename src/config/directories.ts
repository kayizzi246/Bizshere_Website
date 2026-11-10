import type { ContentType } from "@prisma/client";

/**
 * The directories, in the client's order (recipes left out at the client's request), described in
 * plain, short words so first-time visitors know at once what each one is for. One list feeds the
 * header menu, the homepage blocks, the footer, page titles and breadcrumbs, so they never drift apart.
 *
 *   title  the directory's name, as the client named the tabs. Use it unchanged everywhere, never shortened
 *   unit   live count label: [one, many]
 *   type   what the count is based on ("PRICES" counts published price observations)
 */
export type Directory = {
  href: string;
  icon: string;
  type: ContentType | "PRICES" | "FORUM";
  unit: [string, string];
  title: string;
  text: string;
  /** Open to everyone: links here never show the sign-up pop-up. Only writing in them is for members. */
  free?: boolean;
};

export const DIRECTORIES: Directory[] = [
  {
    href: "/business-ideas", icon: "idea", type: "BUSINESS_IDEA", unit: ["plan", "plans"],
    title: "Business Ideas",
    text: "Pick a business. See what you need and how much it costs to start.",
  },
  {
    href: "/machines", icon: "machine", type: "MACHINE", unit: ["machine", "machines"],
    title: "Business Machines",
    text: "See what each machine does, where to buy it and what it costs.",
  },
  {
    href: "/suppliers", icon: "supplier", type: "SUPPLIER", unit: ["supplier", "suppliers"],
    title: "Trusted Suppliers",
    text: "Checked suppliers for your stock and materials, in Uganda and abroad.",
  },
  {
    href: "/funding", icon: "funding", type: "FUNDING_PROGRAMME", unit: ["source", "sources"],
    title: "Funding Sources",
    text: "Banks, government and other lenders: what they give, their terms and how to apply.",
  },
  {
    href: "/guides", icon: "guide", type: "GUIDE", unit: ["guide", "guides"],
    title: "Business Guides",
    text: "Step-by-step help to register your business, get licences, use EFRIS and pay taxes.",
  },
  {
    href: "/experts", icon: "expert", type: "CONSULTANT", unit: ["expert", "experts"],
    title: "Business Experts",
    text: "Checked advisors for tax, accounting, import, export, farming and more.",
  },
  {
    href: "/tools", icon: "tool", type: "TOOL", unit: ["tool", "tools"],
    title: "Business Tools",
    text: "Calculators and templates: VAT, PAYE, business plans and cash flow.",
  },
  {
    href: "/prices", icon: "prices", type: "PRICES", unit: ["price", "prices"],
    title: "Markets and Prices",
    text: "Latest prices for rice, coffee, milk and other goods, market by market.",
  },
  {
    href: "/websites", icon: "link", type: "WEBSITE", unit: ["website", "websites"],
    title: "Useful Websites",
    text: "Government and business websites you will need, in one list.",
  },
  {
    href: "/news", icon: "news", type: "NEWS", unit: ["update", "updates"],
    title: "Business News",
    text: "Latest business, education and career news.",
  },
  {
    href: "/tips", icon: "tip", type: "BUSINESS_TIP", unit: ["tip", "tips"], free: true,
    title: "Business Tips",
    text: "Short, practical tips for running a business, with remarks from members.",
  },
  {
    href: "/forum", icon: "forum", type: "FORUM", unit: ["topic", "topics"], free: true,
    title: "Business Forum",
    text: "Ask questions and chat with other business people, like a WhatsApp group.",
  },
];

/**
 * Paid directories. Anyone can open the list pages (/business-ideas); links to a single item in them
 * (/business-ideas/small-bakery) show the sign-up and payment pop-up. Investment opportunities (listed
 * under Funding Sources) and recipes aren't directories of their own, but their items are paid too.
 */
export const PAID_PATHS = [...DIRECTORIES.filter((d) => !d.free).map((d) => d.href), "/opportunities", "/recipes"];

/** Title and description for a directory's list page. */
export const directory = (href: string) => DIRECTORIES.find((d) => d.href === href)!;

/** The browser title and description of a directory's list page, in its own words, for search results and shares. */
export const directoryMetadata = (href: string) => {
  const d = directory(href);
  return { title: d.title, description: `${d.title} in Uganda: ${d.text.charAt(0).toLowerCase()}${d.text.slice(1)}`, openGraph: { title: `${d.title} · BizSphere-Ug`, description: d.text } };
};

/** Pages under a paid path that are not directory items, so links to them never open the sign-up
 * pop-up. Files (…/pdf, …/file) are let through too: they check access themselves. */
export const OPEN_PATHS = ["/suppliers/login", "/experts/login", "/suppliers/join", "/experts/join"];
