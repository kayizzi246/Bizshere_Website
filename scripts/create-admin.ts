/**
 * Creates a super admin, or resets an existing account to super admin with a new password.
 * For the first admin, or when every admin has lost their password. Runs against the database in
 * DATABASE_URL: your local one, or the live one if you point it there for this run.
 *
 *   npm run admin:create -- <email> <password> [phone]
 *   npm run admin:create -- owner@bizsphere.ug "a long password here" 0772123456
 *
 * With a phone, signing in also needs the code texted to it (src/lib/auth.ts). The password must be
 * at least 12 characters. Sign in afterwards at /staff/<ADMIN_LOGIN_KEY>, or /login?callbackUrl=/admin.
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { phoneKey } from "../src/lib/phone-codes";

const prisma = new PrismaClient();

async function main() {
  const [rawEmail, password, rawPhone] = process.argv.slice(2);
  const email = rawEmail?.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !password) {
    throw new Error('Usage: npm run admin:create -- <email> <password> [phone]   e.g. owner@bizsphere.ug "a long password" 0772123456');
  }
  if (password.length < 12) throw new Error("Use a password of at least 12 characters.");
  const phone = rawPhone ? phoneKey(rawPhone) : null;
  if (rawPhone && !phone) throw new Error(`"${rawPhone}" is not a valid phone number, e.g. 0772 123 456.`);
  if (phone) {
    const other = await prisma.user.findFirst({ where: { phone, NOT: { email } }, select: { email: true } });
    if (other) throw new Error(`That phone already belongs to another account (${other.email ?? "a phone-only account"}). Use another, or leave it out.`);
  }

  const data = { role: "ADMIN" as const, adminAreas: [], isSuspended: false, passwordHash: await bcrypt.hash(password, 10), ...(phone ? { phone } : {}) };
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  const user = existing
    ? await prisma.user.update({ where: { email }, data })
    : await prisma.user.create({ data: { ...data, name: "Super admin", email } });
  // Clear any wrong-password pause on it, and record who changed what.
  await prisma.auditLog.deleteMany({ where: { action: "auth.login_failed", entityId: { in: [email, ...(phone ? [phone] : [])] } } });
  await prisma.auditLog.create({ data: { action: existing ? "staff.reset_by_script" : "staff.created_by_script", entityType: "user", entityId: user.id } });

  const host = (process.env.DATABASE_URL ?? "").replace(/^.*@/, "").replace(/[/?].*$/, "");
  console.log(`${existing ? "Reset" : "Created"} super admin ${email}${phone ? `, sign-in codes to ${phone}` : " (no phone: password only)"}, on database ${host}.`);
  console.log("Sign in at /staff/<ADMIN_LOGIN_KEY>, or /login?callbackUrl=/admin.");
}

main().catch((e) => { console.error(e.message); process.exit(1); }).finally(() => prisma.$disconnect());
