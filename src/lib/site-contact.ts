import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import { site } from "@/config/site";
import { SITE_DATA } from "./cached";

/**
 * The site's own contact details (phone, WhatsApp, email, office, hours), set by the team at
 * /admin/settings and kept in site_settings. What is typed there wins; src/config/site.ts is the
 * fallback. Shown in the footer, on /contact, in the payment pop-up and as the floating WhatsApp
 * button on every page (src/components/WhatsAppButton.tsx).
 */
export type SiteContact = { email: string; phone: string; whatsapp: string; address: string; hours: string };
export const CONTACT_KEYS: (keyof SiteContact)[] = ["email", "phone", "whatsapp", "address", "hours"];
const key = (k: keyof SiteContact) => `contact.${k}`;

export const getContact = unstable_cache(
  async (): Promise<SiteContact> => {
    const rows = await prisma.siteSetting.findMany({ where: { key: { in: CONTACT_KEYS.map(key) } } }).catch(() => []);
    const out = { ...site.contact };
    for (const k of CONTACT_KEYS) {
      const v = rows.find((r) => r.key === key(k))?.value?.trim();
      if (v) out[k] = v;
    }
    return out;
  },
  ["site-contact"], { tags: [SITE_DATA], revalidate: 300 },
);

/** Saves the details (an empty box removes that setting, so the config fallback applies again). */
export async function saveContact(values: Partial<SiteContact>) {
  for (const k of CONTACT_KEYS) {
    const v = values[k]?.trim();
    if (v) await prisma.siteSetting.upsert({ where: { key: key(k) }, create: { key: key(k), value: v }, update: { value: v } });
    else await prisma.siteSetting.deleteMany({ where: { key: key(k) } });
  }
}

/** A phone number as WhatsApp wants it: digits with the country code. Local numbers are Ugandan. */
export const whatsappNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, "").replace(/^00/, "");
  return digits.startsWith("0") ? `256${digits.slice(1)}` : digits;
};

/** A wa.me link that opens a chat with the number, with the first message written in. */
export const whatsappHref = (phone: string, text: string) => `https://wa.me/${whatsappNumber(phone)}?text=${encodeURIComponent(text)}`;
