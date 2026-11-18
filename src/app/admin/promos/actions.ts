"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireArea } from "@/lib/access";
import { audit } from "@/lib/audit";
import { PLAN_PERIODS } from "@/lib/billing";
import { normalizeCode } from "@/lib/promos";
import { NUMBER_SETTINGS, setSetting, type NumberSetting } from "@/lib/settings";

/** Discount codes, and the numbers behind the free pass and invites (Admin > Offers and codes). */

// Date inputs give YYYY-MM-DD: a start date opens at 00:00 Kampala, an end date runs to the end of that day.
const day = (edge: "start" | "end") =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : `${v}T${edge === "start" ? "00:00:00.000" : "23:59:59.999"}+03:00`),
    z.coerce.date().optional(),
  );

const codeSchema = z
  .object({
    code: z.preprocess((v) => normalizeCode(String(v ?? "")), z.string().min(3, "A code needs at least 3 letters or numbers").max(32)),
    kind: z.enum(["PERCENT", "AMOUNT"]),
    value: z.coerce.number({ invalid_type_error: "The amount must be a number" }).positive("The amount must be more than 0"),
    periods: z.array(z.enum(PLAN_PERIODS)),
    maxRedemptions: z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), z.coerce.number().int().positive("The number of uses must be 1 or more").optional()),
    startsAt: day("start"),
    expiresAt: day("end"),
    note: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 200) : undefined), z.string().optional()),
  })
  .refine((d) => d.kind !== "PERCENT" || d.value <= 100, { message: "A percentage can't be more than 100", path: ["value"] })
  .refine((d) => !d.startsAt || !d.expiresAt || d.startsAt <= d.expiresAt, { message: "The end date can't be before the start date", path: ["expiresAt"] });

const fail = (message: string) => redirect(`/admin/promos?error=${encodeURIComponent(message)}`);

export async function createPromo(form: FormData) {
  const staff = await requireArea("promos");
  const parsed = codeSchema.safeParse({
    ...Object.fromEntries(form),
    periods: PLAN_PERIODS.filter((p) => form.get(`period-${p}`) === "on"),
  });
  if (!parsed.success) fail(Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Check the code and try again");
  const d = parsed.data!;
  const exists = await prisma.promoCode.findUnique({ where: { code: d.code }, select: { id: true } });
  if (exists) fail(`The code ${d.code} already exists.`);
  const created = await prisma.promoCode.create({
    data: {
      code: d.code, kind: d.kind, value: d.value, periods: d.periods,
      maxRedemptions: d.maxRedemptions ?? null, startsAt: d.startsAt ?? null, expiresAt: d.expiresAt ?? null, note: d.note ?? null,
    },
  });
  await audit(staff.id, "promo.created", "promo_code", created.id, { code: d.code, kind: d.kind, value: d.value });
  revalidatePath("/admin/promos");
  redirect("/admin/promos?added=1");
}

/** Turns a code off (or back on). A code that is off is refused at once, wherever it was printed. */
export async function togglePromo(form: FormData) {
  const staff = await requireArea("promos");
  const id = String(form.get("id") ?? "");
  const promo = await prisma.promoCode.findUnique({ where: { id }, select: { isActive: true, code: true } });
  if (!promo) fail("That code no longer exists.");
  await prisma.promoCode.update({ where: { id }, data: { isActive: !promo!.isActive } });
  await audit(staff.id, promo!.isActive ? "promo.disabled" : "promo.enabled", "promo_code", id, { code: promo!.code });
  revalidatePath("/admin/promos");
  redirect("/admin/promos?saved=1");
}

/**
 * Deletes a code that was never used. A code that has been used is kept, so the payments it
 * belongs to still show what the discount was; turn it off instead.
 */
export async function deletePromo(form: FormData) {
  const staff = await requireArea("promos");
  const id = String(form.get("id") ?? "");
  const used = await prisma.promoRedemption.count({ where: { promoCodeId: id } });
  if (used) fail("That code has been used, so it is kept for the payment records. Turn it off instead.");
  const promo = await prisma.promoCode.findUnique({ where: { id }, select: { code: true } });
  await prisma.promoCode.delete({ where: { id } }).catch(() => fail("That code no longer exists."));
  await audit(staff.id, "promo.deleted", "promo_code", id, { code: promo?.code });
  revalidatePath("/admin/promos");
  redirect("/admin/promos?deleted=1");
}

/** The free pass length, the free days an invite gives, and how big a price move is texted. */
export async function saveOfferSettings(form: FormData) {
  const staff = await requireArea("promos");
  const saved: Record<string, number> = {};
  for (const key of Object.keys(NUMBER_SETTINGS) as NumberSetting[]) {
    const raw = form.get(key);
    if (raw === null || raw === "") continue;
    const n = Number(raw);
    if (!Number.isFinite(n)) fail(`${NUMBER_SETTINGS[key].label} must be a number.`);
    saved[key] = await setSetting(key, n);
  }
  await audit(staff.id, "settings.offers_saved", "system", undefined, saved);
  revalidatePath("/admin/promos");
  redirect("/admin/promos?saved=1");
}
