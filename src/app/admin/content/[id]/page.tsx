import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { checkLabel, contentTypeLabel, date, itemHref } from "@/lib/format";
import { ContentForm } from "../ContentForm";
import { loadOptions, loadValues } from "../load";
import { recordCheck } from "../../actions";
import { ChildEditors } from "../ChildEditors";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit content" };

export default async function EditContentPage({ params, searchParams }: { params: { id: string }; searchParams: { saved?: string; error?: string } }) {
  const loaded = await loadValues(params.id);
  if (!loaded) notFound();
  const { item, values, multi } = loaded;
  const [options, checks, corrections] = await Promise.all([
    loadOptions(item.contentType),
    prisma.verificationCheck.findMany({ where: { contentItemId: item.id }, include: { checkedBy: { select: { name: true } } }, orderBy: { checkedAt: "desc" } }),
    prisma.correctionReport.count({ where: { contentItemId: item.id, status: "PENDING" } }),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={`/admin/content?type=${item.contentType}`} className="text-sm">← {contentTypeLabel[item.contentType]} list</Link>
          <h1 className="text-3xl font-extrabold tracking-tight">{item.title}</h1>
          <p className="text-sm text-ink-muted">{contentTypeLabel[item.contentType]} · {item.publicationStatus.replace("_", " ").toLowerCase()} · updated {date(item.updatedAt)}</p>
        </div>
        <div className="flex gap-2">
          {corrections ? <Link href="/admin/corrections" className="badge-warn">{corrections} open correction(s)</Link> : null}
          <Link href={itemHref(item)} className="btn-outline" target="_blank">View page ↗</Link>
        </div>
      </div>
      {searchParams.saved ? <p role="status" className="rounded-xl bg-brand-tint p-4 text-sm font-bold text-brand-dark">{searchParams.saved === "1" ? "Saved. A revision was recorded." : "Saved."}</p> : null}
      {searchParams.error ? <p role="alert" className="rounded-xl bg-bad-bg p-4 text-sm font-semibold text-bad-fg">{searchParams.error}</p> : null}

      <ContentForm type={item.contentType} options={options} values={values} multi={multi} />

      <ChildEditors contentItemId={item.id} ideaId={item.businessIdea?.id} programmeId={item.fundingProgramme?.id} />

      <section className="card flex flex-col gap-3 p-6">
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

      <section className="card flex flex-col gap-2 p-6">
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
}
