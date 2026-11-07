import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { checkLabel, contentTypeLabel, date, itemHref } from "@/lib/format";
import { ContentForm } from "../ContentForm";
import { loadOptions, loadValues } from "../load";
import { deleteContent, recordCheck } from "../../actions";
import { requireItemArea } from "@/lib/access";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ChildEditors } from "../ChildEditors";
import { ChildTableEditor } from "../ChildTableEditor";
import { ProductsManager } from "../ProductsManager";
import { loadProducts } from "../products-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit content" };

export default async function EditContentPage({ params, searchParams }: { params: { id: string }; searchParams: { saved?: string; error?: string; product?: string; in?: string; added?: string; t?: string; f?: string } }) {
  const user = await requireItemArea(params.id);
  const loaded = await loadValues(params.id);
  if (!loaded) notFound();
  const { item, values, multi } = loaded;
  const supplierId = item.contentType === "SUPPLIER" ? item.supplier?.id : undefined;
  const [options, checks, corrections, products] = await Promise.all([
    loadOptions(item.contentType, item.primaryCategoryId),
    prisma.verificationCheck.findMany({ where: { contentItemId: item.id }, include: { checkedBy: { select: { name: true } } }, orderBy: { checkedAt: "desc" } }),
    prisma.correctionReport.count({ where: { contentItemId: item.id, status: "PENDING" } }),
    supplierId ? loadProducts(supplierId) : Promise.resolve([]),
  ]);

  const record = (
    <>
      <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-6">
        <h2 className="text-lg font-extrabold">Verification checks</h2>
        <p className="text-sm text-ink-muted">Each check is recorded separately with its scope, date and evidence. Pages show only passed checks.</p>
        {checks.map((c) => (
          <div key={c.id} className="flex flex-wrap justify-between gap-2 border-t border-line pt-2 text-sm">
            <span><strong>{checkLabel[c.checkType]}</strong>: {c.result.toLowerCase().replace("_", " ")}{c.evidenceNotes ? ` · ${c.evidenceNotes}` : ""}</span>
            <span className="text-ink-muted">{date(c.checkedAt)} by {c.checkedBy?.name ?? "—"} · review due {date(c.reviewDueAt)}</span>
          </div>
        ))}
        <form action={recordCheck} className="flex flex-wrap items-end gap-3 border-t border-line pt-3">
          <input type="hidden" name="contentItemId" value={item.id} />
          <label className="label flex-[1_1_200px]">Check
            <select name="checkType" className="input">{Object.entries(checkLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </label>
          <label className="label flex-[1_1_140px]">Result
            <select name="result" className="input"><option value="PASSED">Passed</option><option value="FAILED">Failed</option></select>
          </label>
          <label className="label flex-[2_1_260px]">Evidence<input name="evidenceNotes" required className="input" placeholder="e.g. Called +256… on 12 Mar, spoke to the manager" /></label>
          <label className="label flex-[1_1_160px]">Review due<input name="reviewDueAt" type="date" className="input" /></label>
          <button className="btn-primary">Record check</button>
        </form>
      </section>

      <section className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-6">
        <h2 className="text-lg font-extrabold">Revision history</h2>
        {item.revisions.length === 0 ? <p className="text-sm text-ink-muted">No revisions yet.</p> : item.revisions.map((r) => (
          <div key={r.id} className="flex justify-between gap-2 border-t border-line pt-2 text-sm">
            <span>{r.note ?? "Saved"}</span>
            <span className="text-ink-muted">{r.editor?.name ?? "—"} · {r.createdAt.toLocaleString("en-GB", { timeZone: "Africa/Kampala" })}</span>
          </div>
        ))}
      </section>
    </>
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={`/admin/content?type=${item.contentType}`} className="text-sm">← {contentTypeLabel[item.contentType]} list</Link>
          <h1 className="font-display text-[22px] font-extrabold tracking-tight text-heading">{item.title}</h1>
          <p className="text-sm text-ink-muted">{contentTypeLabel[item.contentType]} · {item.publicationStatus.replace("_", " ").toLowerCase()} · updated {date(item.updatedAt)}</p>
        </div>
        <div className="flex gap-2">
          {corrections ? <Link href="/admin/corrections" className="badge-warn">{corrections} open correction(s)</Link> : null}
          <Link href={itemHref(item)} className="btn-outline" target="_blank">View page ↗</Link>
        </div>
      </div>
      {searchParams.saved === "1" && !searchParams.in && item.publicationStatus !== "PUBLISHED" ? <p role="alert" className="rounded-xl bg-warn-bg p-4 text-sm font-bold text-warn-fg">Saved, but this is NOT on the website yet. To show it, set Status to &quot;Live on the website&quot; under Publishing, then Save.</p> : null}
      {searchParams.saved && !searchParams.in && (searchParams.saved !== "1" || item.publicationStatus === "PUBLISHED") ? <p role="status" className="rounded-xl bg-brand-tint p-4 text-sm font-bold text-brand-dark">{searchParams.saved === "1" ? (item.contentType === "SUPPLIER" ? "Saved. Add this supplier's products with Manage products, below." : "Saved. A revision was recorded.") : "Saved."}</p> : null}
      {searchParams.error && !searchParams.in ? <p role="alert" className="rounded-xl bg-bad-bg p-4 text-sm font-semibold text-bad-fg">{searchParams.error}</p> : null}

      <ContentForm type={item.contentType} options={options} values={values} multi={multi} />

      {/* A supplier: the products come straight after the details, in their own window (one Save on this page,
          one in the window); the rest is rarely needed. */}
      {supplierId ? <ProductsManager contentItemId={item.id} supplierName={item.title} initial={products} /> : null}

      {item.contentType === "SUPPLIER" ? (
        <details open={Boolean(searchParams.in && searchParams.in !== "listings")} className="group/more rounded-2xl border border-line bg-surface [&>summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:px-6 sm:py-5">
            <span className="flex flex-col gap-0.5"><span className="text-base font-extrabold text-heading">More options</span><span className="text-[13px] text-ink-muted">Catalogue download, branches, extra contacts, checks and history. You can usually leave these alone.</span></span>
            <span aria-hidden className="text-lg text-ink-muted transition group-open/more:rotate-90">›</span>
          </summary>
          <div className="flex flex-col gap-5 border-t border-line p-4 sm:p-6">
            <ChildTableEditor contentItemId={item.id} type={item.contentType} except={["listings"]} notice={searchParams} />
            <ChildEditors contentItemId={item.id} />
            {record}
          </div>
        </details>
      ) : (
        <>
          <ChildEditors contentItemId={item.id} ideaId={item.businessIdea?.id} programmeId={item.fundingProgramme?.id} />
          {item.contentType !== "RECIPE" ? <ChildTableEditor contentItemId={item.id} type={item.contentType} notice={searchParams} /> : null}
          {record}
        </>
      )}
      {user.superAdmin ? (
        <section id="delete" className="flex flex-col gap-4 rounded-2xl border border-bad-fg/25 bg-surface p-6 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-extrabold text-bad-fg">Delete permanently</h2>
            <p className="max-w-xl text-[13px] text-ink-muted">Removes this page and everything attached to it from the database: its details, offers, rounds, fees, budgets, versions, media, sources, checks, revisions and saved copies. This cannot be undone. To hide it but keep it, set the status to Archived instead.</p>
          </div>
          <form className="shrink-0">
            <input type="hidden" name="id" value={item.id} />
            <ConfirmButton action={deleteContent} title={`Delete "${item.title}"?`} message="This page and everything attached to it will be removed from the database. Choose Archived as the status instead if you only want to hide it." className="h-10">Delete permanently</ConfirmButton>
          </form>
        </section>
      ) : null}
    </>
  );
}
