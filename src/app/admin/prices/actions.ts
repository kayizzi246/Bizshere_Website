"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { SITE_DATA } from "@/lib/cached";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/access";
import { audit } from "@/lib/audit";

const money = z.preprocess((v) => (v === "" || v === null ? undefined : String(v).replace(/[,\s]/g, "")), z.coerce.number().nonnegative().optional());
const intOpt = z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().nonnegative().optional());
const tri = z.preprocess((v) => (v === "" || v === undefined ? undefined : v === "true"), z.boolean().optional());

const observationSchema = z.object({
  marketId: z.string().min(1),
  productId: z.string().min(1),
  observedAt: z.coerce.date(),
  priceType: z.enum(["RETAIL", "WHOLESALE", "FARM_GATE"]),
  priceMin: money,
  priceMax: money,
  currency: z.string().regex(/^[A-Z]{3}$/).default("UGX"),
  quotedUnit: z.string().trim().min(1),
  grade: z.string().trim().optional(),
  packageSize: z.string().trim().optional(),
  quoteCount: intOpt,
  collectionMethod: z.string().trim().optional(),
  includesTax: tri,
  includesTransport: tri,
  notes: z.string().trim().optional(),
  publish: z.boolean(),
})
  .refine((d) => d.priceMin !== undefined || d.priceMax !== undefined, { message: "Enter at least one price", path: ["priceMin"] })
  .refine((d) => d.priceMin === undefined || d.priceMax === undefined || d.priceMin <= d.priceMax, { message: "Min price can't be above highest", path: ["priceMax"] })
  .refine((d) => d.observedAt <= new Date(), { message: "Observation date can't be in the future", path: ["observedAt"] });

/** Adds a dated observation. Observations are never edited in place: history is kept (blueprint 12). */
export async function addObservation(form: FormData) {
  const editor = await requireStaff();
  const parsed = observationSchema.safeParse({ ...Object.fromEntries(form), publish: form.get("publish") === "on" });
  if (!parsed.success) redirect(`/admin/prices?error=${encodeURIComponent(Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid input")}`);
  const { publish, ...d } = parsed.data;
  const obs = await prisma.priceObservation.create({
    data: {
      ...d, grade: d.grade || null, packageSize: d.packageSize || null, collectionMethod: d.collectionMethod || null, notes: d.notes || null,
      collectedAt: new Date(), collectorId: editor.id,
      status: publish ? "PUBLISHED" : "IN_REVIEW",
      verificationResult: publish ? "PASSED" : "NOT_CHECKED",
    },
  });
  if (!publish) await prisma.submission.create({ data: { type: "PRICE_OBSERVATION", priceObservationId: obs.id, submittedById: editor.id } });
  await audit(editor.id, "price.added", "price_observation", obs.id, { publish });
  revalidatePath("/admin/prices");
  revalidateTag(SITE_DATA);
  revalidatePath("/prices");
  revalidateTag(SITE_DATA);
  redirect("/admin/prices?added=1");
}

export async function addMarket(form: FormData) {
  const editor = await requireStaff();
  const name = String(form.get("name") ?? "").trim();
  if (!name) redirect("/admin/prices?error=Market+name+required");
  const m = await prisma.market.create({ data: { name, marketType: String(form.get("marketType") ?? "") || null, locationId: String(form.get("locationId") ?? "") || null, town: String(form.get("town") ?? "") || null } });
  await audit(editor.id, "market.created", "market", m.id);
  revalidatePath("/admin/prices");
  revalidateTag(SITE_DATA);
}

export async function addProduct(form: FormData) {
  const editor = await requireStaff();
  const name = String(form.get("name") ?? "").trim();
  if (!name) redirect("/admin/prices?error=Product+name+required");
  const s = (k: string) => String(form.get(k) ?? "").trim() || null;
  const p = await prisma.product.create({ data: { name, variety: s("variety"), grade: s("grade"), standardUnit: s("standardUnit"), localNames: (s("localNames") ?? "").split(",").map((x) => x.trim()).filter(Boolean) } });
  await audit(editor.id, "product.created", "product", p.id);
  revalidatePath("/admin/prices");
  revalidateTag(SITE_DATA);
}
