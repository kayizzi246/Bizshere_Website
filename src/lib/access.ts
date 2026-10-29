import type { Role } from "@prisma/client";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "./auth";
import { prisma } from "./prisma";

/**
 * Server-side access rules.
 *
 * IMPORTANT: member-only data must be removed on the server before rendering.
 * Never send it to the browser and hide it with CSS. Pages call getViewer() and
 * only query or pass the detailed fields when viewer.isMember is true.
 */
export type Viewer = {
  userId: string | null;
  name: string | null;
  role: Role | null;
  isMember: boolean; // can see full detail, contacts, downloads
  isStaff: boolean; // editor or admin
};

type Entitlements = { fullDetail?: boolean; contacts?: boolean };

/** Once per request: the header, the page and its components all call this. */
export const getViewer = cache(async function getViewer(): Promise<Viewer> {
  const session = await getSession();
  if (!session?.user?.id) return { userId: null, name: null, role: null, isMember: false, isStaff: false };

  const { id, role, name } = session.user;
  const isStaff = role === "EDITOR" || role === "ADMIN";
  if (isStaff) return { userId: id, name: name ?? null, role, isMember: true, isStaff };

  const now = new Date();
  const subs = await prisma.subscription.findMany({
    where: {
      status: { in: ["ACTIVE", "TRIAL"] },
      OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
      AND: [{ OR: [{ userId: id }, { organization: { members: { some: { userId: id } } } }] }],
    },
    include: { plan: true },
  });
  const isMember = subs.some((s) => (s.plan.entitlements as Entitlements)?.fullDetail === true);
  return { userId: id, name: name ?? null, role, isMember, isStaff };
});

export async function requireRole(roles: Role[]) {
  const session = await getSession();
  // Not staff (signed out or a member): the staff sign-in at /login. Staff without this role: back to the admin home.
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "EDITOR") redirect("/login?callbackUrl=%2Fadmin");
  if (!roles.includes(role)) redirect("/admin");
  return session!.user;
}

export const requireStaff = () => requireRole(["EDITOR", "ADMIN"]);
export const requireAdmin = () => requireRole(["ADMIN"]);

/** Number of items shown free before the "Show more" gate. */
export const FREE_PREVIEW = { budgetLines: 2, steps: 2, specs: 3, markets: 2 } as const;
