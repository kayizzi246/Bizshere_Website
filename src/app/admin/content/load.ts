import type { ContentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { directoryFor, type Field } from "@/lib/content-fields";

export type Option = { value: string; label: string };
export type FormOptions = { categories: Option[]; audiences: Option[]; locations: Option[]; link: Option[] };

/** Choices for the entry form's select boxes. */
export async function loadOptions(type: ContentType): Promise<FormOptions> {
  const dir = directoryFor(type);
  const [categories, audiences, locations, orgs, providers] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ kind: "asc" }, { name: "asc" }] }),
    prisma.audience.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ where: { type: { in: ["COUNTRY", "REGION", "DISTRICT"] } }, orderBy: [{ type: "asc" }, { name: "asc" }] }),
    dir?.link?.field === "organizationId" ? prisma.organization.findMany({ orderBy: { legalName: "asc" }, select: { id: true, legalName: true, tradingName: true } }) : [],
    dir?.link?.field === "providerId" ? prisma.fundingProvider.findMany({ include: { organization: { select: { legalName: true } } } }) : [],
  ]);
  return {
    categories: categories.map((c) => ({ value: c.id, label: `${c.name} (${c.kind.toLowerCase().replace(/_/g, " ")})` })),
    audiences: audiences.map((a) => ({ value: a.id, label: a.name })),
    locations: locations.map((l) => ({ value: l.id, label: `${l.name} (${l.type.toLowerCase()})` })),
    link: [
      ...orgs.map((o) => ({ value: o.id, label: o.tradingName ? `${o.tradingName} (${o.legalName})` : o.legalName })),
      ...providers.map((p) => ({ value: p.id, label: p.organization.legalName })),
    ],
  };
}

export function toFormValue(f: Field, v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (Array.isArray(v)) return v.join(", ");
  if (f.kind === "json") return JSON.stringify(v);
  return String(v);
}

/** Current values of an existing item, flattened for the form. */
export async function loadValues(id: string) {
  const item = await prisma.contentItem.findUnique({
    where: { id },
    include: {
      audiences: true, locations: true, categories: true, entitlements: true,
      relatedFrom: { include: { toItem: { select: { slug: true } } }, orderBy: { displayOrder: "asc" } },
      revisions: { include: { editor: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 10 },
      businessIdea: { include: { steps: { orderBy: { stepNumber: "asc" } } } },
      machine: true, supplier: true, fundingProgramme: true, investmentOpportunity: true,
      guide: { include: { steps: { orderBy: { stepNumber: "asc" } }, documents: true } },
      consultant: true,
      recipe: { include: { ingredients: { orderBy: { order: "asc" } }, steps: { orderBy: { stepNumber: "asc" } } } },
      tool: true, website: true, news: true,
    },
  });
  if (!item) return null;
  const dir = directoryFor(item.contentType)!;
  const record = item[dir.model] as Record<string, unknown> | null;
  const values: Record<string, string> = {};
  for (const f of dir.fields) values[`f_${f.name}`] = toFormValue(f, record?.[f.name]);
  if (dir.link && record) values[dir.link.field] = String(record[dir.link.field] ?? "");

  const children: Record<string, string> = {
    ideaSteps: item.businessIdea?.steps.map((s) => [s.title, s.description].filter(Boolean).join(" | ")).join("\n") ?? "",
    guideSteps: item.guide?.steps.map((s) => `${s.isOfficial ? "" : "* "}${s.instruction}`).join("\n") ?? "",
    guideDocuments: item.guide?.documents.map((d) => [d.name, d.notes].filter(Boolean).join(" | ")).join("\n") ?? "",
    recipeIngredients: item.recipe?.ingredients.map((i) => [i.quantity === null ? "" : String(i.quantity), i.unit ?? "", i.name, i.prepNote ?? "", i.substitute ?? ""].join(" | ").replace(/( \| )+$/, "")).join("\n") ?? "",
    recipeSteps: item.recipe?.steps.map((s) => [s.instruction, s.durationMinutes ?? "", s.temperatureC ?? ""].join(" | ").replace(/( \| )+$/, "")).join("\n") ?? "",
  };
  for (const [k, v] of Object.entries(children)) values[`c_${k}`] = v;

  return {
    item,
    values: {
      ...values,
      id: item.id,
      title: item.title,
      slug: item.slug,
      shortSummary: item.shortSummary ?? "",
      overview: item.overview ?? "",
      coverageNotes: item.coverageNotes ?? "",
      primaryCategoryId: item.primaryCategoryId ?? "",
      publicationStatus: item.publicationStatus,
      accessLevel: item.accessLevel,
      lastReviewedAt: item.lastReviewedAt?.toISOString().slice(0, 10) ?? "",
      nextReviewDueAt: item.nextReviewDueAt?.toISOString().slice(0, 10) ?? "",
      expiresAt: item.expiresAt?.toISOString().slice(0, 10) ?? "",
      entitlements: item.entitlements.map((e) => e.entitlement).join(", "),
      relations: item.relatedFrom.map((r) => `${r.relationshipType} ${r.toItem.slug}`).join("\n"),
    },
    multi: {
      businessStages: item.businessStages as string[],
      audiences: item.audiences.map((a) => a.audienceId),
      locations: item.locations.map((l) => l.locationId),
      categories: item.categories.map((c) => c.categoryId),
    },
  };
}
