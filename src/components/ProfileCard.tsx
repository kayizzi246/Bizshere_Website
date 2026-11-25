import { Icon } from "./Icon";

/** One detail: its label picks the icon; `tags` shows a list as chips across the full width. Empty ones are left out. */
export type ProfileRow = [label: string, value: React.ReactNode] | { label: string; tags: string[] };

const ICONS: Record<string, string> = {
  "Contact person": "expert", Address: "pin", Phone: "phone", WhatsApp: "forum", Country: "flag", District: "pin", Email: "mail", Website: "link",
  Category: "dashboard", "Business type": "store", "What they sell": "supplier", Specialty: "tip", Profile: "files", Catalogue: "files",
};

/**
 * The top card of a supplier's and an expert's page (client, 24 Nov 2026): the picture with the name under it, beside
 * the details in two columns, each with its icon. Member detail arrives as a lock from the page, never as the value.
 */
export function ProfileCard({ label, photo, name, sub, rows, big = false }: { label: string; photo: string | null; name: string; sub?: string | null; rows: ProfileRow[]; /** A bigger picture (expert and supplier pages, client 25 Nov 2026). */ big?: boolean }) {
  const all = rows.map((r) => (Array.isArray(r) ? { label: r[0], value: r[1], tags: null } : { label: r.label, value: null, tags: r.tags }));
  const details = all.filter((r) => r.tags === null && r.value !== null && r.value !== undefined && r.value !== "" && r.value !== false);
  const lists = all.filter((r) => r.tags?.length);
  const icon = (key: string) => <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand"><Icon name={ICONS[key] ?? "check"} className="h-4 w-4" strokeWidth={1.9} /></span>;
  return (
    <section aria-label={label} className={`grid grid-cols-[minmax(0,1fr)] overflow-hidden rounded-2xl border border-line bg-white ${big ? "md:grid-cols-[minmax(0,360px)_minmax(0,1fr)]" : "md:grid-cols-[minmax(0,280px)_minmax(0,1fr)]"}`}>
      <div className="flex flex-col border-b border-line md:border-b-0 md:border-r">
        <div className={`flex flex-1 items-center justify-center bg-white ${big ? "min-h-[260px] p-3" : "min-h-[200px] p-4"}`}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- uploaded or editor-entered address
            <img src={photo} alt={name} data-nofit="" className={`${big ? "max-h-[400px]" : "max-h-[260px]"} w-full rounded-xl object-contain`} />
          ) : <span aria-hidden className={`flex items-center justify-center rounded-2xl bg-brand-tint font-display font-extrabold text-brand ${big ? "h-40 w-40 text-[52px]" : "h-28 w-28 text-[38px]"}`}>{name.split(/ +/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</span>}
        </div>
        <div className="flex flex-col gap-0.5 border-t border-line bg-page px-4 py-4 text-center">
          <span className="font-display text-[16px] font-extrabold leading-snug text-heading">{name}</span>
          {sub ? <span className="text-[13px] text-ink-soft">{sub}</span> : null}
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-5 p-5 sm:p-6">
        <dl className="grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-5 sm:grid-cols-2">
          {details.map((r) => (
            <div key={r.label} className="flex min-w-0 items-start gap-3">
              {icon(r.label)}
              <div className="flex min-w-0 flex-col gap-0.5">
                <dt className="text-[12px] leading-tight text-ink-muted">{r.label}</dt>
                <dd className="min-w-0 text-[14px] font-medium leading-snug text-heading [overflow-wrap:anywhere]">{r.value}</dd>
              </div>
            </div>
          ))}
        </dl>
        {lists.map((r) => (
          <div key={r.label} className="flex items-start gap-3 border-t border-line pt-5">
            {icon(r.label)}
            <div className="flex min-w-0 flex-col gap-2">
              <span className="text-[12px] leading-tight text-ink-muted">{r.label}</span>
              <ul className="flex flex-wrap gap-1.5">
                {r.tags!.map((t) => <li key={t} className="rounded-full border border-line bg-page px-3 py-1 text-[13px] font-medium text-heading">{t}</li>)}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
