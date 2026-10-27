import { filtersFor, TABS, type Tab } from "@/lib/directory-search";
import { AutoSubmit } from "./AutoSubmit";
import { Icon } from "./Icon";

/**
 * The advanced search for one service, shown at the top of its directory page.
 * Each service has its own fields (a supplier's country, a machine's type, …).
 * Picking a value opens the full results on /search with that filter applied.
 */
export async function ServiceSearch({ tab }: { tab: Tab }) {
  const filters = await filtersFor(tab);
  const label = TABS.find((t) => t.id === tab)?.label ?? "this directory";
  return (
    <form action="/search" className="card flex flex-col gap-4 p-4 sm:p-5">
      <input type="hidden" name="in" value={tab} />
      <AutoSubmit />
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-extrabold"><Icon name="search" className="h-4 w-4 text-brand" /> Search {label.toLowerCase()}</h2>
        <span className="hidden text-xs text-ink-muted sm:inline">Pick any option to see matches</span>
      </div>
      <div className="flex flex-wrap gap-3 [&>label]:min-w-0">
        <label className="label flex-[2_1_240px] text-[13px]">
          Keywords
          <input name="q" type="search" placeholder="Type and press Enter" className="input min-h-[44px] text-sm" />
        </label>
        {filters.map((f) => (
          <label key={f.name} className="label flex-[1_1_160px] text-[13px]">
            {f.label}
            <select name={f.name} defaultValue="" className="input min-h-[44px] text-sm">
              <option value="">Any</option>
              {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        ))}
      </div>
      <noscript><button className="btn-primary min-h-[42px]">Search</button></noscript>
    </form>
  );
}
