import type { ContentType } from "@prisma/client";
import { ADMIN_DIRECTORIES } from "./content-fields";

/**
 * The parts of the admin a sub-admin can be given (User.adminAreas). The super admin (role ADMIN)
 * opens everything, plus the team page (/admin/team) and permanent deletes. A sub-admin (role
 * EDITOR) opens only the areas ticked for them there: every admin page and action checks its area
 * on the server (requireArea in src/lib/access.ts), and the menu shows only those areas.
 */
export type Area = { key: string; label: string; group: string; help?: string };

export const contentArea = (type: ContentType | string) => `content:${type}`;

export const AREAS: Area[] = [
  { key: "payments", label: "Payments and revenue", group: "Money", help: "Payments, refunds, revenue and the export" },
  { key: "leads", label: "Leads", group: "Money", help: "People who asked to be called back from the Contact page" },
  { key: "plans", label: "Subscription prices", group: "Money", help: "What suppliers, experts and members pay" },
  { key: "review", label: "Review queue", group: "Checking", help: "New businesses, offers and prices sent in" },
  { key: "corrections", label: "Reported mistakes", group: "Checking", help: "Mistakes readers report" },
  ...ADMIN_DIRECTORIES.map((d) => ({ key: contentArea(d.type), label: d.label, group: "Directories" })),
  { key: "categories", label: "Categories", group: "Directories", help: "Rename, add and delete categories" },
  { key: "prices", label: "Market prices", group: "Directories" },
  { key: "users", label: "Users and businesses", group: "People", help: "See accounts; create business and member accounts" },
  { key: "suppliers", label: "Suppliers: sign-ups, logins and products", group: "People" },
  { key: "experts", label: "Experts: logins, work and reviews", group: "People" },
  { key: "homepage", label: "Homepage updates, video and contact details", group: "Site" },
  { key: "community", label: "Forum and tip remarks", group: "Site", help: "Close or hide topics, hide messages and remarks" },
];

export const AREA_KEYS = AREAS.map((a) => a.key);
export const AREA_GROUPS = [...new Set(AREAS.map((a) => a.group))];
export const areaLabel = (key: string) => AREAS.find((a) => a.key === key)?.label ?? key;
