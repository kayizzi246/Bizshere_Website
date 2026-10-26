"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMyOrganization } from "@/lib/business";
import { audit } from "@/lib/audit";

const money = z.preprocess((v) => (v === "" || v === null ? undefined : String(v).replace(/[,\s]/g, "")), z.coerce.number().nonnegative().optional());
const dateOpt = z.preprocess((v) => (v === "" ? undefined : v), z.coerce.date().optional());
const intOpt = z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().nonnegative().optional());

const offerSchema = z
  .object({
    machineId: z.string().min(1, "Choose a machine"),
    condition: z.enum(["NEW", "USED", "REFURBISHED"]),
    priceMin: money,
    priceMax: money,
    quotedAt: dateOpt,
    validUntil: dateOpt,
    deliveryCharge: money,
    warrantyMonths: intOpt,
    leadTime: z.string().optional(),
    availability: z.string().optional(),
    installationSupport: z.boolean(),
    trainingSupport: z.boolean(),
    sparePartsLocal: z.boolean(),
  })
  .refine((d) => d.priceMin === undefined || d.priceMax === undefined || d.priceMin <= d.priceMax, { message: "Lowest price can't be above highest price", path: ["priceMax"] })
  .refine((d) => !d.quotedAt || !d.validUntil || d.quotedAt <= d.validUntil, { message: "'Valid until' must be after the quote date", path: ["validUntil"] });

export type OfferState = { errors?: Record<string, string[] | undefined> };

/** Business submits a machine offer. It goes to the review queue, never straight live. */
export async function submitOffer(_prev: OfferState, form: FormData): Promise<OfferState> {
  const { user, org } = await getMyOrganization();
  if (!org.supplier) return { errors: { form: ["Your supplier profile is still being set up by our editors."] } };

  const parsed = offerSchema.safeParse({
    ...Object.fromEntries(form),
    installationSupport: form.get("installationSupport") === "on",
    trainingSupport: form.get("trainingSupport") === "on",
    sparePartsLocal: form.get("sparePartsLocal") === "on",
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;

  const offer = await prisma.supplierOffer.create({
    data: {
      machineId: d.machineId,
      supplierId: org.supplier.id,
      condition: d.condition,
      priceMin: d.priceMin,
      priceMax: d.priceMax,
      quotedAt: d.quotedAt,
      validUntil: d.validUntil,
      deliveryCharge: d.deliveryCharge,
      warrantyMonths: d.warrantyMonths,
      leadTime: d.leadTime || null,
      availability: d.availability || null,
      installationSupport: d.installationSupport,
      trainingSupport: d.trainingSupport,
      sparePartsLocal: d.sparePartsLocal,
      status: "IN_REVIEW",
    },
  });
  await prisma.submission.create({ data: { type: "SUPPLIER_OFFER", supplierOfferId: offer.id, organizationId: org.id, submittedById: user.id } });
  await audit(user.id, "offer.submitted", "supplier_offer", offer.id);
  revalidatePath("/business");
  redirect("/business");
}
