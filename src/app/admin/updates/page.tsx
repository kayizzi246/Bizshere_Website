import { prisma } from "@/lib/prisma";
import { date } from "@/lib/format";
import { liveSiteUpdates, updateState, type UpdateState } from "@/lib/site-updates";
import { UpdatesMarquee } from "@/components/UpdatesMarquee";
import { createUpdate, deleteUpdate, moveUpdate, saveUpdate, toggleUpdate } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Homepage updates" };

const STATE: Record<UpdateState, [string, string]> = {
  live: ["badge-ok", "Live"],
  scheduled: ["badge-info", "Scheduled"],
  ended: ["badge-muted", "Ended"],
  hidden: ["badge-muted", "Hidden"],
};

/** YYYY-MM-DD in Kampala time, for date inputs. */
const dayValue = (d: Date | null) => (d ? new Date(d.getTime() + 3 * 3_600_000).toISOString().slice(0, 10) : "");

export default async function AdminUpdatesPage({ searchParams }: { searchParams: { error?: string; added?: string; saved?: string; deleted?: string } }) {
  const [updates, live] = await Promise.all([
    prisma.siteUpdate.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    liveSiteUpdates(),
  ]);
  const notice = searchParams.added ? "Update added." : searchParams.saved ? "Changes saved." : searchParams.deleted ? "Update deleted." : null;

  return (
    <>
      <div><h1 className="text-3xl font-extrabold tracking-tight">Homepage updates</h1><p className="text-sm text-ink-muted">Short messages that scroll across the homepage under the main banner. Changes show on the site straight away.</p></div>
      {searchParams.error ? <p role="alert" className="rounded-xl bg-bad-bg p-4 text-sm font-semibold text-bad-fg">{searchParams.error}</p> : null}
      {notice ? <p role="status" className="rounded-xl bg-brand-tint p-4 text-sm font-bold text-brand-dark">{notice}</p> : null}

      <section className="card flex flex-col gap-3 overflow-hidden p-6">
        <h2 className="text-lg font-extrabold">Preview</h2>
        {live.length ? (
          <div className="-mx-6 [&_.container-site]:max-w-none"><UpdatesMarquee updates={live} /></div>
        ) : (
          <p className="text-sm text-ink-muted">Nothing is live, so the bar is hidden on the homepage.</p>
        )}
      </section>

      <form action={createUpdate} className="card flex flex-col gap-4 p-6">
        <h2 className="text-lg font-extrabold">Add an update</h2>
        <label className="label">Message<input name="message" required maxLength={200} placeholder="e.g. New equipment loan round opens 1 November" className="input" /></label>
        <div className="flex flex-wrap gap-3.5">
          <label className="label flex-[2_1_260px]">Link (optional)<input name="href" placeholder="/funding or https://…" className="input" /></label>
          <label className="label flex-[1_1_160px]">Show from (optional)<input name="startsAt" type="date" className="input" /></label>
          <label className="label flex-[1_1_160px]">Show until (optional)<input name="endsAt" type="date" className="input" /></label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked className="h-4 w-4 accent-brand" />Show on the homepage</label>
          <button className="btn-primary">Add update</button>
        </div>
      </form>

      <section className="card overflow-hidden">
        <h2 className="p-5 text-lg font-extrabold">All updates <span className="font-semibold text-ink-muted">({updates.length})</span></h2>
        <p className="-mt-3 px-5 pb-4 text-sm text-ink-muted">They scroll in this order. Use the arrows to reorder.</p>
        {updates.length === 0 ? <p className="border-t border-line p-5 text-sm text-ink-muted">No updates yet.</p> : null}
        {updates.map((u, i) => {
          const [badge, label] = STATE[updateState(u)];
          return (
            <form key={u.id} action={saveUpdate} className="flex flex-col gap-3 border-t border-line p-5">
              <input type="hidden" name="id" value={u.id} />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-extrabold text-ink-muted">#{i + 1}</span>
                <span className={badge}>{label}</span>
                {u.startsAt ? <span className="text-xs text-ink-muted">from {date(u.startsAt)}</span> : null}
                {u.endsAt ? <span className="text-xs text-ink-muted">until {date(u.endsAt)}</span> : null}
                <span className="ml-auto flex gap-1.5">
                  <button formAction={moveUpdate.bind(null, "up")} formNoValidate disabled={i === 0} aria-label="Move up" className="btn-outline min-h-[36px] px-3 disabled:opacity-40">↑</button>
                  <button formAction={moveUpdate.bind(null, "down")} formNoValidate disabled={i === updates.length - 1} aria-label="Move down" className="btn-outline min-h-[36px] px-3 disabled:opacity-40">↓</button>
                </span>
              </div>
              <label className="label">Message<input name="message" required maxLength={200} defaultValue={u.message} className="input" /></label>
              <div className="flex flex-wrap gap-3.5">
                <label className="label flex-[2_1_260px]">Link<input name="href" defaultValue={u.href ?? ""} placeholder="/funding or https://…" className="input" /></label>
                <label className="label flex-[1_1_160px]">Show from<input name="startsAt" type="date" defaultValue={dayValue(u.startsAt)} className="input" /></label>
                <label className="label flex-[1_1_160px]">Show until<input name="endsAt" type="date" defaultValue={dayValue(u.endsAt)} className="input" /></label>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={u.isActive} className="h-4 w-4 accent-brand" />Show on the homepage</label>
                <span className="flex flex-wrap gap-2">
                  <button formAction={deleteUpdate} formNoValidate className="btn-danger">Delete</button>
                  <button formAction={toggleUpdate} formNoValidate className="btn-outline">{u.isActive ? "Hide now" : "Show now"}</button>
                  <button className="btn-primary">Save</button>
                </span>
              </div>
            </form>
          );
        })}
      </section>
    </>
  );
}
