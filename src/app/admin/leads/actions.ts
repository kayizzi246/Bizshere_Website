"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireArea } from "@/lib/access";
import { audit } from "@/lib/audit";

const STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "CLOSED"];

/** Marks a lead contacted, closed or new again, and keeps the team's note. */
export async function updateLead(form: FormData) {
  const editor = await requireArea("leads");
  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "") as LeadStatus;
  const back = String(form.get("back") ?? "/admin/leads");
  if (!id || !STATUSES.includes(status)) redirect(back);
  const note = form.has("note") ? String(form.get("note") ?? "").trim().slice(0, 1000) || null : undefined;
  await prisma.lead.update({ where: { id }, data: { status, ...(note !== undefined ? { note } : {}) } });
  await audit(editor.id, `lead.${status.toLowerCase()}`, "lead", id);
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
  redirect(back.startsWith("/admin/leads") ? back : "/admin/leads");
}
