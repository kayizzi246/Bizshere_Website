"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireContentType } from "@/lib/access";
import { getSession } from "@/lib/auth";
import { MAX_ROWS, type ImportKind } from "@/lib/bulk-import";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
const list = (s?: string) => (s ? s.split(/[,;]/).map((x) => x.trim()).filter(Boolean).slice(0, 40) : []);
const money = (s?: string) => (s && Number.isFinite(Number(s)) ? Number(s) : null);
const text = (s?: string) => (s && s.trim() ? s.trim() : null);

export type ImportResult = { saved: number; failed: { title: string; reason: string }[]; error?: string };

/**
 * Write checked rows from a spreadsheet (src/lib/bulk-import.ts).
 *
 * Each row is its own transaction, so one bad row cannot undo the rest — with a hundred rows from
 * a client's file, losing ninety-nine good ones because the last is malformed is the wrong
 * trade. What failed comes back by name so it can be fixed and imported again.
 *
 * Everything arrives as DRAFT unless the file said otherwise, so an import is never published to
 * the public by accident.
 */
export async function importRows(kind: ImportKind, rows: Record<string, string>[]): Promise<ImportResult> {
  // Permission is per directory: someone allowed to edit suppliers cannot import business ideas.
  await requireContentType(kind);
  const session = await getSession();
  if (!session?.user || !["EDITOR", "ADMIN"].includes(session.user.role)) {
    return { saved: 0, failed: [], error: "Not allowed." };
  }
  if (!rows.length) return { saved: 0, failed: [], error: "Nothing to import." };
  if (rows.length > MAX_ROWS) return { saved: 0, failed: [], error: `Too many rows at once (limit ${MAX_ROWS}).` };

  const createdById = session.user.id;
  const failed: ImportResult["failed"] = [];
  let saved = 0;

  for (const v of rows) {
    const title = (v.title ?? "").trim();
    if (!title) { failed.push({ title: "(no name)", reason: "No name" }); continue; }

    try {
      // A unique web address, the same way the content form does it.
      let slug = slugify(title) || "item";
      const base = slug;
      for (let n = 2; await prisma.contentItem.findFirst({ where: { slug }, select: { id: true } }); n++) {
        slug = `${base}-${n}`.slice(0, 80);
        if (n > 50) throw new Error("Could not make a unique web address");
      }

      const status = (v.status as "DRAFT" | "PUBLISHED" | "IN_REVIEW" | "ARCHIVED") ?? "DRAFT";

      await prisma.$transaction(async (tx) => {
        const item = await tx.contentItem.create({
          data: {
            contentType: kind,
            title,
            slug,
            shortSummary: text(v.shortSummary),
            overview: text(v.overview),
            publicationStatus: status,
            publishedAt: status === "PUBLISHED" ? new Date() : null,
            createdById,
          },
          select: { id: true },
        });

        if (kind === "BUSINESS_IDEA") {
          await tx.businessIdea.create({
            data: {
              contentItemId: item.id,
              businessType: text(v.businessType),
              businessSize: text(v.businessSize)?.toUpperCase() ?? null,
              capitalMin: money(v.capitalMin),
              capitalMax: money(v.capitalMax),
              currency: (v.currency || "UGX").toUpperCase().slice(0, 3),
              profitPotential: text(v.profitPotential)?.toUpperCase() ?? null,
              setupTime: text(v.setupTime),
              locationNotes: text(v.locationNotes),
              keyRequirements: text(v.keyRequirements),
              pictureUrl: text(v.pictureUrl),
            },
          });
        } else if (kind === "SUPPLIER") {
          // A supplier is a content item plus the organisation behind it; the schema requires both.
          const org = await tx.organization.create({
            data: { legalName: title, tradingName: title, accountType: "SUPPLIER", description: text(v.shortSummary), website: text(v.website) },
            select: { id: true },
          });
          await tx.supplier.create({
            data: {
              contentItemId: item.id,
              organizationId: org.id,
              country: text(v.country),
              items: list(v.items),
              email: text(v.email),
              phone: text(v.phone),
              whatsapp: text(v.whatsapp),
              contactPerson: text(v.contactPerson),
              website: text(v.website),
              supplierType: (text(v.supplierType) as never) ?? null,
              minimumOrder: text(v.minimumOrder),
            },
          });
        } else {
          await tx.consultant.create({
            data: {
              contentItemId: item.id,
              fullName: title,
              businessName: text(v.businessName),
              professionalTitle: text(v.professionalTitle),
              specialties: list(v.specialties),
              languages: list(v.languages),
              country: text(v.country),
              district: text(v.district),
              email: text(v.email),
              phone: text(v.phone),
              website: text(v.website),
            },
          });
        }
      });
      saved++;
    } catch (e) {
      const reason = e instanceof Error ? e.message : "Could not be saved";
      // Prisma's messages run to many lines; the first is the useful one.
      failed.push({ title, reason: reason.split("\n")[0].slice(0, 160) });
    }
  }

  revalidatePath("/admin/content");
  return { saved, failed };
}
