import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({
  accountType: z.enum(["SUPPLIER", "MACHINE_DEALER", "CONSULTANCY", "FUNDING_PROVIDER", "SERVICE_PROVIDER"]),
  name: z.string().trim().min(2, "Enter your full name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z.string().trim().regex(/^\+?256\d{9}$|^0\d{9}$/, "Enter a Ugandan phone number, e.g. +256 7XX XXX XXX"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  legalName: z.string().trim().min(2, "Enter the registered business name"),
  registrationNumber: z.string().trim().optional(),
  district: z.string().trim().optional(),
  physicalAddress: z.string().trim().optional(),
  offers: z.string().trim().optional(),
  description: z.string().trim().max(1000).optional(),
  whatsapp: z.string().trim().optional(),
  website: z.string().trim().url().optional().or(z.literal("")),
  plan: z.enum(["business_basic", "business_featured", "business_premium"]),
  consent: z.literal(true, { errorMap: () => ({ message: "Please confirm the details and accept the terms" }) }),
});

/**
 * Self sign-up for businesses. Creates the owner user (CONTRIBUTOR), a PENDING
 * organization and a NEW_BUSINESS submission for the admin review queue.
 * Verification document uploads should be added with a private file store.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;

  if (await prisma.user.findUnique({ where: { email: d.email } })) {
    return NextResponse.json({ errors: { email: ["An account with this email already exists. Sign in instead."] } }, { status: 409 });
  }

  // Duplicate check (case-insensitive) is flagged for editors, not blocked.
  const similar = await prisma.organization.findFirst({ where: { legalName: { equals: d.legalName, mode: "insensitive" } }, select: { id: true } });
  const location = d.district ? await prisma.location.findFirst({ where: { name: d.district, type: "DISTRICT" } }) : null;
  const plan = await prisma.membershipPlan.findUnique({ where: { code: d.plan } });

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: d.name, email: d.email, phone: d.phone, role: "CONTRIBUTOR", passwordHash: await bcrypt.hash(d.password, 10) },
    });
    const org = await tx.organization.create({
      data: {
        legalName: d.legalName,
        accountType: d.accountType,
        registrationNumber: d.registrationNumber || null,
        description: d.description || null,
        website: d.website || null,
        status: "PENDING",
        members: { create: { userId: user.id, role: "OWNER" } },
        locations: { create: { locationId: location?.id, physicalAddress: d.physicalAddress || null, isPrimary: true } },
        contacts: { create: { personName: d.name, email: d.email, phone: d.phone, whatsapp: d.whatsapp || null, isPrimary: true } },
      },
    });
    if (plan) {
      // Paid plans start after approval and payment; create as TRIAL placeholder.
      await tx.subscription.create({ data: { organizationId: org.id, planId: plan.id, status: plan.priceMonthly && Number(plan.priceMonthly) > 0 ? "TRIAL" : "ACTIVE" } });
    }
    await tx.submission.create({
      data: { type: "NEW_BUSINESS", organizationId: org.id, submittedById: user.id, payload: { offers: d.offers ?? null, possibleDuplicateOf: similar?.id ?? null, plan: d.plan } },
    });
    return { userId: user.id, orgId: org.id };
  });

  await audit(result.userId, "business.signup", "organization", result.orgId);
  return NextResponse.json({ ok: true }, { status: 201 });
}
