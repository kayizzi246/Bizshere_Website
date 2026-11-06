"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireArea } from "@/lib/access";
import { audit } from "@/lib/audit";
import { SITE_DATA } from "@/lib/cached";
import { categorySlug, findOrAddCategory, isCategoryKind } from "@/lib/categories";
import { prisma } from "@/lib/prisma";

const nameOf = (form: FormData) => String(form.get("name") ?? "").trim().replace(/\s+/g, " ");
const validName = (name: string) => name.length >= 2 && name.length <= 80 && categorySlug(name) !== "";
const backTo = (form: FormData, msg: string): never => {
  const kind = String(form.get("back") ?? "");
  redirect(`/admin/categories?${isCategoryKind(kind) ? `kind=${kind}&` : ""}${msg}`);
};
const refresh = () => { revalidatePath("/admin/categories"); revalidateTag(SITE_DATA); };

export async function addCategory(form: FormData) {
  const staff = await requireArea("categories");
  const name = nameOf(form);
  const kind = String(form.get("kind") ?? "");
  if (!validName(name) || !isCategoryKind(kind)) return backTo(form, "error=name");
  const { category, added } = await findOrAddCategory(prisma, kind, name);
  if (!added) return backTo(form, "error=exists");
  await audit(staff.id, "category.created", "category", category.id, { name, kind });
  refresh();
  backTo(form, "saved=added");
}

/** Renames a category. Its web address stays the same, so links to it keep working. */
export async function renameCategory(form: FormData) {
  const staff = await requireArea("categories");
  const id = String(form.get("id") ?? "");
  const name = nameOf(form);
  if (!validName(name)) return backTo(form, "error=name");
  const current = await prisma.category.findUnique({ where: { id }, select: { kind: true, name: true } });
  if (!current) return backTo(form, "error=missing");
  const clash = await prisma.category.findFirst({ where: { kind: current.kind, name: { equals: name, mode: "insensitive" }, NOT: { id } }, select: { id: true } });
  if (clash) return backTo(form, "error=exists");
  await prisma.category.update({ where: { id }, data: { name } });
  await audit(staff.id, "category.renamed", "category", id, { from: current.name, to: name });
  refresh();
  backTo(form, "saved=renamed");
}

/**
 * Moves everything in the ticked categories into one category, all at once: pages, businesses and
 * products. The ticked categories stay, now empty, so they can be kept or deleted.
 */
export async function moveToCategory(form: FormData) {
  const staff = await requireArea("categories");
  const targetId = String(form.get("target") ?? "");
  const ids = form.getAll("ids").map(String).filter((id) => id !== targetId);
  const target = await prisma.category.findUnique({ where: { id: targetId }, select: { name: true } });
  if (!target) return backTo(form, "error=target");
  if (!ids.length) return backTo(form, "error=none");
  const moved = await prisma.$transaction(async (tx) => {
    const primary = await tx.contentItem.updateMany({ where: { primaryCategoryId: { in: ids } }, data: { primaryCategoryId: targetId } });
    // Links are one row per page and category: a page already in the target simply keeps that link
    const links = await tx.contentCategory.findMany({ where: { categoryId: { in: ids } }, select: { contentItemId: true } });
    await tx.contentCategory.createMany({ data: links.map((l) => ({ contentItemId: l.contentItemId, categoryId: targetId })), skipDuplicates: true });
    await tx.contentCategory.deleteMany({ where: { categoryId: { in: ids } } });
    const orgs = await tx.organizationCategory.findMany({ where: { categoryId: { in: ids } }, select: { organizationId: true } });
    await tx.organizationCategory.createMany({ data: orgs.map((o) => ({ organizationId: o.organizationId, categoryId: targetId })), skipDuplicates: true });
    await tx.organizationCategory.deleteMany({ where: { categoryId: { in: ids } } });
    await tx.product.updateMany({ where: { categoryId: { in: ids } }, data: { categoryId: targetId } });
    await tx.category.updateMany({ where: { id: targetId, parentId: { in: ids } }, data: { parentId: null } });
    await tx.category.updateMany({ where: { parentId: { in: ids } }, data: { parentId: targetId } });
    return primary.count + new Set(links.map((l) => l.contentItemId)).size;
  });
  await audit(staff.id, "category.moved", "category", targetId, { from: ids, moved });
  refresh();
  revalidatePath("/admin/content");
  backTo(form, `saved=moved&n=${moved}&to=${encodeURIComponent(target.name)}`);
}

/** Deletes the ticked categories. Any that are in use are left alone, whatever was ticked. */
export async function deleteCategories(form: FormData) {
  const staff = await requireArea("categories");
  const ids = form.getAll("ids").map(String);
  if (!ids.length) return backTo(form, "error=none");
  const unused = { id: { in: ids }, primaryFor: { none: {} }, contentLinks: { none: {} }, orgLinks: { none: {} }, products: { none: {} }, children: { none: {} } };
  const { count } = await prisma.category.deleteMany({ where: unused });
  await audit(staff.id, "category.bulk_deleted", "category", "bulk", { ticked: ids.length, deleted: count });
  refresh();
  backTo(form, `saved=bulk&n=${count}&kept=${ids.length - count}`);
}

/** Only an unused category can be deleted, so nothing on the site loses its category by accident. */
export async function deleteCategory(form: FormData) {
  const staff = await requireArea("categories");
  const id = String(form.get("id") ?? "");
  const c = await prisma.category.findUnique({ where: { id }, select: { name: true, _count: { select: { primaryFor: true, contentLinks: true, orgLinks: true, products: true, children: true } } } });
  if (!c) return backTo(form, "error=missing");
  if (Object.values(c._count).some((n) => n > 0)) return backTo(form, "error=used");
  await prisma.category.delete({ where: { id } });
  await audit(staff.id, "category.deleted", "category", id, { name: c.name });
  refresh();
  backTo(form, "saved=deleted");
}
