import Link from "next/link";
import { requireArea } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { CATEGORY_KINDS, isCategoryKind, kindLabel } from "@/lib/categories";
import { ConfirmButton } from "@/components/ConfirmButton";
import { addCategory, deleteCategories, deleteCategory, moveToCategory, renameCategory } from "./actions";
import { BULK_FORM, BulkBar, SelectAll } from "./BulkSelect";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categories" };

const SAVED: Record<string, string> = { added: "Category added.", renamed: "Category renamed.", deleted: "Category deleted." };
const ERROR: Record<string, string> = {
  name: "Enter a category name of 2 to 80 characters, and choose where it is used.",
  exists: "That category already exists in this list.",
  used: "This category is in use, so it can't be deleted. Move those pages to another category first.",
  missing: "That category no longer exists.",
  none: "Tick at least one category first, other than the one you are moving into.",
  target: "Choose the category to move everything into.",
};

/** Every category on the site: add one, rename one, or delete one nothing uses. Forms can also add one as they are filled in. */
export default async function CategoriesPage({ searchParams }: { searchParams: { kind?: string; saved?: string; error?: string; n?: string; kept?: string; to?: string } }) {
  await requireArea("categories");
  const kind = searchParams.kind && isCategoryKind(searchParams.kind) ? searchParams.kind : null;
  const [rows, counts, all] = await Promise.all([
    prisma.category.findMany({
      where: kind ? { kind } : undefined,
      include: { _count: { select: { primaryFor: true, contentLinks: true, orgLinks: true, products: true, children: true } } },
      orderBy: [{ kind: "asc" }, { name: "asc" }],
    }),
    prisma.category.groupBy({ by: ["kind"], _count: { _all: true } }),
    prisma.category.findMany({ select: { id: true, name: true, kind: true }, orderBy: { name: "asc" } }),
  ]);
  const countOf = (k: string) => counts.find((c) => c.kind === k)?._count._all ?? 0;
  const total = counts.reduce((n, c) => n + c._count._all, 0);
  const tab = (active: boolean) => `rounded-full px-3 py-1.5 text-[13px] font-semibold ${active ? "bg-brand text-white hover:text-white" : "border border-line bg-surface text-ink-soft hover:border-brand hover:text-brand"}`;
  const back = <input type="hidden" name="back" value={kind ?? ""} />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-heading">Categories</h1>
        <p className="text-sm text-ink-muted">Categories group pages on the website and appear in its filters. Add a new one here, or change a name. A new name shows on the website straight away.</p>
      </div>
      {searchParams.saved ? <p role="status" className="rounded-lg bg-brand-tint px-4 py-2.5 text-sm font-semibold text-brand-dark">{searchParams.saved === "moved" ? `Moved ${Number(searchParams.n) || 0} into ${searchParams.to}. The emptied categories can now be deleted.` : searchParams.saved === "bulk" ? `${Number(searchParams.n) || 0} deleted.${Number(searchParams.kept) ? ` ${Number(searchParams.kept)} in use, so kept.` : ""}` : SAVED[searchParams.saved] ?? "Saved."}</p> : null}
      {searchParams.error ? <p role="alert" className="rounded-lg bg-bad-bg px-4 py-2.5 text-sm font-semibold text-bad-fg">{ERROR[searchParams.error] ?? ERROR.name}</p> : null}

      <form action={addCategory} className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-4 sm:p-5">
        {back}
        <label className="label min-w-0 flex-[2_1_240px]">New category name<input name="name" required minLength={2} maxLength={80} placeholder="e.g. Packaging" className="input w-full" /></label>
        <label className="label min-w-0 flex-[1_1_220px]">Used for
          <select name="kind" defaultValue={kind ?? "PRODUCT_CATEGORY"} className="input w-full">{CATEGORY_KINDS.map((k) => <option key={k.kind} value={k.kind}>{k.label}</option>)}</select>
        </label>
        <button className="btn-primary">Add category</button>
      </form>

      <nav aria-label="Filter categories" className="flex flex-wrap gap-2">
        <Link href="/admin/categories" className={tab(!kind)}>All ({total})</Link>
        {CATEGORY_KINDS.filter((k) => countOf(k.kind) > 0 || k.kind === kind).map((k) => <Link key={k.kind} href={`/admin/categories?kind=${k.kind}`} className={tab(kind === k.kind)}>{k.label} ({countOf(k.kind)})</Link>)}
      </nav>

      <BulkBar action={deleteCategories} move={moveToCategory} back={kind ?? ""} targets={all.map((c) => ({ id: c.id, label: `${c.name} (${kindLabel(c.kind)})` }))} />

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="table-base min-w-[760px]">
          <thead><tr><th className="w-10"><SelectAll /></th><th>Category name</th><th>Used for</th><th>Times used</th><th className="text-right">Delete</th></tr></thead>
          <tbody>
            {rows.map((c) => {
              const uses = c._count.primaryFor + c._count.contentLinks + c._count.orgLinks + c._count.products + c._count.children;
              return (
                <tr key={c.id}>
                  <td><input type="checkbox" form={BULK_FORM} name="ids" value={c.id} data-used={uses > 0 ? "1" : undefined} aria-label={`Select ${c.name}`} className="h-[18px] w-[18px] cursor-pointer accent-brand" /></td>
                  <td>
                    <form action={renameCategory} className="flex items-center gap-2">
                      {back}<input type="hidden" name="id" value={c.id} />
                      <input name="name" required minLength={2} maxLength={80} defaultValue={c.name} aria-label={`Name of ${c.name}`} className="input min-h-[40px] w-full min-w-[12rem] max-w-xs text-sm" />
                      <button className="btn-outline min-h-[40px] px-4 text-sm">Save</button>
                    </form>
                  </td>
                  <td className="text-ink-soft">{kindLabel(c.kind)}</td>
                  <td className="text-ink-soft">{uses}</td>
                  <td className="text-right">
                    {uses > 0 ? <span className="text-xs text-ink-muted">In use</span> : (
                      <form>
                        {back}<input type="hidden" name="id" value={c.id} />
                        <ConfirmButton action={deleteCategory} title={`Delete "${c.name}"?`} message="No page uses this category, so nothing on the website changes." plain className="h-9">Delete</ConfirmButton>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? <tr><td colSpan={5} className="text-ink-muted">No categories here yet. Add the first one above.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
