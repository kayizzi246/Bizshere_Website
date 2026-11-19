"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { allow, clientIp, LIMITS } from "@/lib/rate-limit";
import { sendSms } from "@/lib/sms";
import { sendEmail } from "@/lib/email";
import { getContact } from "@/lib/site-contact";
import { interestLabel, interestShort, LEAD_INTEREST_KEYS } from "@/lib/leads";
import { scoreLead } from "@/lib/lead-spam";
import { site } from "@/config/site";

export type LeadFormState = { ok?: boolean; error?: string; errors?: Record<string, string> };

const schema = z.object({
  name: z.string().trim().min(2, "Your name, please").max(80),
  phone: z.string().trim().refine((v) => v.replace(/\D/g, "").length >= 9, "A phone number we can call, e.g. 0772 123 456").transform((v) => v.slice(0, 30)),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email("That email doesn't look right").max(120)]),
  interest: z.enum(LEAD_INTEREST_KEYS),
  message: z.string().trim().max(1500, "Keep it under 1500 letters"),
  page: z.string().trim().max(200).optional(),
});

/**
 * The contact form: keeps the lead for Admin > Leads and tells the team at once by SMS (and email,
 * when set up). Rate-limited by address; the hidden "website" box catches robots.
 *
 * Robots written for contact forms fill the visible boxes properly and leave the hidden one
 * alone, so they get past the honeypot. Those messages are scored (src/lib/lead-spam.ts) and,
 * when they look like someone selling search-engine listings, kept with status SPAM and left out
 * of the texts. Every text costs SMS credit and rings someone's phone, so a wrong text is worse
 * than a lead that waits in the Spam tab until a person looks.
 */
export async function sendLead(_prev: LeadFormState, form: FormData): Promise<LeadFormState> {
  if (String(form.get("website") ?? "")) return { ok: true }; // a robot filled the hidden box: say nothing, keep nothing
  const parsed = schema.safeParse({
    name: form.get("name"), phone: form.get("phone"), email: form.get("email") ?? "", interest: form.get("interest"), message: form.get("message") ?? "", page: form.get("page") ?? undefined,
  });
  if (!parsed.success) {
    const errors = Object.fromEntries(Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? "Check this"]));
    return { errors, error: "Please check the highlighted boxes." };
  }
  if (!(await allow(`lead:ip:${await clientIp()}`, 5, 3600))) return { error: "Too many messages from this connection. Please try again in an hour, or WhatsApp us." };
  const d = parsed.data;

  // A ceiling on the texts the form can set off, whatever address they come from: one robot
  // spread over many addresses would otherwise drain the SMS credit a message at a time.
  const underCeiling = await allow("lead:all", ...LIMITS.leadAll);
  const verdict = scoreLead({ name: d.name, phone: d.phone, email: d.email, message: d.message });
  const quiet = verdict.spam || !underCeiling;
  const session = await getSession().catch(() => null);
  const lead = await prisma.lead.create({
    data: { name: d.name, phone: d.phone, email: d.email || null, interest: d.interest, message: d.message || null, page: d.page || null, userId: session?.user?.id ?? null, ...(verdict.spam ? { status: "SPAM" as const } : {}) },
  });

  // Nothing is said to the sender either way: a robot that learns which messages were refused
  // only comes back with the wording changed.
  if (quiet) {
    console.log(`lead ${lead.id} kept quietly (score ${verdict.score}: ${verdict.reasons.join("; ") || "over the hourly ceiling"})`);
    return { ok: true };
  }

  // Tell the team now: a lead called back within the hour is worth far more than one found next week.
  const c = await getContact();
  const short = `New lead on BizSphere-Ug: ${d.name}, ${d.phone}. Wants: ${interestShort(d.interest)}. ${site.url}/admin/leads`;
  const long = [`Name: ${d.name}`, `Phone: ${d.phone}`, d.email ? `Email: ${d.email}` : null, `Wants: ${interestLabel(d.interest)}`, d.page ? `From page: ${site.url}${d.page}` : null, d.message ? `\n${d.message}` : null, `\nFollow up: ${site.url}/admin/leads`].filter(Boolean).join("\n");
  await Promise.allSettled([
    c.phone ? sendSms(c.phone, short) : Promise.resolve(false),
    c.email ? sendEmail(c.email, `New lead: ${d.name} (${interestShort(d.interest)})`, long) : Promise.resolve(false),
  ]);
  console.log(`lead ${lead.id} from ${d.phone}: ${d.interest}`);
  return { ok: true };
}
