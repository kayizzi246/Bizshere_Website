import type { ContentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DIRECTORY_KINDS } from "@/lib/categories";
import { directoryFor, type Field } from "@/lib/content-fields";

export type Option = { value: string; label: string };
export type FormOptions = { categories: Option[]; primaryCategories: Option[]; audiences: Option[]; locations: Option[]; link: Option[]; suppliers: Option[] };

/** Choices for the entry form's select boxes. The main category offers this directory's own kinds, plus the one already chosen. */
export async function loadOptions(type: ContentType, currentCategoryId?: string | null): Promise<FormOptions> {
  const dir = directoryFor(type);
  const [categories, audiences, locations, orgs, providers, suppliers] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ kind: "asc" }, { name: "asc" }] }),
    prisma.audience.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ where: { type: { in: ["COUNTRY", "REGION", "DISTRICT"] } }, orderBy: [{ type: "asc" }, { name: "asc" }] }),
    dir?.link?.field === "organizationId" ? prisma.organization.findMany({ orderBy: { legalName: "asc" }, select: { id: true, legalName: true, tradingName: true } }) : [],
    dir?.link?.field === "providerId" ? prisma.fundingProvider.findMany({ include: { organization: { select: { legalName: true } } } }) : [],
    // Suppliers on the site, for a field that links one (a machine's provider)
    dir?.fields.some((f) => f.ref === "supplier")
      ? prisma.supplier.findMany({ select: { id: true, country: true, contentItem: { select: { title: true, publicationStatus: true } } }, orderBy: { contentItem: { title: "asc" } } })
      : [],
  ]);
  return {
    categories: categories.map((c) => ({ value: c.id, label: `${c.name} (${c.kind.toLowerCase().replace(/_/g, " ")})` })),
    primaryCategories: categories.filter((c) => DIRECTORY_KINDS[type].includes(c.kind) || c.id === currentCategoryId).sort((a, b) => a.name.localeCompare(b.name)).map((c) => ({ value: c.id, label: c.name })),
    audiences: audiences.map((a) => ({ value: a.id, label: a.name })),
    locations: locations.map((l) => ({ value: l.id, label: `${l.name} (${l.type.toLowerCase()})` })),
    link: [
      ...orgs.map((o) => ({ value: o.id, label: o.tradingName ? `${o.tradingName} (${o.legalName})` : o.legalName })),
      ...providers.map((p) => ({ value: p.id, label: p.organization.legalName })),
    ],
    suppliers: suppliers.map((s) => ({
      value: s.id,
      label: `${s.contentItem.title.replace(/^Sample:\s*/i, "")}${s.country && s.country !== "Uganda" ? ` (${s.country})` : ""}${s.contentItem.publicationStatus === "PUBLISHED" ? "" : " · not live yet"}`,
    })),
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
      machine: true, businessTip: true, supplier: { include: { organization: { select: { locations: { orderBy: { isPrimary: "desc" }, take: 1 } } } } },
      fundingProgramme: { include: { provider: { select: { phone: true, email: true, country: true, organization: { select: { website: true, logoUrl: true } } } } } }, investmentOpportunity: true,
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
  for (const f of dir.fields) {
    // An images field (e.g. machine photos) flattens to a JSON list: the main photo, then the extras.
    if (f.kind === "images") {
      const main = record?.[f.name];
      const extra = (f.extra ? record?.[f.extra] : null) as string[] | null | undefined;
      values[`f_${f.name}`] = JSON.stringify([main, ...(extra ?? [])].filter((x): x is string => Boolean(x)));
    } else {
      values[`f_${f.name}`] = toFormValue(f, record?.[f.name]);
    }
  }
  if (dir.link && record) values[dir.link.field] = String(record[dir.link.field] ?? "");
  if (item.supplier) values.f_address = item.supplier.organization.locations[0]?.physicalAddress ?? "";
  const funder = item.fundingProgramme?.provider;
  if (funder) Object.assign(values, { f_funderPhone: funder.phone ?? "", f_funderEmail: funder.email ?? "", f_funderCountry: funder.country, f_funderWebsite: funder.organization.website ?? "", f_funderLogo: funder.organization.logoUrl ?? "" });

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
