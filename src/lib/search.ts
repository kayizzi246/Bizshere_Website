import { Prisma, type ContentType } from "@prisma/client";
import { prisma } from "./prisma";

export const SEARCHABLE_TYPES: ContentType[] = [
  "BUSINESS_IDEA", "MACHINE", "SUPPLIER", "FUNDING_PROGRAMME", "GUIDE", "CONSULTANT", "RECIPE", "TOOL", "WEBSITE", "NEWS", "INVESTMENT_OPPORTUNITY",
];

export type SearchInput = {
  q?: string; // free text
  all?: string; // all of these words
  phrase?: string; // exact phrase
  exclude?: string; // none of these words
  types?: ContentType[];
  updatedWithinDays?: number;
  checkedOnly?: boolean;
  limit?: number;
  userId?: string | null; // for search analytics only
};

/** Builds a websearch_to_tsquery string: words, "exact phrase", -excluded */
export function buildQuery(i: SearchInput) {
  const parts: string[] = [];
  if (i.q) parts.push(i.q);
  if (i.all) parts.push(i.all);
  if (i.phrase) parts.push(`"${i.phrase.replace(/"/g, "")}"`);
  if (i.exclude) parts.push(...i.exclude.split(/\s+/).filter(Boolean).map((w) => `-${w}`));
  return parts.join(" ").trim();
}

/**
 * Full-text search over published content (index created in prisma/sql/constraints.sql).
 * Returns content items with enough related data for result cards.
 */
export async function searchContent(input: SearchInput) {
  const text = buildQuery(input);
  const types = input.types?.length ? input.types : SEARCHABLE_TYPES;
  const limit = Math.min(input.limit ?? 30, 100);
  const doc = Prisma.sql`to_tsvector('english', coalesce("title", '') || ' ' || coalesce("shortSummary", '') || ' ' || coalesce("overview", ''))`;
  const since = input.updatedWithinDays ? new Date(Date.now() - input.updatedWithinDays * 86_400_000) : null;

  const rows = await prisma.$queryRaw<{ id: string; rank: number }[]>`
    SELECT c.id, ${text ? Prisma.sql`ts_rank(${doc}, websearch_to_tsquery('english', ${text}))` : Prisma.sql`0`} AS rank
    FROM content_items c
    WHERE c."publicationStatus" = 'PUBLISHED'
      AND c."contentType" = ANY(${types}::"ContentType"[])
      ${text ? Prisma.sql`AND ${doc} @@ websearch_to_tsquery('english', ${text})` : Prisma.empty}
      ${since ? Prisma.sql`AND c."updatedAt" >= ${since}` : Prisma.empty}
      ${input.checkedOnly ? Prisma.sql`AND (c."contentType" NOT IN ('SUPPLIER','CONSULTANT') OR EXISTS (SELECT 1 FROM verification_checks v WHERE v."contentItemId" = c.id AND v.result = 'PASSED'))` : Prisma.empty}
    ORDER BY rank DESC, c."publishedAt" DESC NULLS LAST
    LIMIT ${limit}`;

  const ids = rows.map((r) => r.id);
  const items = await prisma.contentItem.findMany({
    where: { id: { in: ids } },
    include: {
      primaryCategory: true,
      checks: { where: { result: "PASSED" } },
      businessIdea: { select: { experienceLevel: true } },
      machine: { select: { voltage: true, phase: true, powerSource: true, capacityMin: true, capacityMax: true, capacityUnit: true, _count: { select: { offers: { where: { status: "PUBLISHED" } } } } } },
      fundingProgramme: { select: { fundingType: true, amountMin: true, amountMax: true, currency: true, rounds: { where: { status: "OPEN" }, orderBy: { closesAt: "asc" }, take: 1 } } },
      consultant: { select: { specialties: true, deliveryModes: true } },
    },
  });
  const order = new Map(ids.map((id, i) => [id, i]));
  items.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  await prisma.searchEvent.create({ data: { userId: input.userId ?? null, query: text, filters: { types: input.types ?? [] }, resultsCount: items.length } }).catch(() => undefined);
  return { text, items };
}
