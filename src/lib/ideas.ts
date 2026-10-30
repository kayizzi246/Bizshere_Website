import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { FREE_PREVIEW } from "@/lib/access";
import { budgetTotal } from "@/lib/costing";
import { date } from "@/lib/format";
import { IDEA_CARD_SELECT, PLAN_LABEL, PLAN_ORDER } from "@/components/IdeaParts";
import type { CalcPlan } from "@/components/BudgetCalculator";

/** Shared by a business idea's overview page and its requirements page. */

export async function getIdea(slug: string, isStaff: boolean) {
  return prisma.contentItem.findFirst({
    where: { slug, contentType: "BUSINESS_IDEA", publicationStatus: isStaff ? undefined : "PUBLISHED" },
    include: {
      primaryCategory: true,
      businessIdea: {
        include: {
          steps: { orderBy: { stepNumber: "asc" } },
          scenarios: { include: { location: true, lines: { orderBy: { displayOrder: "asc" } } } },
        },
      },
    },
  });
}
type Idea = NonNullable<NonNullable<Awaited<ReturnType<typeof getIdea>>>["businessIdea"]>;

/** The budget plans in size order (small, medium, large). */
export const plansOf = (idea: Idea) => PLAN_ORDER.map((l) => idea.scenarios.find((s) => s.level === l)).filter((s): s is NonNullable<typeof s> => Boolean(s));

/** Up to four more ideas: the same category first; when it has no others, any others. */
export async function moreIdeas(item: { id: string; primaryCategoryId: string | null }) {
  const find = (where: Prisma.ContentItemWhereInput) => prisma.contentItem.findMany({
    where: { contentType: "BUSINESS_IDEA", publicationStatus: "PUBLISHED", id: { not: item.id }, ...where },
    select: IDEA_CARD_SELECT,
    orderBy: { publishedAt: { sort: "desc", nulls: "last" } },
    take: 4,
  });
  const same = item.primaryCategoryId ? await find({ primaryCategoryId: item.primaryCategoryId }) : [];
  return { inCategory: same.length > 0, list: same.length ? same : await find({}) };
}

/** Each size's lines for the calculator (only the free preview for gated visitors) and, for members, the totals. */
export function calcPlans(scenarios: ReturnType<typeof plansOf>, gated: boolean): CalcPlan[] {
  return scenarios.map((s) => {
    const sent = gated ? s.lines.slice(0, FREE_PREVIEW.budgetLines) : s.lines;
    const essentials = s.lines.filter((l) => !l.isOptional);
    return {
      level: s.level, label: PLAN_LABEL[s.level], scale: s.operatingScale, currency: s.currency, place: s.location?.name ?? "Uganda", asOf: s.estimateDate ? date(s.estimateDate) : null,
      lines: sent.map((l) => ({ id: l.id, category: l.costCategory || "Other", item: l.description, details: l.details, qty: Number(l.quantity), unit: l.unit, price: l.unitCost === null ? null : Number(l.unitCost), reason: l.unknownReason, optional: l.isOptional })),
      count: { all: s.lines.length, optional: s.lines.length - essentials.length, priced: s.lines.filter((l) => l.unitCost !== null).length, pricedEssential: essentials.filter((l) => l.unitCost !== null).length },
      totals: gated ? null : { essential: budgetTotal(essentials), all: budgetTotal(s.lines) },
    };
  });
}

export const requirementsPath = (slug: string) => `/business-ideas/${slug}/requirements`;
