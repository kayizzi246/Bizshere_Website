"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { z } from "zod";
import type { CheckResult, CheckType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireStaff } from "@/lib/access";
import { audit } from "@/lib/audit";

const CHECKS: CheckType[] = ["BUSINESS_CONTACT", "REGISTRATION", "PHYSICAL_ADDRESS", "PRICE_EVIDENCE"];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

/**
 * Records verification checks and the decision for one submission.
 * Each check is stored separately with date, editor and evidence (blueprint section 03).
 */
export async function decideSubmission(form: FormData) {
  const editor = await requireStaff();
  const id = String(form.get("id"));
  const decision = String(form.get("decision")) as "APPROVED" | "CHANGES_REQUESTED" | "REJECTED";
  const note = String(form.get("note") ?? "").trim();
  if (!["APPROVED", "CHANGES_REQUESTED", "REJECTED"].includes(decision)) throw new Error("Invalid decision");
  if (decision !== "APPROVED" && !note) redirect(`/admin/review/${id}?error=note`);

  const sub = await prisma.submission.findUniqueOrThrow({ where: { id }, include: { organization: { include: { supplier: true } }, supplierOffer: true } });

  await prisma.$transaction(async (tx) => {
    let contentItemId: string | null = sub.contentItemId;

    if (sub.type === "NEW_BUSINESS" && sub.organization) {
      const org = sub.organization;
      if (decision === "APPROVED") {
        await tx.organization.update({ where: { id: org.id }, data: { status: "ACTIVE" } });
        // Create the public supplier profile for supplier-type accounts.
        if (!org.supplier && (org.accountType === "SUPPLIER" || org.accountType === "MACHINE_DEALER")) {
          const item = await tx.contentItem.create({
            data: {
              contentType: "SUPPLIER", title: org.tradingName ?? org.legalName, slug: `${slugify(org.legalName)}-${org.id.slice(-5)}`,
              shortSummary: org.description, publicationStatus: "PUBLISHED", publishedAt: new Date(), lastReviewedAt: new Date(),
              nextReviewDueAt: new Date(Date.now() + 365 * 86_400_000), reviewedById: editor.id,
            },
          });
          await tx.supplier.create({ data: { contentItemId: item.id, organizationId: org.id, listingClaimed: true } });
          contentItemId = item.id;
        } else if (org.supplier) {
          contentItemId = org.supplier.contentItemId;
        }
      } else if (decision === "REJECTED") {
        await tx.organization.update({ where: { id: org.id }, data: { status: "SUSPENDED" } });
      }
    }

    if (sub.type === "SUPPLIER_OFFER" && sub.supplierOfferId) {
      await tx.supplierOffer.update({ where: { id: sub.supplierOfferId }, data: { status: decision === "APPROVED" ? "PUBLISHED" : decision === "REJECTED" ? "ARCHIVED" : "DRAFT" } });
    }
    if (sub.type === "PRICE_OBSERVATION" && sub.priceObservationId) {
      await tx.priceObservation.update({ where: { id: sub.priceObservationId }, data: { status: decision === "APPROVED" ? "PUBLISHED" : "ARCHIVED", verificationResult: decision === "APPROVED" ? "PASSED" : "FAILED" } });
    }

    // Verification checks
    if (contentItemId) {
      for (const type of CHECKS) {
        const result = form.get(`check_${type}`) as CheckResult | null;
        if (!result || result === "NOT_CHECKED") continue;
        const due = String(form.get(`due_${type}`) ?? "");
        await tx.verificationCheck.create({
          data: {
            contentItemId, checkType: type, result, checkedById: editor.id,
            evidenceNotes: String(form.get(`evidence_${type}`) ?? "") || null,
            reviewDueAt: due ? new Date(due) : new Date(Date.now() + 365 * 86_400_000),
          },
        });
      }
    }

    await tx.submission.update({ where: { id }, data: { status: decision, decisionNote: note || null, decidedAt: new Date(), assignedToId: editor.id, contentItemId } });
    await tx.moderationEvent.create({ data: { submissionId: id, actorId: editor.id, fromStatus: sub.status, toStatus: decision, note: note || null } });
    if (sub.submittedById && sub.submittedById !== editor.id) {
      const title = { APPROVED: "Your submission was approved", CHANGES_REQUESTED: "Changes requested on your submission", REJECTED: "Your submission was not approved" }[decision];
      await tx.alert.create({ data: { userId: sub.submittedById, kind: "SUBMISSION", title, body: note || null, link: "/business" } });
    }
  });

  await audit(editor.id, `submission.${decision.toLowerCase()}`, "submission", id, { type: sub.type });
  revalidatePath("/admin");
  revalidatePath("/admin/review");
  redirect(`/admin/review?done=${decision}`);
}

const createSchema = z.object({
  kind: z.enum(["MEMBER", "EDITOR", "ADMIN", "SUPPLIER", "MACHINE_DEALER", "CONSULTANCY", "FUNDING_PROVIDER", "SERVICE_PROVIDER"]),
  name: z.string().trim().min(2),
  orgName: z.string().trim().optional(),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().optional(),
  district: z.string().optional(),
  sendToReview: z.boolean(),
});

/**
 * Admin creates an account for a business that asked to join by phone or in person,
 * or for a staff member. A random password is set; the person should use a
 * password reset / invite email (wire up an email provider) to choose their own.
 */
export async function createAccount(form: FormData) {
  const admin = await requireAdmin();
  const parsed = createSchema.safeParse({ ...Object.fromEntries(form), sendToReview: form.get("sendToReview") === "on" });
  if (!parsed.success) redirect("/admin/users?create=1&error=invalid");
  const d = parsed.data;
  if (await prisma.user.findUnique({ where: { email: d.email } })) redirect("/admin/users?create=1&error=exists");

  const isBusiness = !["MEMBER", "EDITOR", "ADMIN"].includes(d.kind);
  const tempPassword = crypto.randomBytes(12).toString("base64url");
  const user = await prisma.user.create({
    data: {
      name: d.name, email: d.email, phone: d.phone || null,
      role: d.kind === "EDITOR" ? "EDITOR" : d.kind === "ADMIN" ? "ADMIN" : isBusiness ? "CONTRIBUTOR" : "USER",
      passwordHash: await bcrypt.hash(tempPassword, 10),
    },
  });
  if (isBusiness) {
    const location = d.district ? await prisma.location.findFirst({ where: { name: d.district, type: "DISTRICT" } }) : null;
    const org = await prisma.organization.create({
      data: {
        legalName: d.orgName || d.name,
        accountType: d.kind as "SUPPLIER" | "MACHINE_DEALER" | "CONSULTANCY" | "FUNDING_PROVIDER" | "SERVICE_PROVIDER",
        status: "PENDING",
        members: { create: { userId: user.id, role: "OWNER" } },
        contacts: { create: { personName: d.name, email: d.email, phone: d.phone || null, isPrimary: true } },
        locations: { create: { locationId: location?.id, isPrimary: true } },
      },
    });
    if (d.sendToReview) {
      await prisma.submission.create({ data: { type: "NEW_BUSINESS", organizationId: org.id, submittedById: admin.id, payload: { createdByAdmin: true } } });
    }
  }
  await audit(admin.id, "user.created", "user", user.id, { kind: d.kind });
  // TODO: send invite email with a password-set link instead of a temporary password.
  revalidatePath("/admin/users");
  redirect(`/admin/users?created=${user.id}`);
}

export async function setSuspended(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id"));
  const suspend = form.get("suspend") === "1";
  if (id === admin.id) redirect("/admin/users?error=self");
  await prisma.user.update({ where: { id }, data: { isSuspended: suspend } });
  await audit(admin.id, suspend ? "user.suspended" : "user.restored", "user", id);
  revalidatePath("/admin/users");
  redirect(`/admin/users?user=${id}`);
}

export async function changeRole(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id"));
  const role = z.enum(["USER", "CONTRIBUTOR", "EDITOR", "ADMIN"]).parse(form.get("role"));
  await prisma.user.update({ where: { id }, data: { role } });
  await audit(admin.id, "user.role_changed", "user", id, { role });
  revalidatePath("/admin/users");
  redirect(`/admin/users?user=${id}`);
}

export async function sendForReReview(form: FormData) {
  const editor = await requireStaff();
  const ids = form.getAll("ids").map(String);
  if (ids.length) {
    await prisma.contentItem.updateMany({ where: { id: { in: ids } }, data: { publicationStatus: "IN_REVIEW" } });
    await audit(editor.id, "content.sent_for_review", "content_item", undefined, { ids });
  }
  revalidatePath("/admin/content");
}

/** Records one verification check directly from the content editor. */
export async function recordCheck(form: FormData) {
  const editor = await requireStaff();
  const contentItemId = String(form.get("contentItemId"));
  const checkType = z.enum(["BUSINESS_CONTACT", "REGISTRATION", "PHYSICAL_ADDRESS", "IDENTITY", "CREDENTIAL", "PROFESSIONAL_REGISTRATION", "OFFICIAL_TERMS", "PRICE_EVIDENCE", "LINK"]).parse(form.get("checkType"));
  const result = z.enum(["PASSED", "FAILED"]).parse(form.get("result"));
  const due = String(form.get("reviewDueAt") ?? "");
  await prisma.verificationCheck.create({
    data: {
      contentItemId, checkType, result, checkedById: editor.id,
      evidenceNotes: String(form.get("evidenceNotes") ?? "") || null,
      reviewDueAt: due ? new Date(due) : new Date(Date.now() + 365 * 86_400_000),
    },
  });
  await audit(editor.id, "check.recorded", "content_item", contentItemId, { checkType, result });
  revalidatePath(`/admin/content/${contentItemId}`);
}

/** Accept or reject a reader's correction report. Accepting marks the page for re-review. */
export async function decideCorrection(form: FormData) {
  const editor = await requireStaff();
  const id = String(form.get("id"));
  const decision = z.enum(["APPROVED", "REJECTED"]).parse(form.get("decision"));
  const note = String(form.get("note") ?? "").trim() || null;
  const report = await prisma.correctionReport.findUniqueOrThrow({ where: { id } });
  await prisma.$transaction([
    prisma.correctionReport.update({ where: { id }, data: { status: decision, decisionNote: note, decidedById: editor.id, decidedAt: new Date() } }),
    prisma.moderationEvent.create({ data: { correctionReportId: id, actorId: editor.id, fromStatus: report.status, toStatus: decision, note } }),
    ...(decision === "APPROVED" ? [prisma.contentItem.update({ where: { id: report.contentItemId }, data: { nextReviewDueAt: new Date() } })] : []),
    ...(report.reporterId ? [prisma.alert.create({ data: { userId: report.reporterId, kind: "SUBMISSION", title: decision === "APPROVED" ? "Thanks: your correction was accepted" : "Your correction report was reviewed", body: note, contentItemId: report.contentItemId } })] : []),
  ]);
  await audit(editor.id, `correction.${decision.toLowerCase()}`, "correction_report", id);
  revalidatePath("/admin/corrections");
}

export async function archiveContent(form: FormData) {
  const editor = await requireStaff();
  const ids = form.getAll("ids").map(String);
  if (ids.length) {
    await prisma.contentItem.updateMany({ where: { id: { in: ids } }, data: { publicationStatus: "ARCHIVED" } });
    await audit(editor.id, "content.archived", "content_item", undefined, { ids });
  }
  revalidatePath("/admin/content");
}
