import { prisma } from "@/lib/prisma";
import { date, money } from "@/lib/format";
import { budgetTotal } from "@/lib/costing";
import { addEvidence, deleteBudgetScenario, deleteEvidence, deleteRound, saveBudgetScenario, saveRound } from "./child-actions";

/** Budget scenarios, application rounds and evidence for the admin edit page. */
export async function ChildEditors({ contentItemId, ideaId, programmeId }: { contentItemId: string; ideaId?: string; programmeId?: string }) {
  const [scenarios, rounds, evidence, districts] = await Promise.all([
    ideaId ? prisma.budgetScenario.findMany({ where: { ideaId }, include: { lines: { orderBy: { displayOrder: "asc" } }, location: true } }) : [],
    programmeId ? prisma.applicationRound.findMany({ where: { programmeId }, orderBy: { opensAt: "desc" } }) : [],
    prisma.evidenceLink.findMany({ where: { contentItemId }, include: { source: true } }),
    ideaId ? prisma.location.findMany({ where: { type: "DISTRICT" }, orderBy: { name: "asc" } }) : [],
  ]);
  const hidden = <input type="hidden" name="contentItemId" value={contentItemId} />;

  return (
    <div id="children" className="flex flex-col gap-5">
      {ideaId ? (
        <section className="card flex flex-col gap-4 p-6">
          <h2 className="text-lg font-bold">Startup budget scenarios</h2>
          <p className="text-sm text-ink-muted">Show low, standard and higher scenarios where evidence allows. Totals are calculated from the lines and shown only when every line has a sourced cost.</p>
          {(["LOW", "STANDARD", "HIGHER"] as const).map((level) => {
            const sc = scenarios.find((x) => x.level === level);
            const total = sc ? budgetTotal(sc.lines) : null;
            const linesText = sc?.lines.map((l) => [l.costCategory, l.description, String(l.quantity), l.unit ?? "", l.unitCost === null ? "" : String(l.unitCost), l.unknownReason ?? "", l.isRecurring ? "yes" : "no", l.isOptional ? "yes" : "no", l.details ?? ""].join(" | ")).join("\n") ?? "";
            return (
              <details key={level} open={level === "STANDARD"} className="rounded-xl border border-line p-4">
                <summary className="cursor-pointer font-bold capitalize">{level.toLowerCase()} scenario {sc ? <span className="font-normal text-ink-muted">· {sc.lines.length} lines · {total === null ? "total incomplete" : money(total, sc.currency)}{sc.estimateDate ? ` · estimated ${date(sc.estimateDate)}` : " · no estimate date"}</span> : <span className="font-normal text-ink-muted">· not created</span>}</summary>
                <form action={saveBudgetScenario} className="mt-3 flex flex-col gap-3">
                  {hidden}
                  <input type="hidden" name="ideaId" value={ideaId} />
                  <input type="hidden" name="level" value={level} />
                  <div className="flex flex-wrap gap-3">
                    <label className="label flex-[1_1_200px]">Name<input name="name" defaultValue={sc?.name} className="input" /></label>
                    <label className="label flex-[0_1_110px]">Currency<input name="currency" defaultValue={sc?.currency ?? "UGX"} className="input" /></label>
                    <label className="label flex-[1_1_180px]">Location<select name="locationId" defaultValue={sc?.locationId ?? ""} className="input"><option value="">Uganda</option>{districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
                    <label className="label flex-[1_1_160px]">Estimate date<input name="estimateDate" type="date" defaultValue={sc?.estimateDate?.toISOString().slice(0, 10)} className="input" /></label>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <label className="label flex-[2_1_300px]">Assumptions<input name="assumptions" defaultValue={sc?.assumptions ?? ""} className="input" /></label>
                    <label className="label flex-[1_1_200px]">Operating scale<input name="operatingScale" defaultValue={sc?.operatingScale ?? ""} className="input" /></label>
                  </div>
                  <label className="label">Lines
                    <textarea name="lines" rows={7} defaultValue={linesText} className="input py-2 font-mono text-sm" />
                    <span className="text-xs font-normal text-ink-muted">One per line: category | description | quantity | unit | unit cost | reason if cost unknown | recurring (yes/no) | optional (yes/no; essential if left out) | details (what it is and why it is needed). Leave unit cost empty if not sourced and give the reason.</span>
                  </label>
                  <div className="flex justify-end gap-2">
                    <button className="btn-primary">Save {level.toLowerCase()} scenario</button>
                  </div>
                </form>
                {sc ? <form action={deleteBudgetScenario} className="mt-2">{hidden}<input type="hidden" name="id" value={sc.id} /><button className="text-xs font-bold text-bad-fg">Delete this scenario</button></form> : null}
              </details>
            );
          })}
        </section>
      ) : null}

      {programmeId ? (
        <section className="card flex flex-col gap-4 p-6">
          <h2 className="text-lg font-bold">Application rounds</h2>
          <p className="text-sm text-ink-muted">Times are East Africa Time. The daily job opens and closes rounds by date automatically.</p>
          {[...rounds, null].map((r) => (
            <details key={r?.id ?? "new"} open={!r && rounds.length === 0} className="rounded-xl border border-line p-4">
              <summary className="cursor-pointer font-bold">{r ? `${r.status.toLowerCase()} · ${r.isRolling ? "rolling" : `closes ${date(r.closesAt)}`}` : "+ Add a round"}</summary>
              <form action={saveRound} className="mt-3 flex flex-col gap-3">
                {hidden}
                <input type="hidden" name="programmeId" value={programmeId} />
                {r ? <input type="hidden" name="id" value={r.id} /> : null}
                <div className="flex flex-wrap gap-3">
                  <label className="label flex-[1_1_150px]">Status<select name="status" defaultValue={r?.status ?? "UPCOMING"} className="input"><option value="UPCOMING">Upcoming</option><option value="OPEN">Open</option><option value="CLOSED">Closed</option></select></label>
                  <label className="label flex-[1_1_160px]">Opens<input name="opensAt" type="date" defaultValue={r?.opensAt?.toISOString().slice(0, 10)} className="input" /></label>
                  <label className="label flex-[1_1_160px]">Closes<input name="closesAt" type="date" defaultValue={r?.closesAt?.toISOString().slice(0, 10)} className="input" /></label>
                  <label className="label flex-[0_1_120px]">Closing time<input name="closesTime" type="time" defaultValue="17:00" className="input" /></label>
                  <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" name="isRolling" defaultChecked={r?.isRolling} className="h-4 w-4 accent-brand" />Rolling</label>
                </div>
                <label className="label">Application link<input name="applicationUrl" type="url" defaultValue={r?.applicationUrl ?? ""} className="input" /></label>
                <label className="label">Required documents<textarea name="requiredDocuments" rows={3} defaultValue={r?.requiredDocuments.join("\n")} className="input py-2" /><span className="text-xs font-normal text-ink-muted">One per line</span></label>
                <label className="label">Process<textarea name="process" rows={2} defaultValue={r?.process ?? ""} className="input py-2" /></label>
                <div className="flex justify-end"><button className="btn-primary">{r ? "Save round" : "Add round"}</button></div>
              </form>
              {r ? <form action={deleteRound} className="mt-2">{hidden}<input type="hidden" name="id" value={r.id} /><button className="text-xs font-bold text-bad-fg">Delete this round</button></form> : null}
            </details>
          ))}
        </section>
      ) : null}

      <section className="card flex flex-col gap-4 p-6">
        <h2 className="text-lg font-bold">Sources and evidence</h2>
        <p className="text-sm text-ink-muted">Shown on the page under &ldquo;Evidence and freshness&rdquo;, labelled by kind so readers can tell facts from estimates and promoter claims.</p>
        {evidence.map((e) => (
          <div key={e.id} className="flex flex-wrap items-start justify-between gap-2 border-t border-line pt-3 text-sm">
            <span className="flex flex-col">
              <span><span className="badge-muted mr-1.5">{e.claimType.toLowerCase().replace("_", " ")}</span><strong>{e.claimSupported}</strong></span>
              <span className="text-ink-muted">{e.source.sourceTitle}{e.source.publisherName ? `, ${e.source.publisherName}` : ""}{e.source.sourceUrl ? ` · ${e.source.sourceUrl}` : ""} · accessed {date(e.source.accessedAt)}</span>
            </span>
            <form action={deleteEvidence}>{hidden}<input type="hidden" name="id" value={e.id} /><button className="text-xs font-bold text-bad-fg">Remove</button></form>
          </div>
        ))}
        <form action={addEvidence} className="flex flex-col gap-3 border-t border-line pt-3">
          {hidden}
          <div className="flex flex-wrap gap-3">
            <label className="label flex-[2_1_300px]">What it supports<input name="claimSupported" required placeholder="e.g. Interest rate and repayment period" className="input" /></label>
            <label className="label flex-[1_1_200px]">Kind<select name="claimType" className="input"><option value="SOURCE_FACT">Source fact</option><option value="EDITOR_EXPLANATION">Editor explanation</option><option value="ESTIMATE">Estimate</option><option value="PROMOTER_CLAIM">Promoter claim</option></select></label>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="label flex-[2_1_260px]">Source title<input name="sourceTitle" required className="input" /></label>
            <label className="label flex-[1_1_200px]">Publisher<input name="publisherName" className="input" /></label>
            <label className="label flex-[2_1_260px]">Link<input name="sourceUrl" type="url" className="input" /></label>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="label flex-[1_1_200px]">Source type<input name="sourceType" placeholder="official, quotation, market visit, interview" className="input" /></label>
            <label className="label flex-[1_1_160px]">Source published<input name="sourcePublishedAt" type="date" className="input" /></label>
            <label className="label flex-[2_1_260px]">Notes<input name="evidenceNotes" className="input" /></label>
          </div>
          <div className="flex justify-end"><button className="btn-outline">Add source</button></div>
        </form>
      </section>
    </div>
  );
}
