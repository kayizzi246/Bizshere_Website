import type { ContentType, Role } from "@prisma/client";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "./auth";
import { prisma } from "./prisma";
import { AREA_KEYS, contentArea } from "./admin-areas";
import { shortMemo } from "./memo";

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

  // Shared for a few seconds between requests that arrive together (prefetches): src/lib/memo.ts.
  // The header, footer and layout all depend on this answer, so a database hiccup here must not take
  // the whole site down ("BizSphere-Ug didn't load", 10 Nov 2026): the person is treated as signed in
  // without membership for this one request, and the page's own queries say whether the database is back.
  const isMember = await shortMemo(`member:${id}`, 5000, async () => {
    const now = new Date();
    const subs = await prisma.subscription.findMany({
      where: {
        status: { in: ["ACTIVE", "TRIAL"] },
        OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
        AND: [{ OR: [{ userId: id }, { organization: { members: { some: { userId: id } } } }] }],
      },
      select: { plan: { select: { entitlements: true } } },
    });
    return subs.some((s) => (s.plan.entitlements as Entitlements)?.fullDetail === true);
  }).catch((e: Error) => { console.error(`getViewer: membership lookup failed for ${id}: ${e.message}`); return false; });
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

/**
 * The signed-in staff member with what they may open: the super admin (ADMIN) every area, a
 * sub-admin (EDITOR) only their User.adminAreas. Read from the database on every request, so a
 * change at /admin/team takes effect at once.
 */
export const staffAccess = cache(async function staffAccess() {
  const user = await requireStaff();
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true, adminAreas: true, isSuspended: true } });
  if (!row || row.isSuspended || (row.role !== "ADMIN" && row.role !== "EDITOR")) redirect("/login?callbackUrl=%2Fadmin");
  const superAdmin = row.role === "ADMIN";
  const areas = new Set(superAdmin ? AREA_KEYS : row.adminAreas.filter((a) => AREA_KEYS.includes(a)));
  return { ...user, superAdmin, areas, can: (area: string) => areas.has(area) };
});

/** For admin pages and actions: staff with this area, otherwise back to the admin home with a note. */
export async function requireArea(area: string) {
  const staff = await staffAccess();
  if (!staff.can(area)) redirect(`/admin?denied=${encodeURIComponent(area)}`);
  return staff;
}

/** Staff who may edit this directory (content:<TYPE>). */
export const requireContentType = (type: ContentType | string) => requireArea(contentArea(type));

/** Staff who may edit this content item, by its directory. Unknown items count as not allowed. */
export async function requireItemArea(contentItemId: string) {
  const item = contentItemId ? await prisma.contentItem.findUnique({ where: { id: contentItemId }, select: { contentType: true } }) : null;
  if (!item) redirect("/admin?denied=content");
  return requireContentType(item.contentType);
}

/** Number of items shown free before the "Show more" gate. */
export const FREE_PREVIEW = { budgetLines: 2, steps: 2, specs: 3, markets: 2 } as const;
