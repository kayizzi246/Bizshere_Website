"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { SITE_DATA } from "@/lib/cached";
import { requireArea } from "@/lib/access";
import { audit } from "@/lib/audit";
import { CONTACT_KEYS, saveContact, type SiteContact } from "@/lib/site-contact";

const fail = (message: string) => redirect(`/admin/settings?error=${encodeURIComponent(message)}`);

/** Saves the site's own contact details (footer, /contact, the WhatsApp button and the payment pop-up). */
export async function saveContactSettings(form: FormData) {
  const editor = await requireArea("homepage");
  const values = Object.fromEntries(CONTACT_KEYS.map((k) => [k, String(form.get(k) ?? "").trim().slice(0, 200)])) as SiteContact;
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) fail("That email address doesn't look right.");
  for (const k of ["phone", "whatsapp"] as const) {
    if (values[k] && values[k].replace(/\D/g, "").length < 9) fail(`The ${k === "phone" ? "phone" : "WhatsApp"} number is too short. Use the full number, e.g. 0772 123 456.`);
  }
  await saveContact(values);
  await audit(editor.id, "site_setting.contact", "site_setting", "contact", { set: CONTACT_KEYS.filter((k) => values[k]) });
  revalidateTag(SITE_DATA);
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}
