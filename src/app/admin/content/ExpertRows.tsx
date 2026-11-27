"use client";

import { useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ProductPhotos } from "@/components/ProductPhotos";

export type ServiceRow = { id: string; name: string; description: string; duration: string; price: string; imageUrl: string };
export type JobRow = { id: string; title: string; client: string; show: boolean };
export type ExpertRowsValue = { services: ServiceRow[]; jobs: JobRow[] };

const box = "input min-h-[44px] w-full min-w-0";
const label = "flex min-w-0 flex-col gap-1 text-[12px] font-semibold text-ink-soft";
const remove = "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-bad-bg hover:text-bad-fg";

/**
 * The Services and Jobs done tables on the expert form (client's template, 24 Nov 2026), typed and saved with the page.
 * Each row has a key (ex_service, ex_job) and its boxes carry that key in their name, so the server can pair them up
 * (saveExpertRows in actions.ts). `ex_loaded` lists the rows that were here when the form opened: of those, only the
 * ones taken off are deleted, so a service the expert adds meanwhile is never lost. Rows without a name are skipped.
 */
export function ExpertRows({ initial }: { initial: ExpertRowsValue }) {
  const next = useRef(1000);
  const key = () => `n${next.current++}`;
  const [services, setServices] = useState(() => [...initial.services.map((s, n) => ({ key: `s${n}`, row: s })), ...(initial.services.length ? [] : [0, 1].map((n) => ({ key: `s${n}`, row: null as ServiceRow | null })))]);
  const [jobs, setJobs] = useState(() => [...initial.jobs.map((j, n) => ({ key: `j${n}`, row: j })), ...(initial.jobs.length ? [] : [0, 1].map((n) => ({ key: `j${n}`, row: null as JobRow | null })))]);
  const [photos, setPhotos] = useState<Record<string, string>>(() => Object.fromEntries(services.map((s) => [s.key, s.row?.imageUrl ?? ""])));

  return (
    <>
      <input type="hidden" name="ex_rows" value="1" />
      {initial.services.map((s) => <input key={s.id} type="hidden" name="ex_loaded_service" value={s.id} />)}
      {initial.jobs.map((j) => <input key={j.id} type="hidden" name="ex_loaded_job" value={j.id} />)}

      <section id="s-services" className="flex scroll-mt-20 flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-6">
        <div className="flex flex-col gap-0.5"><h2 className="text-base font-extrabold text-heading">Services</h2><p className="text-[12.5px] text-ink-muted">Only the name is needed. Prices are shown to members only. Leave a row empty to skip it.</p></div>
        <ol className="flex flex-col gap-3">
          {services.map(({ key: k, row }, n) => (
            <li key={k} className="flex items-start gap-3 rounded-xl border border-line p-3">
              <span className="pt-3 text-sm font-bold text-ink-muted">{n + 1}</span>
              <div className="grid min-w-0 flex-1 gap-2.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <input type="hidden" name="ex_service" value={k} />
                <input type="hidden" name={`${k}_id`} value={row?.id ?? ""} />
                <input type="hidden" name={`${k}_image`} value={photos[k] ?? ""} />
                <label className={label}>Service name<input name={`${k}_name`} defaultValue={row?.name} maxLength={160} placeholder="e.g. Bee keeping training" className={box} /></label>
                <label className={label}>Duration<input name={`${k}_duration`} defaultValue={row?.duration} maxLength={80} placeholder="e.g. 3 days" className={box} /></label>
                <label className={label}>Price<input name={`${k}_price`} defaultValue={row?.price} maxLength={80} placeholder="e.g. UGX 200,000" className={box} /></label>
                <label className={`${label} sm:col-span-3`}>Description<textarea name={`${k}_description`} defaultValue={row?.description} maxLength={1000} rows={2} className={`${box} py-2`} /></label>
                <div className={`${label} sm:col-span-3`}>Picture
                  {/* One picture a service */}
                  <ProductPhotos max={1} initial={photos[k] ? [photos[k]] : []} onChange={(p) => setPhotos((all) => ({ ...all, [k]: p[p.length - 1] ?? "" }))} />
                </div>
              </div>
              <button type="button" onClick={() => setServices((all) => all.filter((x) => x.key !== k))} aria-label={`Remove service ${n + 1}`} className={remove}><Trash2 aria-hidden className="h-4 w-4" /></button>
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => setServices((all) => [...all, { key: key(), row: null }])} className="btn-outline w-fit gap-1.5 text-sm"><Plus aria-hidden className="h-4 w-4" />Add another service</button>
      </section>

      <section id="s-jobs" className="flex scroll-mt-20 flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-6">
        <div className="flex flex-col gap-0.5"><h2 className="text-base font-extrabold text-heading">Jobs done</h2><p className="text-[12.5px] text-ink-muted">The job and the client it was done for. Choose No to keep one off the page. Jobs the expert sends in are approved in Expert work.</p></div>
        <ol className="flex flex-col gap-3">
          {jobs.map(({ key: k, row }, n) => (
            <li key={k} className="flex items-start gap-3 rounded-xl border border-line p-3">
              <span className="pt-3 text-sm font-bold text-ink-muted">{n + 1}</span>
              <div className="grid min-w-0 flex-1 gap-2.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)]">
                <input type="hidden" name="ex_job" value={k} />
                <input type="hidden" name={`${k}_id`} value={row?.id ?? ""} />
                <label className={label}>Job<input name={`${k}_name`} defaultValue={row?.title} maxLength={160} placeholder="e.g. Trained 40 bee keepers" className={box} /></label>
                <label className={label}>Client<input name={`${k}_client`} defaultValue={row?.client} maxLength={160} className={box} /></label>
                <label className={label}>Show on the page<select name={`${k}_show`} defaultValue={row && !row.show ? "no" : "yes"} className={box}><option value="yes">Yes</option><option value="no">No</option></select></label>
              </div>
              <button type="button" onClick={() => setJobs((all) => all.filter((x) => x.key !== k))} aria-label={`Remove job ${n + 1}`} className={remove}><Trash2 aria-hidden className="h-4 w-4" /></button>
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => setJobs((all) => [...all, { key: key(), row: null }])} className="btn-outline w-fit gap-1.5 text-sm"><Plus aria-hidden className="h-4 w-4" />Add another job</button>
      </section>
    </>
  );
}
