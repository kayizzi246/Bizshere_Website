"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/** Actions for signed-in users: saved items, collections, saved searches, alerts, corrections. */

async function requireUser(back = "/account") {
  const session = await getSession();
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(back)}`);
  return session.user;
}

export async function toggleSave(form: FormData) {
  const back = String(form.get("back") ?? "/account");
  const user = await requireUser(back);
  const contentItemId = String(form.get("contentItemId"));
  const key = { userId_contentItemId: { userId: user.id, contentItemId } };
  if (await prisma.savedItem.findUnique({ where: key })) {
    await prisma.savedItem.delete({ where: key });
  } else {
    await prisma.savedItem.create({ data: { userId: user.id, contentItemId } });
    await prisma.usageEvent.create({ data: { userId: user.id, event: "save", contentItemId, path: back } });
  }
  revalidatePath(back);
  revalidatePath("/account");
}

export async function createCollection(form: FormData) {
  const user = await requireUser();
  const name = z.string().trim().min(1).max(80).safeParse(form.get("name"));
  if (!name.success) redirect("/account?error=collection");
  await prisma.collection.create({ data: { userId: user.id, name: name.data } });
  revalidatePath("/account");
}

export async function deleteCollection(form: FormData) {
  const user = await requireUser();
  await prisma.collection.deleteMany({ where: { id: String(form.get("id")), userId: user.id } });
  revalidatePath("/account");
}

export async function addToCollection(form: FormData) {
  const user = await requireUser();
  const collectionId = String(form.get("collectionId"));
  const contentItemId = String(form.get("contentItemId"));
  const owns = await prisma.collection.findFirst({ where: { id: collectionId, userId: user.id } });
  if (!owns) redirect("/account?error=collection");
  await prisma.collectionItem.upsert({
    where: { collectionId_contentItemId: { collectionId, contentItemId } },
    update: {},
    create: { collectionId, contentItemId },
  });
  revalidatePath("/account");
}

export async function removeFromCollection(form: FormData) {
  const user = await requireUser();
  const collectionId = String(form.get("collectionId"));
  const contentItemId = String(form.get("contentItemId"));
  await prisma.collectionItem.deleteMany({ where: { collectionId, contentItemId, collection: { userId: user.id } } });
  revalidatePath("/account");
}

export async function saveSearch(form: FormData) {
  // The search form submits all its fields; keep them as a query string to reopen the same search.
  const params = new URLSearchParams();
  for (const [k, v] of form.entries()) if (typeof v === "string" && v && !k.startsWith("$ACTION") && k !== "page") params.append(k, v);
  const query = String(form.get("q") ?? form.get("query") ?? "").trim();
  const user = await requireUser(`/search?${params}`);
  const types = form.getAll("show").map(String);
  await prisma.savedSearch.create({ data: { userId: user.id, query, filters: { types, params: params.toString() }, alert: form.get("alert") === "on" } });
  revalidatePath("/account");
  redirect("/account?saved=search");
}

export async function deleteSavedSearch(form: FormData) {
  const user = await requireUser();
  await prisma.savedSearch.deleteMany({ where: { id: String(form.get("id")), userId: user.id } });
  revalidatePath("/account");
}

export async function markAlertsRead() {
  const user = await requireUser();
  await prisma.alert.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/account");
}

const correctionSchema = z.object({
  contentItemId: z.string().min(1),
  message: z.string().trim().min(10, "Please describe what is wrong (at least 10 characters)").max(4000),
  email: z.string().trim().email().optional().or(z.literal("")),
});

export type CorrectionState = { ok?: boolean; errors?: Record<string, string[] | undefined> };

/** Anyone can report a correction. It goes to the admin corrections queue. */
export async function submitCorrection(_prev: CorrectionState, form: FormData): Promise<CorrectionState> {
  const session = await getSession();
  const parsed = correctionSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const exists = await prisma.contentItem.findUnique({ where: { id: parsed.data.contentItemId }, select: { id: true } });
  if (!exists) return { errors: { contentItemId: ["Choose the page you are reporting"] } };
  await prisma.correctionReport.create({
    data: {
      contentItemId: parsed.data.contentItemId,
      message: parsed.data.message,
      reporterId: session?.user?.id ?? null,
      reporterEmail: parsed.data.email || session?.user?.email || null,
    },
  });
  return { ok: true };
}
