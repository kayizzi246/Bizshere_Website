"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { requireArea } from "@/lib/access";

const input = z.object({
  consultantId: z.string().min(1).max(64),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(10, "A few words, please").max(1000),
  back: z.string().regex(/^\/experts\/[a-z0-9-]+$/),
});

/**
 * A signed-in user reviews an expert. Reviews wait for the team (moderation PENDING, approved in
 * the admin under the expert's "Client reviews"); only approved ones show. One review per person
 * per expert: writing again replaces your earlier one and sends it back for approval.
 */
export async function submitExpertReview(form: FormData) {
  const back = String(form.get("back") ?? "/experts");
  const session = await getSession();
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(back)}`);
  const parsed = input.safeParse(Object.fromEntries(["consultantId", "rating", "body", "back"].map((k) => [k, form.get(k) ?? ""])));
  if (!parsed.success) redirect(`${back}?review=error#reviews`);
  const { consultantId, rating, body } = parsed.data;
  if (!(await prisma.consultant.findUnique({ where: { id: consultantId }, select: { id: true } }))) redirect(`${back}?review=error#reviews`);

  const mine = await prisma.consultantReview.findFirst({ where: { consultantId, authorId: session.user.id } });
  const review = mine
    ? await prisma.consultantReview.update({ where: { id: mine.id }, data: { rating, body, moderation: "PENDING", moderatedAt: null, moderatedById: null } })
    : await prisma.consultantReview.create({ data: { consultantId, authorId: session.user.id, rating, body, moderation: "PENDING" } });
  await audit(session.user.id, "review.submitted", "consultant_review", review.id);
  redirect(`${back}?review=sent#reviews`);
}

/** Admin approves or rejects a user's review (/admin/expert-reviews). */
export async function moderateReview(form: FormData) {
  const staff = await requireArea("experts");
  const approve = form.get("decision") === "approve";
  const review = await prisma.consultantReview.update({
    where: { id: String(form.get("id")) },
    data: { moderation: approve ? "APPROVED" : "REJECTED", moderatedById: staff.id, moderatedAt: new Date() },
    include: { consultant: { include: { contentItem: { select: { slug: true } } } } },
  });
  revalidatePath(`/experts/${review.consultant.contentItem.slug}`);
  revalidatePath("/admin/expert-reviews");
  redirect(`/admin/expert-reviews?done=${approve ? "approved" : "rejected"}`);
}
