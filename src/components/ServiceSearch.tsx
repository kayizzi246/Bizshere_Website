import Link from "next/link";
import type { Filter } from "@/lib/directory-search";
import { AutoSubmit } from "./AutoSubmit";
import { Icon } from "./Icon";

/**
 * The advanced search for one service, at the top of its directory page.
 * Each service has its own fields (a supplier's country, a machine's type, …) and the
 * results filter right here on the page: picking a value reloads it with that filter.
 * On phones the fields fold behind a "Filters" button (a CSS-only toggle); chosen filters
 * stay visible as chips above the results.
 */
export function ServiceSearch({ path, label, q, filters, values, count }: {
  path: string;
  label: string;
  q: string;
  filters: Filter[];
  values: Record<string, string>;
  /** Number of results shown below; only displayed while a search is active. */
  count: number;
}) {
  const active = filters.filter((f) => values[f.name]).map((f) => ({ name: f.name, label: f.label, shown: f.options?.find((o) => o.value === values[f.name])?.label ?? values[f.name] }));
  const searching = Boolean(q || active.length);
  // Link that drops one filter (or the keywords) and keeps the rest.
  const without = (key: string) => {
    const p = new URLSearchParams({ ...(q ? { q } : {}), ...values });
    p.delete(key);
    const s = p.toString();
    return s ? `${path}?${s}` : path;
  };
  const toggle = `filters-${path.replace(/\W/g, "")}`;

  return (
    <form action={path} role="search" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-3 sm:p-4">
      <AutoSubmit />
      <div className="flex items-center gap-2">
        <label className="flex min-h-[46px] min-w-0 flex-1 items-center gap-2.5 rounded-full border border-line bg-page px-4 focus-within:border-brand focus-within:bg-white">
          <Icon name="search" className="h-4 w-4 shrink-0 text-ink-muted" />
          <span className="sr-only">Search {label.toLowerCase()}</span>
          <input name="q" type="search" enterKeyHint="search" defaultValue={q} placeholder={`Search ${label.toLowerCase()}`} className="w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted" />
        </label>
        {filters.length ? (
          <label htmlFor={toggle} className="flex min-h-[46px] cursor-pointer items-center gap-2 rounded-full border border-line px-4 text-[13px] font-semibold text-brand-deep lg:hidden">
            <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
            Filters{active.length ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] text-white">{active.length}</span> : null}
          </label>
        ) : null}
        {/* Phones: Enter (the keyboard's search key) submits, so the box keeps the room */}
        <button className="btn-primary hidden min-h-[46px] rounded-full px-5 sm:inline-flex">Search</button>
      </div>

      {filters.length ? (
        <>
          <input id={toggle} type="checkbox" className="peer sr-only" aria-label="Show filters" />
          <div className="hidden grid-cols-2 gap-2.5 peer-checked:grid sm:grid-cols-3 lg:!grid lg:grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">
            {filters.map((f) => (
              <label key={f.name} className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-ink-muted">
                {f.label}
                <select name={f.name} defaultValue={values[f.name] ?? ""} className={`min-h-[42px] w-full rounded-xl border px-3 text-sm font-medium outline-none focus:border-brand ${values[f.name] ? "border-brand bg-brand-tint text-brand-dark" : "border-line bg-white text-ink"}`}>
                  <option value="">Any</option>
                  {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
            ))}
          </div>
        </>
      ) : null}

      {searching ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3 text-[13px]">
          <span className="mr-1 text-ink-muted"><strong className="text-ink">{count}</strong> {count === 1 ? "result" : "results"}</span>
          {q ? <Chip href={without("q")}>“{q}”</Chip> : null}
          {active.map((a) => <Chip key={a.name} href={without(a.name)}>{a.label}: {a.shown}</Chip>)}
          <Link href={path} className="ml-auto font-semibold">Clear all</Link>
        </div>
      ) : null}
    </form>
  );
}

function Chip({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-3 py-1 font-medium text-brand-dark hover:bg-brand hover:text-white">
      <span className="sr-only">Remove filter</span>{children} <span aria-hidden>×</span>
    </Link>
  );
}
