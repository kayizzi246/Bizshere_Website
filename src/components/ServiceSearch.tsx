import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { SORTS, UPDATED, type Advanced, type Filter } from "@/lib/directory-search";
import { AutoSubmit } from "./AutoSubmit";
import { Icon } from "./Icon";

/**
 * The advanced search for one directory, at the top of its page. Each directory has its own
 * fields (a supplier's brand, a machine's power source, a fund's stage …): the main ones always
 * show; the rest open in the Advanced search panel with the shared keyword tools (exact phrase,
 * words to leave out), freshness and sort order. Picking a value reloads the page with it.
 * Both panels are CSS-only toggles (they work without JavaScript); chosen filters stay visible
 * as chips under the form.
 */
export function ServiceSearch({ path, label, q, filters, values, count, adv, advancedActive }: {
  path: string;
  label: string;
  q: string;
  filters: Filter[];
  values: Record<string, string>;
  /** Number of results shown below; only displayed while a search is active. */
  count: number;
  adv: Advanced;
  advancedActive: boolean;
}) {
  const basic = filters.filter((f) => !f.advanced);
  const extra = filters.filter((f) => f.advanced);
  const active = filters.filter((f) => values[f.name]).map((f) => ({
    name: f.name,
    text: f.options?.length === 1 && f.options[0].value === "1" ? f.label : `${f.label}: ${f.options?.find((o) => o.value === values[f.name])?.label ?? values[f.name]}`,
  }));
  const extras = [
    ...(adv.phrase ? [{ name: "phrase", text: `Phrase: “${adv.phrase}”` }] : []),
    ...(adv.none ? [{ name: "none", text: `Without: ${adv.none}` }] : []),
    ...(adv.updated ? [{ name: "updated", text: UPDATED.find((u) => u.value === adv.updated)!.label }] : []),
  ];
  const searching = Boolean(q || active.length || extras.length);
  // Link that drops one filter (or the keywords) and keeps the rest.
  const without = (key: string) => {
    const p = new URLSearchParams({ ...(q ? { q } : {}), ...values, ...Object.fromEntries(Object.entries(adv).filter(([, v]) => v)) });
    p.delete(key);
    const s = p.toString();
    return s ? `${path}?${s}` : path;
  };
  const id = path.replace(/\W/g, "");
  const select = (name: string, text: string, options: { value: string; label: string }[], value: string, any = "Any") => (
    <label key={name} className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-ink-muted">
      {text}
      <select name={name} defaultValue={value} className={`min-h-[44px] w-full rounded-xl border px-3 text-sm font-medium outline-none focus:border-brand ${value ? "border-brand bg-brand-tint text-brand-dark" : "border-line bg-white text-ink"}`}>
        <option value="">{any}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );

  return (
    <form action={path} role="search" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-3 text-ink sm:p-4">
      <AutoSubmit />
      <div className="flex items-center gap-2">
        <label className="flex min-h-[56px] min-w-0 flex-1 items-center gap-3 rounded-xl border border-line bg-page px-4 focus-within:border-brand focus-within:bg-white sm:px-5">
          <Icon name="search" className="h-5 w-5 shrink-0 text-ink-muted" />
          <span className="sr-only">Search {label.toLowerCase()}</span>
          <input name="q" type="search" enterKeyHint="search" defaultValue={q} placeholder={`Search ${label.toLowerCase()}`} className="w-full min-w-0 bg-transparent text-base text-ink outline-none placeholder:text-ink-muted" />
        </label>
        {basic.length ? (
          <label htmlFor={`filters-${id}`} className="flex min-h-[56px] cursor-pointer items-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold text-heading lg:hidden">
            <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
            Filters{active.length ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] text-white">{active.length}</span> : null}
          </label>
        ) : null}
        {/* Phones: Enter (the keyboard's search key) submits, so the box keeps the room */}
        <button className="btn-primary hidden min-h-[56px] rounded-xl px-7 text-base sm:inline-flex">Search</button>
      </div>

      {/* Main filters: always shown on desktop, behind "Filters" on phones */}
      {basic.length ? (
        <>
          <input id={`filters-${id}`} type="checkbox" className="peer sr-only" aria-label="Show filters" />
          <div className="hidden grid-cols-2 gap-2.5 peer-checked:grid sm:grid-cols-3 lg:!grid lg:grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">
            {basic.map((f) => select(f.name, f.label, f.options ?? [], values[f.name] ?? ""))}
          </div>
        </>
      ) : null}

      {/* Advanced search: this directory's other fields, plus phrase, exclusions, freshness and order */}
      <div className="flex flex-col">
        <input id={`adv-${id}`} type="checkbox" defaultChecked={advancedActive} className="peer sr-only" aria-label="Show advanced search" />
        <label htmlFor={`adv-${id}`} className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-[13px] font-semibold text-brand hover:text-brand-dark peer-focus-visible:ring-2 peer-focus-visible:ring-brand">
          <SlidersHorizontal aria-hidden className="h-4 w-4" />
          Advanced search{advancedActive ? <span className="rounded-full bg-brand px-1.5 text-[11px] text-white">on</span> : null}
        </label>
        {/* Wide layout: every field in one grid (six across on desktop). Capped in height so the pinned
            search never covers the whole screen; it scrolls inside instead. Typed fields wait for
            "Apply" (or Enter); dropdowns and checkboxes apply at once. */}
        <div className="mt-2 hidden max-h-[60vh] flex-col gap-3 overflow-y-auto overscroll-contain rounded-xl border border-line bg-page/60 p-3 peer-checked:flex sm:p-4">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
            <label className="col-span-2 flex flex-col gap-1 text-xs font-semibold text-ink-muted">This exact phrase
              <input name="phrase" defaultValue={adv.phrase} placeholder="e.g. tax compliance" className="input bg-white" />
            </label>
            <label className="col-span-2 flex flex-col gap-1 text-xs font-semibold text-ink-muted">Leave out pages with
              <input name="none" defaultValue={adv.none} placeholder="e.g. used, export" className="input bg-white" />
            </label>
            {extra.filter((f) => !(f.options?.length === 1 && f.options[0].value === "1")).map((f) => select(f.name, f.label, f.options ?? [], values[f.name] ?? ""))}
            {select("updated", "Updated", UPDATED, adv.updated, "Any time")}
            {select("sort", "Sort by", SORTS, adv.sort, "Newest")}
          </div>
          {/* Yes-only filters as checkboxes, then the actions, on one line where there is room */}
          <div className="flex flex-col gap-3 border-t border-line pt-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {extra.filter((f) => f.options?.length === 1 && f.options[0].value === "1").map((f) => (
                <label key={f.name} className="flex min-h-[32px] cursor-pointer items-center gap-2 text-sm text-ink-soft">
                  <input type="checkbox" name={f.name} value="1" defaultChecked={values[f.name] === "1"} data-auto="" className="h-[18px] w-[18px] shrink-0 cursor-pointer rounded accent-brand" />
                  {f.label}
                </label>
              ))}
            </div>
            <div className="flex shrink-0 items-center justify-between gap-4 lg:justify-end">
              <Link href={path} className="text-[13px] font-semibold">Reset</Link>
              <button className="btn-primary min-h-[40px] px-6">Apply</button>
            </div>
          </div>
        </div>
      </div>

      {searching ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3 text-[13px]">
          <span className="mr-1 text-ink-muted"><strong className="text-ink">{count}</strong> {count === 1 ? "result" : "results"}</span>
          {q ? <Chip href={without("q")}>“{q}”</Chip> : null}
          {active.map((a) => <Chip key={a.name} href={without(a.name)}>{a.text}</Chip>)}
          {extras.map((a) => <Chip key={a.name} href={without(a.name)}>{a.text}</Chip>)}
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
