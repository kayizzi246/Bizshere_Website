/**
 * Numbers the team can change without a deploy (SiteSetting rows, edited in Admin > Settings):
 * how long the free pass lasts, how many free days an invite gives, how big a price move is worth
 * a text. Each has a default here, so a missing row never breaks a page.
 *
 * Contact details have their own file (src/lib/site-contact.ts) and sessions their own keys
 * (src/lib/sessions.ts); this is only for these plain numbers.
 */
import { prisma } from "./prisma";

/** Every number the team may change, with its default and what it means. */
export const NUMBER_SETTINGS = {
  "freePass.hours": { label: "Free pass length (hours)", help: "How long the free pass opens everything. 0 turns the free pass off.", min: 0, max: 168, fallback: 24 },
  "referral.days": { label: "Free days for an invite", help: "Days given to both the inviter and the person they invited, when that person first pays. 0 turns invites off.", min: 0, max: 90, fallback: 7 },
  "priceWatch.move": { label: "Price move worth a text (%)", help: "A watched product's price must move at least this much before a member is texted.", min: 1, max: 50, fallback: 5 },
} as const;

export type NumberSetting = keyof typeof NUMBER_SETTINGS;

/** One setting, or its default when the row is missing, empty or not a number in range. */
export async function getSetting(key: NumberSetting, fallback?: number): Promise<number> {
  const spec = NUMBER_SETTINGS[key];
  const row = await prisma.siteSetting.findUnique({ where: { key } }).catch(() => null);
  const n = Number(row?.value);
  if (!Number.isFinite(n) || n < spec.min || n > spec.max) return fallback ?? spec.fallback;
  return n;
}

/** All of them at once, for Admin > Settings. */
export async function getSettings(): Promise<Record<NumberSetting, number>> {
  const keys = Object.keys(NUMBER_SETTINGS) as NumberSetting[];
  const rows = await prisma.siteSetting.findMany({ where: { key: { in: keys } } }).catch(() => []);
  const out = {} as Record<NumberSetting, number>;
  for (const k of keys) {
    const n = Number(rows.find((r) => r.key === k)?.value);
    const spec = NUMBER_SETTINGS[k];
    out[k] = Number.isFinite(n) && n >= spec.min && n <= spec.max ? n : spec.fallback;
  }
  return out;
}

/** Saves one setting. Out-of-range values are brought back inside the range rather than refused. */
export async function setSetting(key: NumberSetting, value: number) {
  const spec = NUMBER_SETTINGS[key];
  const n = Math.round(Math.min(spec.max, Math.max(spec.min, Number.isFinite(value) ? value : spec.fallback)));
  await prisma.siteSetting.upsert({ where: { key }, create: { key, value: String(n) }, update: { value: String(n) } });
  return n;
}
