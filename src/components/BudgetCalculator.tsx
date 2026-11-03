"use client";

import { useMemo, useState } from "react";
import {
  Boxes, Check, ClipboardList, FileDown, FileText, LockKeyhole, Megaphone, Minus, Monitor, Plus, Scale, Search, ShoppingCart, Store, Wallet, Wrench, X,
  type LucideIcon,
} from "lucide-react";

export type CalcLine = { id: string; category: string; item: string; details: string | null; qty: number; unit: string | null; price: number | null; reason: string | null; optional: boolean };
export type CalcPlan = {
  level: string; label: string; scale: string | null; currency: string; place: string; asOf: string | null;
  lines: CalcLine[];
  /** Counts over every line, including any a visitor isn't sent. */
  count: { all: number; optional: number; priced: number; pricedEssential: number };
  /** Members only: the essential total and the total with optional items (null when not sent or not every line is priced). */
  totals: { essential: number | null; all: number | null } | null;
};

const fmt = (n: number, currency: string) => `${currency} ${Math.round(n).toLocaleString("en-UG")}`;
const slug = (s: string) => `req-${s.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

// An icon per common cost category; anything else gets the checklist icon.
const CATEGORY_ICON: [RegExp, LucideIcon][] = [
  [/legal|licen|permit|regist/i, Scale], [/equip|machine|tool/i, Wrench], [/software|tech|computer/i, Monitor], [/document|paper/i, FileText],
  [/brand|market|advert/i, Megaphone], [/premis|rent|shop|building/i, Store], [/stock|material|inventory|supplies/i, Boxes], [/operat|expense|wage|salar/i, Wallet],
];
const iconFor = (category: string) => CATEGORY_ICON.find(([re]) => re.test(category))?.[1] ?? ClipboardList;

/**
 * The start-up budget as a calculator: pick a business size, see the estimate from its essential
 * items (optionally with the nice-to-haves), then go through every requirement by category, as
 * cards with what it is and what it costs, and add the ones you need to your own list.
 *
 * When something is in "My list", "Download my plan" gives the business plan PDF with just those
 * items and quantities. Nothing sticks to the screen except, on phones, the "View my list" bar.
 * Gated visitors are sent only the free preview of the lines and no totals; the server decides.
 */
export function BudgetCalculator({ name, plans, initial, gated, unlockHref, hidden, pdfHref }: { name: string; plans: CalcPlan[]; initial: string; gated: boolean; unlockHref: string; hidden: Record<string, number>; pdfHref: string }) {
  const [level, setLevel] = useState(initial);
  const [withOptional, setWithOptional] = useState(false);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "essential" | "optional">("all");
  const [mine, setMine] = useState<Record<string, number>>({}); // line id → quantity
  const [listOpen, setListOpen] = useState(false); // phones: my list as a sheet from the bottom

  const plan = plans.find((p) => p.level === level) ?? plans[0];
  const cats = useMemo(() => [...plan.lines.reduce((m, l) => m.set(l.category, [...(m.get(l.category) ?? []), l]), new Map<string, CalcLine[]>())], [plan]);
  const matches = (l: CalcLine) => (kind === "all" || (kind === "optional") === l.optional) && (!q || `${l.item} ${l.category} ${l.details ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const sections = cats.map(([c, all]) => ({ c, all, shown: all.filter(matches) })).filter((s) => s.shown.length);
  const picked = plan.lines.filter((l) => mine[l.id]);
  const myTotal = picked.reduce((s, l) => s + (l.price ?? 0) * mine[l.id], 0);
  const myUnpriced = picked.filter((l) => l.price === null).length;
  const estimate = plan.totals ? (withOptional ? plan.totals.all : plan.totals.essential) : null;
  const essential = plan.count.all - plan.count.optional;

  // "Download my plan": the business plan PDF with only the picked items and quantities.
  const myPlanHref = `${pdfHref}?scenario=${plan.level}&items=${picked.map((l) => `${l.id}:${mine[l.id]}`).join(",")}`;

  const pick = (l: CalcLine, n: number) => setMine((m) => {
    const next = { ...m };
    if (n > 0) next[l.id] = n; else delete next[l.id];
    return next;
  });
  const switchTo = (lv: string) => { setLevel(lv); setMine({}); };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="flex min-w-0 flex-col gap-4">
        {/* ── Size and estimate ── */}
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-3 sm:p-4">
          {plans.length > 1 ? (
            <div className="flex flex-col gap-2.5">
              <div role="radiogroup" aria-label="Business size" className="grid gap-2" style={{ gridTemplateColumns: `repeat(${plans.length}, minmax(0, 1fr))` }}>
                {plans.map((p) => (
                  <button key={p.level} type="button" role="radio" aria-checked={p.level === plan.level} onClick={() => switchTo(p.level)}
                    className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${p.level === plan.level ? "border-brand bg-brand text-white" : "border-line bg-white text-brand hover:border-brand"}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="flex flex-col items-center gap-1 rounded-xl bg-brand-tint px-4 py-4 text-center">
            <span className="text-sm text-ink-soft">Start-up cost{plans.length > 1 ? `, ${plan.label.toLowerCase()} business` : ""}{plan.scale ? ` (${plan.scale})` : ""}</span>
            {gated ? (
              <a href={unlockHref} data-onboard="" className="inline-flex items-center gap-2 py-1 font-display text-xl font-bold text-brand"><LockKeyhole aria-hidden className="h-5 w-5" />Unlock the estimate</a>
            ) : (
              <span className="font-display text-3xl font-extrabold tracking-tight text-brand-deep sm:text-4xl">{estimate === null ? "Some costs pending" : fmt(estimate, plan.currency)}</span>
            )}
            {/* Only say how many items are counted when some are not priced yet */}
            <span className="text-xs text-ink-muted">
              {withOptional
                ? plan.count.priced < plan.count.all ? `${plan.count.all - plan.count.priced} items not priced yet · ` : ""
                : plan.count.pricedEssential < essential ? `${essential - plan.count.pricedEssential} items not priced yet · ` : ""}
              {plan.place} prices{plan.asOf ? `, ${plan.asOf}` : ""}
            </span>
            {plan.count.optional ? (
              <label className="mt-1 inline-flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
                <input type="checkbox" checked={withOptional} onChange={(e) => setWithOptional(e.target.checked)} className="h-4 w-4 accent-[#157EC2]" />
                Include {plan.count.optional} optional {plan.count.optional === 1 ? "item" : "items"}
              </label>
            ) : null}
          </div>
        </div>

        {/* ── Every requirement, by category ── */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-3 sm:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">Search requirements</span>
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items" className="input w-full pl-9" />
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-muted">Show
              <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className="input">
                <option value="all">All</option><option value="essential">Must-have</option><option value="optional">Optional</option>
              </select>
            </label>
          </div>

          {/* Each category: its name, then must-have items before optional ones */}
          {sections.map(({ c, shown }) => (
            <section key={c} id={slug(c)} aria-label={c} className="flex flex-col gap-2">
              <h4 className="flex items-baseline gap-2 font-display text-lg font-extrabold text-heading">{c}<span className="text-sm font-medium text-ink-muted">{shown.length}</span></h4>
              {[...shown.filter((l) => !l.optional), ...shown.filter((l) => l.optional)].map((l) => (
                <RequirementCard key={l.id} l={l} currency={plan.currency} added={mine[l.id] ?? 0} onToggle={() => pick(l, mine[l.id] ? 0 : l.qty || 1)} />
              ))}
            </section>
          ))}
          {sections.length === 0 ? <p className="rounded-2xl border border-dashed border-line-strong bg-white px-5 py-10 text-center text-sm text-ink-muted">No requirements match. Clear the search or change the filter.</p> : null}
          {hidden[plan.level] ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-5 py-4">
              <span className="text-sm text-ink-muted">{hidden[plan.level]} more {hidden[plan.level] === 1 ? "requirement" : "requirements"}, with prices and the totals</span>
              <a href={unlockHref} data-onboard="" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand"><LockKeyhole aria-hidden className="h-3.5 w-3.5" />Unlock the full list</a>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Phones: my list as a bar along the bottom once something is added; it opens as a sheet ── */}
      {picked.length && !listOpen ? (
        <div data-list-bar="" className="fixed inset-x-0 bottom-0 z-[41] border-t border-line bg-white lg:hidden">
          <div className="container-site flex items-center gap-3 py-3">
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="text-xs text-ink-muted">{picked.length} {picked.length === 1 ? "item" : "items"} in my list</span>
              <span className="font-display text-lg font-extrabold text-brand-deep">{fmt(myTotal, plan.currency)}{myUnpriced ? <span className="font-sans text-xs font-normal text-ink-muted"> + {myUnpriced} unpriced</span> : null}</span>
            </span>
            <button type="button" onClick={() => setListOpen(true)} className="ml-auto inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white"><ShoppingCart aria-hidden className="h-4 w-4" />View my list</button>
          </div>
        </div>
      ) : null}
      {listOpen ? <div aria-hidden onClick={() => setListOpen(false)} className="fixed inset-0 z-[60] bg-black/45 lg:hidden" /> : null}

      {/* ── My list: the visitor's own selection and total (beside the list on wide screens) ── */}
      <aside aria-label="My requirements list"
        className={`flex-col rounded-2xl border border-line bg-white lg:inset-auto lg:z-auto lg:flex lg:max-h-none lg:rounded-b-2xl ${listOpen ? "fixed inset-x-0 bottom-0 z-[61] flex max-h-[85vh] overflow-y-auto rounded-b-none" : "hidden"}`}>
        <h3 className="flex items-center justify-between gap-2 border-b border-line px-5 py-4 font-display text-[15px] font-extrabold text-heading">
          <span className="flex items-center gap-2">My requirements list{picked.length ? <span className="rounded-full bg-brand px-2 text-xs text-white">{picked.length}</span> : null}</span>
          <button type="button" onClick={() => setListOpen(false)} aria-label="Close my list" className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-page lg:hidden"><X className="h-4 w-4" /></button>
        </h3>
        {picked.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-tint text-brand"><ShoppingCart aria-hidden className="h-7 w-7" /></span>
            <span className="font-display text-base font-bold text-heading">Your list is empty</span>
            <span className="text-[13px] text-ink-muted">Tap <strong>+ Add</strong> to build your plan.</span>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-line lg:max-h-[420px] lg:overflow-y-auto">
              {picked.map((l) => (
                <li key={l.id} className="flex flex-col gap-2 px-5 py-3">
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-heading">{l.item}</span>
                    <button type="button" onClick={() => pick(l, 0)} aria-label={`Remove ${l.item}`} className="text-ink-muted hover:text-bad-fg"><X className="h-4 w-4" /></button>
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center rounded-lg border border-line">
                      <button type="button" onClick={() => pick(l, mine[l.id] - 1)} aria-label="Fewer" className="flex h-7 w-7 items-center justify-center text-ink-soft hover:text-brand"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="min-w-8 text-center text-sm font-semibold">{mine[l.id]}</span>
                      <button type="button" onClick={() => pick(l, mine[l.id] + 1)} aria-label="More" className="flex h-7 w-7 items-center justify-center text-ink-soft hover:text-brand"><Plus className="h-3.5 w-3.5" /></button>
                    </span>
                    <span className="text-sm font-semibold">{l.price === null ? <span className="font-normal text-ink-muted">Price pending</span> : fmt(l.price * mine[l.id], plan.currency)}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-1 border-t-2 border-heading px-5 py-4">
              <span className="flex items-baseline justify-between gap-2"><span className="font-bold">My total</span><span className="font-display text-xl font-extrabold text-brand-deep">{fmt(myTotal, plan.currency)}</span></span>
              {myUnpriced ? <span className="text-xs text-ink-muted">Plus {myUnpriced} {myUnpriced === 1 ? "item" : "items"} not yet priced</span> : null}
              <a href={`${myPlanHref}&download=1`} className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-accent px-5 text-[14px] font-semibold text-ink hover:bg-brand hover:text-white"><FileDown aria-hidden className="h-4 w-4" />Download my plan (PDF)</a>
              <span className="mt-1 flex items-center justify-between gap-2">
                <a href={myPlanHref} target="_blank" rel="noopener" className="text-xs font-semibold text-brand hover:text-brand-dark">View my plan</a>
                <button type="button" onClick={() => setMine({})} className="text-xs font-semibold text-ink-muted hover:text-bad-fg">Clear my list</button>
              </span>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

/**
 * One requirement as a single row: icon, name (marked "Optional" when it is), a short note;
 * then the cost and "Add". Must-have is the default, so it carries no label.
 */
function RequirementCard({ l, currency, added, onToggle }: { l: CalcLine; currency: string; added: number; onToggle: () => void }) {
  const I = iconFor(l.category);
  const qty = `${l.qty.toLocaleString("en-UG")}${l.unit ? ` ${l.unit}` : ""}`;
  return (
    <article className={`flex flex-col gap-3 rounded-2xl border bg-white p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4 ${added ? "border-brand" : "border-line"}`}>
      <div className="flex min-w-0 flex-1 items-start gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand"><I aria-hidden className="h-5 w-5" strokeWidth={1.75} /></span>
        <span className="flex min-w-0 flex-col gap-1">
          <h5 className="font-display text-[17px] font-extrabold leading-tight text-heading">
            {l.item}{l.optional ? <span className="ml-2 align-middle text-xs font-semibold text-accent-dark">Optional</span> : null}
          </h5>
          {l.details ? <p className="line-clamp-2 text-sm leading-relaxed text-ink-muted">{l.details}</p> : null}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <span className="flex flex-col leading-tight sm:items-end">
          {l.price === null ? (
            <span className="text-sm text-ink-muted">{l.reason ?? "Price to be confirmed"}</span>
          ) : (
            <>
              <span className="whitespace-nowrap font-display text-base font-bold text-brand-deep">{fmt(l.price * l.qty, currency)}</span>
              {l.qty !== 1 || l.unit ? <span className="whitespace-nowrap text-xs text-ink-muted">{qty}{l.qty !== 1 ? ` × ${fmt(l.price, currency)}` : ""}</span> : null}
            </>
          )}
        </span>
        <button type="button" onClick={onToggle} aria-pressed={Boolean(added)} aria-label={added ? `Remove ${l.item} from my list` : `Add ${l.item} to my list`}
          className={`inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition ${added ? "bg-brand-deep text-white" : "bg-brand text-white hover:bg-brand-dark"}`}>
          {added ? <><Check aria-hidden className="h-4 w-4" />Added</> : <><Plus aria-hidden className="h-4 w-4" />Add</>}
        </button>
      </div>
    </article>
  );
}
