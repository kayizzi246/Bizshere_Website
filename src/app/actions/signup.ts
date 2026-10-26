"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z.string().trim().max(30).optional(),
  password: z.string().min(8, "Use at least 8 characters"),
});

export type SignupResult = { ok?: boolean; errors?: Record<string, string | undefined> };

/** Free account for individuals (role USER). Membership is added later from /membership. */
export async function createFreeAccount(form: FormData): Promise<SignupResult> {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const e = parsed.error.flatten().fieldErrors;
    return { errors: Object.fromEntries(Object.entries(e).map(([k, v]) => [k, v?.[0]])) };
  }
  const d = parsed.data;
  if (await prisma.user.findUnique({ where: { email: d.email } })) {
    return { errors: { email: "An account with this email already exists. Sign in instead." } };
  }
  const user = await prisma.user.create({
    data: { name: d.name, email: d.email, phone: d.phone || null, role: "USER", passwordHash: await bcrypt.hash(d.password, 10) },
  });
  await audit(user.id, "user.signed_up", "user", user.id);
  return { ok: true };
}
