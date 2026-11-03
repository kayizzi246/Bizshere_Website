"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Boxes, Check, ClipboardList, FileText, LockKeyhole, Megaphone, Minus, Monitor, Plus, Scale, Search, ShoppingCart, Store, Wallet, Wrench, X,
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
 * While the list is on screen a bar stays at the top with the size, the categories (the one
 * you're in highlighted) and search. Gated visitors are sent only the free preview of the lines
 * and no totals; the server decides.
 */
export function BudgetCalculator({ name, plans, initial, gated, unlockHref, hidden }: { name: string; plans: CalcPlan[]; initial: string; gated: boolean; unlockHref: string; hidden: Record<string, number> }) {
  const [level, setLevel] = useState(initial);
  const [withOptional, setWithOptional] = useState(false);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "essential" | "optional">("all");
  const [mine, setMine] = useState<Record<string, number>>({}); // line id → quantity
  const [bar, setBar] = useState({ show: false, progress: 0, active: "" });
  const [barClosed, setBarClosed] = useState(false);
  const [listOpen, setListOpen] = useState(false); // phones: my list as a sheet from the bottom
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const plan = plans.find((p) => p.level === level) ?? plans[0];
  const cats = useMemo(() => [...plan.lines.reduce((m, l) => m.set(l.category, [...(m.get(l.category) ?? []), l]), new Map<string, CalcLine[]>())], [plan]);
  const matches = (l: CalcLine) => (kind === "all" || (kind === "optional") === l.optional) && (!q || `${l.item} ${l.category} ${l.details ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const sections = cats.map(([c, all]) => ({ c, all, shown: all.filter(matches) })).filter((s) => s.shown.length);
  const picked = plan.lines.filter((l) => mine[l.id]);
  const myTotal = picked.reduce((s, l) => s + (l.price ?? 0) * mine[l.id], 0);
  const myUnpriced = picked.filter((l) => l.price === null).length;
  const estimate = plan.totals ? (withOptional ? plan.totals.all : plan.totals.essential) : null;
  const essential = plan.count.all - plan.count.optional;

  // The top bar: shown while the list fills the screen, with how far through it you are and the
  // category you're reading.
  useEffect(() => {
    const onScroll = () => {
      const el = listRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const show = r.top < 120 && r.bottom > 260;
      const progress = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight)));
      const heads = [...el.querySelectorAll<HTMLElement>("[data-cat]")];
      const active = heads.filter((h) => h.getBoundingClientRect().top < 200).pop()?.dataset.cat ?? heads[0]?.dataset.cat ?? "";
      setBar((b) => (b.show === show && b.active === active && Math.abs(b.progress - progress) < 0.005 ? b : { show, progress, active }));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);

  const pick = (l: CalcLine, n: number) => setMine((m) => {
    const next = { ...m };
    if (n > 0) next[l.id] = n; else delete next[l.id];
    return next;
  });
  const switchTo = (lv: string) => { setLevel(lv); setMine({}); };
  const goTo = (c: string) => {
    const el = document.getElementById(slug(c));
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 130, behavior: "smooth" });
  };
  const toSearch = () => {
    searchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    searchRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      {/* ── The bar at the top of the screen while the list is in view ── */}
      <div aria-hidden={!bar.show || barClosed} className={`fixed inset-x-0 top-0 z-[46] border-b border-line bg-white transition duration-200 ${bar.show && !barClosed ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0"}`}>
        <div className="container-site flex flex-col gap-2.5 py-2.5">
          <div className="flex items-center gap-3">
            {plans.length > 1 ? (
              <label className="flex items-center gap-2 text-xs text-ink-muted"><span className="sr-only sm:not-sr-only">Business size</span>
                <select value={plan.level} onChange={(e) => switchTo(e.target.value)} tabIndex={bar.show ? 0 : -1} className="input h-9 min-h-0 py-0 text-sm font-semibold">
                  {plans.map((p) => <option key={p.level} value={p.level}>{p.label}</option>)}
                </select>
              </label>
            ) : null}
            <span className="ml-auto hidden truncate text-[13px] font-semibold text-heading sm:block">{name} requirements</span>
            <button type="button" onClick={toSearch} tabIndex={bar.show ? 0 : -1} aria-label="Search requirements" className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-page hover:text-brand sm:ml-0"><Search className="h-[18px] w-[18px]" /></button>
            <button type="button" onClick={() => setBarClosed(true)} tabIndex={bar.show ? 0 : -1} aria-label="Hide this bar" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-page hover:text-bad-fg"><X className="h-[18px] w-[18px]" /></button>
          </div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
            {cats.map(([c, all]) => (
              <button key={c} type="button" onClick={() => goTo(c)} tabIndex={bar.show ? 0 : -1} aria-current={bar.active === c ? "true" : undefined}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition ${bar.active === c ? "border-brand bg-brand text-white" : "border-line bg-page text-ink-soft hover:border-brand hover:text-brand"}`}>
                {c}<span className={`rounded-full px-1.5 text-[11px] ${bar.active === c ? "bg-white/20" : "bg-white"}`}>{all.length}</span>
              </button>
            ))}
          </div>
        </div>
        <span aria-hidden className="absolute bottom-0 left-0 h-[3px] bg-brand transition-[width] duration-150" style={{ width: `${bar.progress * 100}%` }} />
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        {/* ── Size and estimate ── */}
        <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
          {plans.length > 1 ? (
            <div className="flex flex-col gap-2.5">
              <h3 className="text-center font-display text-[15px] font-extrabold text-heading">Business size</h3>
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
          <div className="flex flex-col items-center gap-1.5 rounded-xl bg-brand-tint px-4 py-6 text-center">
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
        <div ref={listRef} className="flex flex-col gap-6">
          <h3 className="text-section-title text-center text-heading">All {plan.count.all} {plan.count.all === 1 ? "item" : "items"}</h3>
          <div className="flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-4 sm:flex-row sm:p-5">
            <label className="relative flex-1">
              <span className="sr-only">Search requirements</span>
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items" className="input w-full pl-9" />
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-muted">Show
              <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className="input">
                <option value="all">All</option><option value="essential">Must-have</option><option value="optional">Optional</option>
              </select>
            </label>
          </div>

          {/* Each category: its name, then must-have items before optional ones */}
          {sections.map(({ c, shown }) => (
            <section key={c} id={slug(c)} data-cat={c} aria-label={c} className="flex flex-col gap-3">
              <h4 className="flex items-baseline gap-2 font-display text-xl font-extrabold text-heading">{c}<span className="text-sm font-medium text-ink-muted">{shown.length}</span></h4>
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
        className={`flex-col rounded-2xl border border-line bg-white lg:sticky lg:inset-auto lg:top-36 lg:z-auto lg:flex lg:max-h-none lg:rounded-b-2xl ${listOpen ? "fixed inset-x-0 bottom-0 z-[61] flex max-h-[85vh] overflow-y-auto rounded-b-none" : "hidden"}`}>
        <h3 className="flex items-center justify-between gap-2 border-b border-line px-5 py-4 font-display text-[15px] font-extrabold text-heading">
          <span className="flex items-center gap-2">My requirements list{picked.length ? <span className="rounded-full bg-brand px-2 text-xs text-white">{picked.length}</span> : null}</span>
          <button type="button" onClick={() => setListOpen(false)} aria-label="Close my list" className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-page lg:hidden"><X className="h-4 w-4" /></button>
        </h3>
        {picked.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-tint text-brand"><ShoppingCart aria-hidden className="h-7 w-7" /></span>
            <span className="font-display text-base font-bold text-heading">Your list is empty</span>
            <span className="text-[13px] leading-relaxed text-ink-muted">Tap <strong>+ Add</strong> on an item to see your own total.</span>
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
              <button type="button" onClick={() => setMine({})} className="mt-2 self-start text-xs font-semibold text-ink-muted hover:text-bad-fg">Clear my list</button>
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
    <article className={`flex flex-col gap-4 rounded-2xl border bg-white p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5 ${added ? "border-brand" : "border-line"}`}>
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
