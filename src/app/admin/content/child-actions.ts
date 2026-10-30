"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { SITE_DATA } from "@/lib/cached";
import { redirect } from "next/navigation";
import { Prisma, type ClaimType, type RoundStatus, type ScenarioLevel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/access";
import { audit } from "@/lib/audit";

/** Editors for child records that the main content form doesn't cover: budgets, rounds, evidence. */

const s = (form: FormData, k: string) => String(form.get(k) ?? "").trim();
const back = (contentItemId: string, msg: string) => redirect(`/admin/content/${contentItemId}?${msg}#children`);

/**
 * Saves one budget scenario and replaces its lines (blueprint §04).
 * Line format: category | description | quantity | unit | unit cost | reason if unknown | recurring (yes/no) | optional (yes/no) | details
 */
export async function saveBudgetScenario(form: FormData) {
  const editor = await requireStaff();
  const contentItemId = s(form, "contentItemId");
  const ideaId = s(form, "ideaId");
  const level = s(form, "level") as ScenarioLevel;
  if (!["LOW", "STANDARD", "HIGHER"].includes(level)) back(contentItemId, "error=Choose+a+scenario+level");
  const currency = s(form, "currency") || "UGX";
  if (!/^[A-Z]{3}$/.test(currency)) back(contentItemId, "error=Currency+must+be+an+ISO+code+like+UGX");

  const lines: Prisma.BudgetLineCreateManyScenarioInput[] = [];
  const rows = s(form, "lines").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const [n, row] of rows.entries()) {
    const [costCategory, description, qty, unit, cost, reason, recurring, optional, details] = row.split("|").map((c) => c.trim());
    const quantity = qty ? Number(qty.replace(/,/g, "")) : 1;
    const unitCost = cost ? Number(cost.replace(/[,\s]/g, "")) : null;
    if (!costCategory || !description || Number.isNaN(quantity) || quantity < 0 || (unitCost !== null && (Number.isNaN(unitCost) || unitCost < 0))) {
      back(contentItemId, `error=${encodeURIComponent(`Budget line ${n + 1}: use category | description | quantity | unit | unit cost | reason | recurring`)}`);
    }
    if (unitCost === null && !reason) back(contentItemId, `error=${encodeURIComponent(`Budget line ${n + 1}: no cost, so give the reason (e.g. Awaiting sourced quote)`)}`);
    lines.push({
      costCategory, description, quantity: new Prisma.Decimal(quantity), unit: unit || null,
      unitCost: unitCost === null ? null : new Prisma.Decimal(unitCost), unknownReason: unitCost === null ? reason : reason || null,
      isRecurring: /^y(es)?$/i.test(recurring ?? ""), frequency: /^y(es)?$/i.test(recurring ?? "") ? "monthly" : "once", isOptional: /^y(es)?$/i.test(optional ?? ""), details: details || null, displayOrder: n,
    });
  }

  const data = {
    name: s(form, "name") || { LOW: "Low investment", STANDARD: "Standard", HIGHER: "Higher investment" }[level],
    currency,
    locationId: s(form, "locationId") || null,
    estimateDate: s(form, "estimateDate") ? new Date(s(form, "estimateDate")) : null,
    assumptions: s(form, "assumptions") || null,
    operatingScale: s(form, "operatingScale") || null,
  };
  await prisma.$transaction(async (tx) => {
    const scenario = await tx.budgetScenario.upsert({ where: { ideaId_level: { ideaId, level } }, create: { ideaId, level, ...data }, update: data });
    await tx.budgetLine.deleteMany({ where: { scenarioId: scenario.id } });
    await tx.budgetLine.createMany({ data: lines.map((l) => ({ ...l, scenarioId: scenario.id })) });
  });
  await audit(editor.id, "budget.saved", "content_item", contentItemId, { level, lines: lines.length });
  revalidatePath(`/admin/content/${contentItemId}`);
  revalidateTag(SITE_DATA);
  back(contentItemId, "saved=budget");
}

export async function deleteBudgetScenario(form: FormData) {
  const editor = await requireStaff();
  const contentItemId = s(form, "contentItemId");
  await prisma.budgetScenario.delete({ where: { id: s(form, "id") } });
  await audit(editor.id, "budget.deleted", "content_item", contentItemId);
  back(contentItemId, "saved=budget");
}

/** Adds or updates one application round (blueprint §07). */
export async function saveRound(form: FormData) {
  const editor = await requireStaff();
  const contentItemId = s(form, "contentItemId");
  const id = s(form, "id");
  const status = s(form, "status") as RoundStatus;
  const opensAt = s(form, "opensAt") ? new Date(s(form, "opensAt")) : null;
  const closesAt = s(form, "closesAt") ? new Date(`${s(form, "closesAt")}T${s(form, "closesTime") || "17:00"}:00+03:00`) : null;
  const isRolling = form.get("isRolling") === "on";
  const url = s(form, "applicationUrl");
  if (!["UPCOMING", "OPEN", "CLOSED"].includes(status)) back(contentItemId, "error=Choose+a+round+status");
  if (opensAt && closesAt && opensAt > closesAt) back(contentItemId, "error=The+round+can't+close+before+it+opens");
  if (!isRolling && !closesAt && status !== "CLOSED") back(contentItemId, "error=Give+a+closing+date+or+tick+rolling");
  if (url && !/^https?:\/\//i.test(url)) back(contentItemId, "error=Application+link+must+start+with+https://");
  const data = {
    status, opensAt, closesAt, isRolling, applicationUrl: url || null, process: s(form, "process") || null,
    requiredDocuments: s(form, "requiredDocuments").split(/\r?\n|,/).map((d) => d.trim()).filter(Boolean),
  };
  if (id) await prisma.applicationRound.update({ where: { id }, data });
  else await prisma.applicationRound.create({ data: { ...data, programmeId: s(form, "programmeId") } });
  await audit(editor.id, id ? "round.updated" : "round.created", "content_item", contentItemId, { status });
  revalidatePath(`/admin/content/${contentItemId}`);
  revalidateTag(SITE_DATA);
  back(contentItemId, "saved=round");
}

export async function deleteRound(form: FormData) {
  const editor = await requireStaff();
  const contentItemId = s(form, "contentItemId");
  await prisma.applicationRound.delete({ where: { id: s(form, "id") } });
  await audit(editor.id, "round.deleted", "content_item", contentItemId);
  back(contentItemId, "saved=round");
}

const CLAIMS: ClaimType[] = ["SOURCE_FACT", "EDITOR_EXPLANATION", "ESTIMATE", "PROMOTER_CLAIM"];

/** Records a source and what it supports on this page (blueprint §03 sources and evidence). */
export async function addEvidence(form: FormData) {
  const editor = await requireStaff();
  const contentItemId = s(form, "contentItemId");
  const claimType = s(form, "claimType") as ClaimType;
  const url = s(form, "sourceUrl");
  if (!s(form, "sourceTitle") || !s(form, "claimSupported")) back(contentItemId, "error=Give+the+source+title+and+what+it+supports");
  if (!CLAIMS.includes(claimType)) back(contentItemId, "error=Choose+the+kind+of+information");
  if (url && !/^https?:\/\//i.test(url)) back(contentItemId, "error=Source+link+must+start+with+https://");
  // Reuse a source already recorded with the same URL, so one source can support many pages.
  const existing = url ? await prisma.source.findFirst({ where: { sourceUrl: url } }) : null;
  const source = existing ?? await prisma.source.create({
    data: {
      sourceTitle: s(form, "sourceTitle"), publisherName: s(form, "publisherName") || null, sourceUrl: url || null,
      sourceType: s(form, "sourceType") || null, sourcePublishedAt: s(form, "sourcePublishedAt") ? new Date(s(form, "sourcePublishedAt")) : null,
      accessedAt: new Date(),
    },
  });
  await prisma.evidenceLink.create({ data: { contentItemId, sourceId: source.id, claimSupported: s(form, "claimSupported"), claimType, evidenceNotes: s(form, "evidenceNotes") || null } });
  await audit(editor.id, "evidence.added", "content_item", contentItemId, { sourceId: source.id });
  revalidatePath(`/admin/content/${contentItemId}`);
  revalidateTag(SITE_DATA);
  back(contentItemId, "saved=evidence");
}

export async function deleteEvidence(form: FormData) {
  const editor = await requireStaff();
  const contentItemId = s(form, "contentItemId");
  await prisma.evidenceLink.delete({ where: { id: s(form, "id") } });
  await audit(editor.id, "evidence.deleted", "content_item", contentItemId);
  back(contentItemId, "saved=evidence");
}
