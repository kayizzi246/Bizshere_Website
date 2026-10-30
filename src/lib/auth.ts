import type { NextAuthOptions } from "next-auth";
import { cache } from "react";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { audit } from "./audit";
import { normalizePhone } from "./phone";
import { isTestPhone, phoneKey, verifyCode } from "./phone-codes";

// `identifier` is an email address or a phone number. `email` is still accepted
// for older forms that post it under that name.
const credentialsSchema = z.object({
  identifier: z.string().trim().min(1).optional(),
  email: z.string().trim().min(1).optional(),
  password: z.string().min(1),
});

/** Google sign-in is offered only once GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set. */
export const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

// ── Security settings ──
/** Wrong passwords allowed per email or phone before sign-in is paused. */
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;
/** Staff sessions last a working day; members stay signed in (see session.maxAge). */
export const STAFF_SESSION_HOURS = 12;
/** How often a session re-reads its role and suspension from the database. */
const RECHECK_MINUTES = 5;

const isStaffRole = (r?: Role | null) => r === "ADMIN" || r === "EDITOR";

/** Failed password sign-ins for this email or phone in the lockout window. */
function recentFailures(key: string) {
  return prisma.auditLog.count({ where: { action: "auth.login_failed", entityId: key, createdAt: { gte: new Date(Date.now() - LOCKOUT_MINUTES * 60_000) } } });
}

export const authOptions: NextAuthOptions = {
  // Members stay signed in on their device for a year, so a subscriber keeps their access;
  // on a new device they enter their number again. Staff sessions end after STAFF_SESSION_HOURS,
  // and every session re-reads its role every few minutes (see the jwt callback).
  session: { strategy: "jwt", maxAge: 365 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email or phone and password",
      credentials: {
        identifier: { label: "Email or phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const id = parsed.data.identifier ?? parsed.data.email;
        if (!id) return null;
        const phone = id.includes("@") ? null : normalizePhone(id);
        const key = (phone ?? id).toLowerCase();
        // Too many wrong passwords recently: refuse without checking, so guessing is slow.
        if ((await recentFailures(key)) >= MAX_FAILED_LOGINS) {
          await audit(null, "auth.login_blocked", "login", key);
          return null;
        }
        const user = id.includes("@")
          ? await prisma.user.findUnique({ where: { email: id.toLowerCase() } })
          : phone ? await prisma.user.findUnique({ where: { phone } }) : null;
        const ok = Boolean(user?.passwordHash && !user.isSuspended && (await bcrypt.compare(parsed.data.password, user.passwordHash)));
        if (!user || !ok) {
          await audit(user?.id ?? null, "auth.login_failed", "login", key);
          return null;
        }
        if (isStaffRole(user.role)) await audit(user.id, "auth.staff_login", "user", user.id);
        await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
    // Passwordless: phone number + one-time code. Creates the account on first sign-in.
    CredentialsProvider({
      id: "phone",
      name: "Phone and code",
      credentials: { phone: { label: "Phone", type: "tel" }, code: { label: "Code", type: "text" } },
      async authorize(raw) {
        const phone = phoneKey(String(raw?.phone ?? ""));
        if (!phone || !(await verifyCode(phone, String(raw?.code ?? "")))) return null;
        let user = await prisma.user.findUnique({ where: { phone } });
        if (!user) {
          user = await prisma.user.create({ data: { name: phone, phone, role: "USER" } });
          await audit(user.id, "user.signed_up", "user", user.id, { via: "phone" });
        }
        if (user.isSuspended) return null;
        // Demo account (OTP_TEST_PHONE): give it active member access so the owner can preview
        // paid pages on the live site. Only ever reached when the test env vars are set.
        if (isTestPhone(phone)) await ensureDemoMembership(user.id);
        await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
    ...(googleEnabled
      ? [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! })]
      : []),
  ],
  callbacks: {
    /** Google: create a free account the first time, refuse suspended accounts. */
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      const email = user.email?.toLowerCase();
      if (!email) return false;
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return !existing.isSuspended;
      const created = await prisma.user.create({ data: { name: user.name || email.split("@")[0], email, role: "USER" } });
      await audit(created.id, "user.signed_up", "user", created.id, { via: "google" });
      return true;
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "google" && token.email) {
        // Google's own user id is not ours: look up our account by email.
        const u = await prisma.user.findUnique({ where: { email: token.email.toLowerCase() } });
        if (u) {
          token.id = u.id;
          token.role = u.role;
          await prisma.user.update({ where: { id: u.id }, data: { lastActiveAt: new Date() } });
        }
      } else if (user) {
        token.id = user.id;
        token.role = (user as unknown as { role: Role }).role;
      }
      const now = Date.now();
      if (user) {
        // Fresh sign-in: start the clocks.
        token.checkedAt = now;
        token.staffUntil = isStaffRole(token.role) ? now + STAFF_SESSION_HOURS * 3_600_000 : undefined;
        return token;
      }
      if (!token.id) return token;
      // A staff session past its working day is ended.
      if (isStaffRole(token.role) && (!token.staffUntil || token.staffUntil < now)) return {};
      // Every few minutes, re-read the account: a suspended or deleted account is signed out,
      // and a role change (for example an admin made an editor) takes effect.
      if (!token.checkedAt || now - token.checkedAt > RECHECK_MINUTES * 60_000) {
        const u = await prisma.user.findUnique({ where: { id: token.id }, select: { role: true, isSuspended: true } });
        if (!u || u.isSuspended) return {};
        if (isStaffRole(u.role) && !isStaffRole(token.role)) return {}; // promoted to staff: sign in again at /login
        token.role = u.role;
        token.checkedAt = now;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
};

/** Once per request (React cache): many components ask for the session. */
export const getSession = cache(() => getServerSession(authOptions));

/**
 * Gives the demo account an active subscription to the paid "member" plan, so the owner can see
 * full detail on the live site. No-op if the plan is missing or the demo is already subscribed.
 */
async function ensureDemoMembership(userId: string) {
  const plan = await prisma.membershipPlan.findUnique({ where: { code: "member" }, select: { id: true } });
  if (!plan) return;
  const active = await prisma.subscription.findFirst({ where: { userId, planId: plan.id, status: "ACTIVE" } });
  if (active) return;
  await prisma.subscription.create({ data: { userId, planId: plan.id, status: "ACTIVE", currentPeriodEnd: null } });
}
