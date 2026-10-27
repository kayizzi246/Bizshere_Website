import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { getViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { contentTypeLabel, contentTypePath, date, money } from "@/lib/format";
import { filtersFor, parseTab, searchListings, searchPrices, TABS, type Tab } from "@/lib/directory-search";
import { saveSearch } from "@/app/actions/member";
import { Gate } from "@/components/Gate";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search" };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => ((Array.isArray(v) ? v[0] : v) ?? "").trim();
const cap = (s?: string | null) => (s ? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ") : null);

/** Search is open to everyone. Only member-only values (contacts, prices, amounts) stay locked. */
export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const tab = parseTab(one(searchParams.in) || legacyTab(searchParams));
  const q = one(searchParams.q);
  const filters = await filtersFor(tab);
  const values: Record<string, string> = Object.fromEntries(filters.map((f) => [f.name, one(searchParams[f.name])]).filter(([, v]) => v));
  const viewer = await getViewer();

  const [listings, prices] = await Promise.all([
    tab === "PRICES" ? Promise.resolve([]) : searchListings(tab, q, values),
    tab === "PRICES" ? searchPrices(q, values) : Promise.resolve([]),
  ]);
  const count = tab === "PRICES" ? prices.length : listings.length;
  await prisma.searchEvent.create({ data: { userId: viewer.userId, query: q, filters: { tab, ...values }, resultsCount: count } }).catch(() => undefined);

  const url = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams({ in: tab, ...(q ? { q } : {}), ...values });
    for (const [k, v] of Object.entries(patch)) (v === null ? p.delete(k) : p.set(k, v));
    if (p.get("in") === "ALL") p.delete("in");
    const s = p.toString();
    return s ? `/search?${s}` : "/search";
  };
  const active = filters.filter((f) => values[f.name]).map((f) => ({ ...f, shown: f.options?.find((o) => o.value === values[f.name])?.label ?? values[f.name] }));
  const tabLabel = TABS.find((t) => t.id === tab)!.label;

  return (
    <form action="/search">
      {tab !== "ALL" ? <input type="hidden" name="in" value={tab} /> : null}

      {/* ── Search bar and service tabs ── */}
      <section className="border-b border-line bg-white">
        <div className="container-site flex flex-col gap-5 pt-6">
          <h1 className="text-2xl font-extrabold">Search</h1>
          <div className="flex gap-2">
            <label className="flex min-h-[52px] flex-1 items-center gap-3 rounded-xl border border-line-strong bg-white px-4 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
              <Icon name="search" className="h-5 w-5 shrink-0 text-ink-muted" />
              <span className="sr-only">Search {tabLabel.toLowerCase()}</span>
              <input name="q" type="search" defaultValue={q} placeholder={PLACEHOLDER[tab]} className="w-full bg-transparent text-base outline-none placeholder:text-ink-muted" />
            </label>
            <button className="btn-primary min-h-[52px] px-6">Search</button>
          </div>
          <nav aria-label="What to search" className="-mb-px flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <Link key={t.id} href={`/search?${new URLSearchParams({ ...(t.id !== "ALL" ? { in: t.id } : {}), ...(q ? { q } : {}) })}`} aria-current={t.id === tab ? "page" : undefined}
                className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold ${t.id === tab ? "border-brand text-brand" : "border-transparent text-ink-muted hover:text-ink"}`}>
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <div className="container-site grid gap-6 py-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
        {/* ── Filters for this service, always open ── */}
        <aside className="card flex flex-col gap-4 p-5 lg:sticky lg:top-24">
          <h2 className="text-base font-extrabold">{tab === "ALL" ? "Narrow it down" : `Filter ${tabLabel.toLowerCase()}`}</h2>
          {filters.length ? (
            <>
              {filters.map((f) => (
                <label key={f.name} className="label text-[13px]">
                  {f.label}
                  <select name={f.name} defaultValue={values[f.name] ?? ""} className="input min-h-[42px] text-sm">
                    <option value="">Any</option>
                    {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
              ))}
              <button className="btn-primary min-h-[42px]">Apply filters</button>
              {active.length ? <Link href={url(Object.fromEntries(filters.map((f) => [f.name, null])))} className="text-center text-sm font-semibold">Clear filters</Link> : null}
            </>
          ) : (
            <p className="text-sm leading-relaxed text-ink-muted">Pick a service above to filter by its own details, like a supplier&apos;s country or an expert&apos;s specialty.</p>
          )}
        </aside>

        {/* ── Results ── */}
        <section className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-soft"><strong className="text-ink">{count}</strong> {count === 1 ? "result" : "results"}{q ? <> for <strong className="text-ink">“{q}”</strong></> : null}{tab !== "ALL" ? <> in {tabLabel.toLowerCase()}</> : null}</p>
            {q && viewer.userId && tab !== "PRICES" ? (
              <>
                {/* Read by saveSearch (a server action can't read the button's own name/value) */}
                <input type="hidden" name="query" value={q} />
                {tab !== "ALL" ? <input type="hidden" name="types" value={tab} /> : null}
                <button formAction={saveSearch} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-dark">
                  <Icon name="bell" className="h-4 w-4" /> Save this search
                </button>
              </>
            ) : null}
          </div>

          {active.length ? (
            <ul className="flex flex-wrap gap-2">
              {active.map((f) => (
                <li key={f.name}>
                  <Link href={url({ [f.name]: null })} className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand-tint px-3 py-1 text-xs font-semibold text-brand-dark hover:border-brand">
                    {f.label}: {f.shown} <span aria-hidden>×</span><span className="sr-only">Remove filter</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          {count === 0 ? (
            <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
              <Icon name="search" className="h-8 w-8 text-ink-muted" />
              <p className="font-semibold">Nothing matches yet</p>
              <p className="text-sm text-ink-muted">Try fewer words, or remove a filter.</p>
            </div>
          ) : null}

          {tab === "PRICES" ? (
            prices.length ? (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="table-base min-w-[760px]">
                    <thead><tr><th>Product</th><th>Market</th><th>District</th><th>Country</th><th>Min price</th><th>Max price</th><th>Observed</th></tr></thead>
                    <tbody>
                      {prices.map((p) => {
                        const district = p.market.location?.type === "DISTRICT" ? p.market.location : null;
                        return (
                          <tr key={p.id}>
                            <td className="font-semibold">{p.product.name}<span className="block text-xs font-normal text-ink-muted">{p.quotedUnit}</span></td>
                            <td>{p.market.name}</td>
                            <td className="text-ink-muted">{district?.name ?? "—"}</td>
                            <td className="text-ink-muted">{district?.parent?.name ?? p.market.location?.name ?? "—"}</td>
                            {viewer.isMember ? (
                              <><td className="font-semibold">{money(p.priceMin, p.currency, "—")}</td><td className="font-semibold">{money(p.priceMax, p.currency, "—")}</td></>
                            ) : (
                              <td colSpan={2} className="text-ink-muted"><span className="inline-flex items-center gap-1 text-xs"><LockSmall /> Members only</span></td>
                            )}
                            <td className="whitespace-nowrap text-ink-muted">{date(p.observedAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {!viewer.isMember ? <div className="border-t border-line p-4"><Gate compact button="Show prices" modalTitle="Subscribe to see market prices" /></div> : null}
              </div>
            ) : null
          ) : (
            <ul className="flex flex-col gap-2.5">
              {listings.map((i) => {
                const href = `${contentTypePath[i.contentType]}/${i.slug}`;
                return (
                  <li key={i.id}>
                    <Link href={href} className="group card flex items-start gap-4 p-4 text-ink transition hover:border-brand/50 hover:text-ink sm:p-5">
                      <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand sm:flex"><Icon name={ICON[i.contentType] ?? "link"} className="h-5 w-5" /></span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="text-xs font-semibold text-ink-muted">{contentTypeLabel[i.contentType]}{i.primaryCategory ? ` · ${i.primaryCategory.name}` : ""}</span>
                        <span className="font-display text-base font-extrabold leading-snug group-hover:text-brand">{i.title}</span>
                        {i.shortSummary ? <span className="line-clamp-2 text-sm text-ink-soft">{i.shortSummary}</span> : null}
                        <Facts item={i} />
                      </span>
                      <Icon name="arrow" className="mt-1 h-4 w-4 shrink-0 text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </form>
  );
}

const PLACEHOLDER: Record<Tab, string> = {
  ALL: "Search ideas, machines, suppliers, funding…",
  BUSINESS_IDEA: "e.g. bakery, poultry, soap",
  MACHINE: "e.g. hammer mill, oven, sealer",
  SUPPLIER: "e.g. packaging, seeds",
  FUNDING_PROGRAMME: "e.g. youth grant, equipment loan",
  GUIDE: "e.g. EFRIS, export licence",
  CONSULTANT: "e.g. tax, coffee, export",
  TOOL: "e.g. VAT calculator, cash flow",
  PRICES: "e.g. rice, Owino",
  WEBSITE: "e.g. tax returns, registration",
  NEWS: "e.g. training, internships",
  RECIPE: "Search recipes",
  INVESTMENT_OPPORTUNITY: "Search opportunities",
};

const ICON: Record<string, string> = { BUSINESS_IDEA: "idea", MACHINE: "machine", SUPPLIER: "supplier", FUNDING_PROGRAMME: "funding", GUIDE: "guide", CONSULTANT: "expert", TOOL: "tool", WEBSITE: "link", NEWS: "news" };

type Listing = Awaited<ReturnType<typeof searchListings>>[number];

/** One line of public facts per result, in the client's field names. */
function Facts({ item: i }: { item: Listing }) {
  const org = i.fundingProgramme?.provider.organization;
  const facts: (string | null | undefined)[] =
    i.businessIdea ? [i.businessIdea.businessType]
    : i.machine ? [i.machine.machineType, i.machine.function]
    : i.supplier ? [cap(i.supplier.supplierType), i.supplier.country, i.supplier.items.slice(0, 3).join(", ")]
    : i.fundingProgramme ? [cap(i.fundingProgramme.fundingType), org?.tradingName ?? org?.legalName, i.fundingProgramme.providerCategory ?? i.fundingProgramme.provider.providerCategory]
    : i.guide ? [i.guide.resourceType]
    : i.consultant ? [i.consultant.specialties.join(", "), [i.consultant.district, i.consultant.country].filter(Boolean).join(", ")]
    : i.tool ? [cap(i.tool.toolType)]
    : i.website ? [i.website.siteType, i.website.mainFunction]
    : [];
  const shown = facts.filter((f): f is string => Boolean(f));
  return shown.length ? <span className="line-clamp-1 text-xs text-ink-muted">{shown.join(" · ")}</span> : null;
}

/** Old links (/search?types=MACHINE or ?type=…) still land on the right tab. */
function legacyTab(sp: SP): string {
  const t = sp.types ?? sp.type;
  return (Array.isArray(t) ? t[0] : t) ?? "";
}

function LockSmall() {
  return <LockKeyhole aria-hidden className="h-3.5 w-3.5" />;
}
