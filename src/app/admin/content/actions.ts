"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { SITE_DATA } from "@/lib/cached";
import { redirect } from "next/navigation";
import { Prisma, type AccessLevel, type BusinessStage, type ContentType, type PublicationStatus } from "@prisma/client";
import { prisma, type Tx } from "@/lib/prisma";
import { requireStaff } from "@/lib/access";
import { audit } from "@/lib/audit";
import { directoryFor, RELATIONSHIP_TYPES, type ChildList } from "@/lib/content-fields";
import { parseField } from "@/lib/field-parse";

export type ContentFormState = { errors?: Record<string, string> };

const STATUSES: PublicationStatus[] = ["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"];
const ACCESS: AccessLevel[] = ["PUBLIC", "PREVIEW", "MEMBERS"];
const STAGES: BusinessStage[] = ["IDEA", "STARTING", "GROWING", "ESTABLISHED"];

/** Prisma delegate name for each directory's specialised model. */
const DELEGATE = {
  businessIdea: "businessIdea", machine: "machine", supplier: "supplier", fundingProgramme: "fundingProgramme",
  investmentOpportunity: "investmentOpportunity", guide: "guide", consultant: "consultant", recipe: "recipe",
  tool: "tool", website: "usefulWebsite", news: "newsArticle",
} as const;

// The specialised models share the same upsert-by-contentItemId shape; the field
// list in content-fields.ts is the source of truth for what is written.
type UpsertDelegate = { upsert(args: { where: { contentItemId: string }; create: Record<string, unknown>; update: Record<string, unknown> }): Promise<{ id: string }> };

const str = (v: FormDataEntryValue | null) => (v === null ? "" : String(v).trim());
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
const optDate = (v: string) => (v ? new Date(v) : null);

const lines = (raw: string) => raw.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
const cells = (line: string) => line.split("|").map((x) => x.trim());

async function saveChildren(tx: Tx, key: ChildList["key"], parentId: string, raw: string, errors: Record<string, string>) {
  const rows = lines(raw);
  switch (key) {
    case "ideaSteps":
      await tx.ideaStep.deleteMany({ where: { ideaId: parentId } });
      await tx.ideaStep.createMany({ data: rows.map((r, n) => { const [title, description] = cells(r); return { ideaId: parentId, stepNumber: n + 1, title, description: description || null }; }) });
      break;
    case "guideSteps":
      await tx.guideStep.deleteMany({ where: { guideId: parentId } });
      await tx.guideStep.createMany({ data: rows.map((r, n) => ({ guideId: parentId, stepNumber: n + 1, isOfficial: !r.startsWith("*"), instruction: r.replace(/^\*\s*/, "") })) });
      break;
    case "guideDocuments":
      await tx.guideDocument.deleteMany({ where: { guideId: parentId } });
      await tx.guideDocument.createMany({ data: rows.map((r) => { const [name, notes] = cells(r); return { guideId: parentId, name, notes: notes || null }; }) });
      break;
    case "recipeSteps":
      await tx.recipeStep.deleteMany({ where: { recipeId: parentId } });
      await tx.recipeStep.createMany({ data: rows.map((r, n) => { const [instruction, mins, temp] = cells(r); return { recipeId: parentId, stepNumber: n + 1, instruction, durationMinutes: mins ? Number(mins) || null : null, temperatureC: temp ? Number(temp) || null : null }; }) });
      break;
    case "recipeIngredients": {
      const data = rows.map((r, n) => {
        // Quantity and unit may be empty ("salt, to taste"); an empty quantity is stored as NULL, never 0.
        const [qty, unit, name, prepNote, substitute] = cells(r);
        if (!name || (qty && Number.isNaN(Number(qty)))) errors.recipeIngredients = `Line ${n + 1}: use quantity | unit | name`;
        return { recipeId: parentId, quantity: qty && !Number.isNaN(Number(qty)) ? new Prisma.Decimal(qty) : null, unit: unit || null, name: name ?? "", prepNote: prepNote || null, substitute: substitute || null, order: n };
      });
      if (errors.recipeIngredients) return;
      await tx.recipeIngredient.deleteMany({ where: { recipeId: parentId } });
      await tx.recipeIngredient.createMany({ data });
      break;
    }
  }
}

/** Creates or updates one content item and its specialised record. Keeps a revision snapshot. */
export async function saveContent(_prev: ContentFormState, form: FormData): Promise<ContentFormState> {
  const editor = await requireStaff();
  const errors: Record<string, string> = {};
  const id = str(form.get("id")) || null;
  const type = str(form.get("contentType")) as ContentType;
  const dir = directoryFor(type);
  if (!dir) return { errors: { form: "Unknown directory" } };

  const title = str(form.get("title"));
  if (title.length < 2) errors.title = "Required";
  const slug = slugify(str(form.get("slug")) || title);
  const clash = await prisma.contentItem.findFirst({ where: { slug, NOT: id ? { id } : undefined }, select: { id: true } });
  if (clash) errors.slug = "Another page already uses this web address";

  const status = str(form.get("publicationStatus")) as PublicationStatus;
  const access = str(form.get("accessLevel")) as AccessLevel;
  if (!STATUSES.includes(status)) errors.publicationStatus = "Choose a status";
  if (!ACCESS.includes(access)) errors.accessLevel = "Choose an access level";

  const specialised: Record<string, unknown> = {};
  for (const f of dir.fields) {
    const v = parseField(f, str(form.get(`f_${f.name}`)), errors);
    if (f.required && (v === null || v === "")) errors[f.name] = "Required";
    specialised[f.name] = v;
  }
  if (dir.link) {
    const linkId = str(form.get(dir.link.field));
    if (!linkId) errors[dir.link.field] = `Choose the ${dir.link.label.toLowerCase()}`;
    specialised[dir.link.field] = linkId;
  }
  // "From" can't be above "to" (machine price, fund amount)
  for (const [lo, hi] of [["priceMin", "priceMax"], ["amountMin", "amountMax"]]) {
    const a = specialised[lo], z = specialised[hi];
    if (a instanceof Prisma.Decimal && z instanceof Prisma.Decimal && a.greaterThan(z)) errors[hi] = "Can't be lower than the first amount";
  }
  // Required columns left empty: drop them so the database default applies (or, when editing, the
  // saved value stays); required columns without a default must be filled in. Read from the schema,
  // so a column added later is covered too (e.g. currency, which defaults to UGX).
  const modelName = DELEGATE[dir.model].charAt(0).toUpperCase() + DELEGATE[dir.model].slice(1);
  const columns = Prisma.dmmf.datamodel.models.find((m) => m.name === modelName)?.fields ?? [];
  for (const c of columns) {
    if (!(c.name in specialised) || specialised[c.name] !== null || !c.isRequired) continue;
    if (c.hasDefaultValue) delete specialised[c.name];
    else errors[c.name] = "Required";
  }

  const relationRows = lines(str(form.get("relations"))).map((r) => r.split(/\s+/));
  for (const [rel] of relationRows) if (!(RELATIONSHIP_TYPES as readonly string[]).includes(rel)) errors.relations = `Unknown relationship "${rel}"`;
  const relSlugs = relationRows.map(([, s]) => s).filter(Boolean);
  const relTargets = relSlugs.length ? await prisma.contentItem.findMany({ where: { slug: { in: relSlugs } }, select: { id: true, slug: true } }) : [];
  const missing = relSlugs.filter((s) => !relTargets.some((t) => t.slug === s));
  if (missing.length) errors.relations = `No page with address: ${missing.join(", ")}`;

  if (Object.keys(errors).length) return { errors };

  const now = new Date();
  const core = {
    contentType: type,
    title,
    slug,
    shortSummary: str(form.get("shortSummary")) || null,
    overview: str(form.get("overview")) || null,
    coverageNotes: str(form.get("coverageNotes")) || null,
    primaryCategoryId: str(form.get("primaryCategoryId")) || null,
    businessStages: form.getAll("businessStages").map(String).filter((s): s is BusinessStage => STAGES.includes(s as BusinessStage)),
    publicationStatus: status,
    accessLevel: access,
    lastReviewedAt: optDate(str(form.get("lastReviewedAt"))) ?? (status === "PUBLISHED" ? now : null),
    nextReviewDueAt: optDate(str(form.get("nextReviewDueAt"))),
    expiresAt: optDate(str(form.get("expiresAt"))),
    reviewedById: status === "PUBLISHED" ? editor.id : undefined,
  };

  const itemId = await prisma.$transaction(async (tx) => {
    const before = id ? await tx.contentItem.findUnique({ where: { id }, select: { publishedAt: true } }) : null;
    const item = id
      ? await tx.contentItem.update({ where: { id }, data: { ...core, publishedAt: status === "PUBLISHED" ? before?.publishedAt ?? now : before?.publishedAt } })
      : await tx.contentItem.create({ data: { ...core, createdById: editor.id, publishedAt: status === "PUBLISHED" ? now : null } });

    const delegate = tx[DELEGATE[dir.model]] as unknown as UpsertDelegate;
    const record = await delegate.upsert({ where: { contentItemId: item.id }, create: { ...specialised, contentItemId: item.id }, update: specialised });

    for (const child of dir.children ?? []) {
      if (form.has(`c_${child.key}`)) await saveChildren(tx, child.key, record.id, str(form.get(`c_${child.key}`)), errors);
    }
    if (errors.recipeIngredients) throw new Error(errors.recipeIngredients);

    // Linked classifications
    await tx.contentAudience.deleteMany({ where: { contentItemId: item.id } });
    await tx.contentAudience.createMany({ data: form.getAll("audiences").map((a) => ({ contentItemId: item.id, audienceId: String(a) })) });
    await tx.contentLocation.deleteMany({ where: { contentItemId: item.id } });
    await tx.contentLocation.createMany({ data: form.getAll("locations").map((l) => ({ contentItemId: item.id, locationId: String(l) })) });
    await tx.contentCategory.deleteMany({ where: { contentItemId: item.id } });
    await tx.contentCategory.createMany({ data: form.getAll("categories").map((c) => ({ contentItemId: item.id, categoryId: String(c) })) });
    await tx.contentEntitlement.deleteMany({ where: { contentItemId: item.id } });
    await tx.contentEntitlement.createMany({ data: str(form.get("entitlements")).split(",").map((x) => x.trim()).filter(Boolean).map((entitlement) => ({ contentItemId: item.id, entitlement })) });

    // Outgoing related-content links (incoming ones are edited from the other page)
    await tx.relatedContent.deleteMany({ where: { fromItemId: item.id } });
    await tx.relatedContent.createMany({
      data: relationRows.map(([relationshipType, s], n) => ({ fromItemId: item.id, toItemId: relTargets.find((t) => t.slug === s)!.id, relationshipType, displayOrder: n })).filter((r) => r.toItemId !== item.id),
      skipDuplicates: true,
    });

    const snapshot = Object.fromEntries([...form.entries()].filter(([k]) => !k.startsWith("$")).map(([k, v]) => [k, String(v)]));
    await tx.contentRevision.create({ data: { contentItemId: item.id, editorId: editor.id, snapshot, note: str(form.get("revisionNote")) || null } });
    return item.id;
  }).catch((e: Error) => {
    if (errors.recipeIngredients) return null;
    throw e;
  });
  if (!itemId) return { errors };

  await audit(editor.id, id ? "content.updated" : "content.created", "content_item", itemId, { type, status });
  revalidatePath("/admin/content");
  revalidateTag(SITE_DATA);
  redirect(`/admin/content/${itemId}?saved=1`);
}
