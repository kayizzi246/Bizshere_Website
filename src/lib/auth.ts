import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { audit } from "./audit";
import { normalizePhone } from "./phone";
import { phoneKey, verifyCode } from "./phone-codes";

// `identifier` is an email address or a phone number. `email` is still accepted
// for older forms that post it under that name.
const credentialsSchema = z.object({
  identifier: z.string().trim().min(1).optional(),
  email: z.string().trim().min(1).optional(),
  password: z.string().min(1),
});

/** Google sign-in is offered only once GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set. */
export const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const authOptions: NextAuthOptions = {
  // No sign-out in the site: a person stays signed in on their device for a year, so a
  // subscriber keeps their access. On a new device they enter their number again.
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
        const user = id.includes("@")
          ? await prisma.user.findUnique({ where: { email: id.toLowerCase() } })
          : phone ? await prisma.user.findUnique({ where: { phone } }) : null;
        if (!user || !user.passwordHash || user.isSuspended) return null;
        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;
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

export function getSession() {
  return getServerSession(authOptions);
}
