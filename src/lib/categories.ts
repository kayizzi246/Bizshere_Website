import type { CategoryKind, ContentType } from "@prisma/client";
import type { prisma } from "./prisma";

/**
 * The kinds of category, in the words the admin shows. Categories are edited at /admin/categories.
 * `DIRECTORY_KINDS` says which kinds a directory's form offers; the first is where a category
 * typed straight into that form is added.
 */
export const CATEGORY_KINDS: { kind: CategoryKind; label: string }[] = [
  { kind: "INDUSTRY", label: "Industries (business ideas, funding)" },
  { kind: "PRODUCT_CATEGORY", label: "Suppliers and products" },
  { kind: "MACHINE_CATEGORY", label: "Machines" },
  { kind: "SERVICE_SPECIALTY", label: "Experts" },
  { kind: "GUIDE_PROCESS", label: "Guides" },
  { kind: "TOOL_CATEGORY", label: "Tools" },
  { kind: "WEBSITE_CATEGORY", label: "Websites" },
  { kind: "NEWS_CATEGORY", label: "News" },
  { kind: "BUSINESS_TYPE", label: "Business types" },
  { kind: "RECIPE_CATEGORY", label: "Recipes" },
];

export const kindLabel = (kind: string) => CATEGORY_KINDS.find((k) => k.kind === kind)?.label ?? kind;
export const isCategoryKind = (v: string): v is CategoryKind => CATEGORY_KINDS.some((k) => k.kind === v);

export const DIRECTORY_KINDS: Record<ContentType, CategoryKind[]> = {
  BUSINESS_IDEA: ["INDUSTRY", "BUSINESS_TYPE"],
  MACHINE: ["MACHINE_CATEGORY", "INDUSTRY"],
  SUPPLIER: ["PRODUCT_CATEGORY", "MACHINE_CATEGORY", "INDUSTRY"],
  FUNDING_PROGRAMME: ["INDUSTRY"],
  INVESTMENT_OPPORTUNITY: ["INDUSTRY"],
  GUIDE: ["GUIDE_PROCESS", "INDUSTRY"],
  CONSULTANT: ["SERVICE_SPECIALTY", "INDUSTRY"],
  RECIPE: ["RECIPE_CATEGORY"],
  TOOL: ["TOOL_CATEGORY"],
  WEBSITE: ["WEBSITE_CATEGORY"],
  NEWS: ["NEWS_CATEGORY"],
};

export const categorySlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);

/**
 * The category of this name in this list, added if it isn't there. Compared by name, because a
 * rename keeps the old web address: the address of a new category may need a number after it.
 */
export async function findOrAddCategory(db: Pick<typeof prisma, "category">, kind: CategoryKind, name: string) {
  const same = await db.category.findFirst({ where: { kind, name: { equals: name, mode: "insensitive" } } });
  if (same) return { category: same, added: false };
  const base = categorySlug(name);
  let slug = base;
  for (let n = 2; await db.category.findUnique({ where: { kind_slug: { kind, slug } }, select: { id: true } }); n++) slug = `${base}-${n}`;
  return { category: await db.category.create({ data: { kind, name, slug } }), added: true };
}
