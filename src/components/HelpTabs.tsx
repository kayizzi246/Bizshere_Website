"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, LockKeyhole, MessagesSquare } from "lucide-react";
import { Icon } from "./Icon";

/** One row in a preview list: a title, an optional line under it and an optional label on the right. */
export type HelpRow = { title: string; sub?: string | null; side?: string | null; href: string };

/**
 * One tab of "Help for every working day". Everything shown comes from the server (HomeFeatures): real
 * titles, links and counts. `kind` picks how the preview draws its rows.
 */
export type HelpTab = {
  id: string;
  label: string;
  icon: string;
  title: string;
  text: string;
  action: string;
  href: string;
  /** What the preview window is called, like a browser tab */
  window: string;
  /** A real number for the floating card and the line under the divider */
  stat: { value: string; label: string } | null;
  kind: "steps" | "list" | "vat" | "chips" | "topics";
  rows: HelpRow[];
  /** Websites for visitors: a pill for the ones only members see */
  more?: { label: string; href: string } | null;
  /** What you get, three short points */
  points: string[];
};

/**
 * "Help for every working day" as a tabbed showcase (client, 12 Nov 2026, after a SaaS site they liked): pill
 * tabs, then one panel with a preview of that part of the product on the left (a white app card, with a small
 * stat card floating at its edge) and the words, one dark button and a real figure on the right. No invented
 * quotes or numbers: the figures are counts of what is on the site.
 */
export function HelpTabs({ tabs }: { tabs: HelpTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const t = tabs.find((x) => x.id === active) ?? tabs[0];
  if (!t) return null;
  const pick = (i: number) => setActive(tabs[(i + tabs.length) % tabs.length].id);

  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-6 sm:gap-8">
      <div role="tablist" aria-label="Parts of BizSphere-Ug" className="-mx-4 flex w-[calc(100%+2rem)] gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:w-full sm:flex-wrap sm:justify-center sm:px-0">
        {tabs.map((x, i) => {
          const on = x.id === t.id;
          return (
            <button key={x.id} type="button" role="tab" id={`help-tab-${x.id}`} aria-selected={on} aria-controls="help-panel" tabIndex={on ? 0 : -1}
              onClick={() => setActive(x.id)}
              onKeyDown={(e) => { if (e.key === "ArrowRight") pick(i + 1); else if (e.key === "ArrowLeft") pick(i - 1); }}
              className={`shrink-0 whitespace-nowrap rounded-full border-2 px-4 py-1.5 font-display text-[14px] font-bold transition-colors ${on ? "border-[#0B1F33] bg-white text-[#0B1F33]" : "border-transparent bg-[#E2E0D8] text-[#0B1F33] hover:bg-[#D8D6CD]"}`}>
              {x.label}
            </button>
          );
        })}
      </div>

      <div key={t.id} role="tabpanel" id="help-panel" aria-labelledby={`help-tab-${t.id}`} className="help-fade grid w-full max-w-[1040px] overflow-hidden rounded-md bg-[#E4E2DA] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* The preview */}
        <div className="relative flex min-h-[320px] items-end overflow-hidden bg-[#D9D6CC] px-5 pt-[112px] sm:px-8 lg:pt-10">
          {t.stat ? (
            <div className="absolute left-4 top-4 z-10 flex flex-col gap-1 rounded-md bg-white p-3 sm:left-6 sm:top-6">
              <span className="text-[11px] font-semibold text-ink-muted">{t.stat.label}</span>
              <span className="font-display text-[24px] font-extrabold leading-none text-[#0B1F33]">{t.stat.value}</span>
              <span aria-hidden className="mt-1 h-1.5 w-16 rounded-full bg-[#EDEBE4]" />
            </div>
          ) : null}
          <div className="relative ml-auto w-full max-w-[420px] translate-y-2 overflow-hidden rounded-t-md bg-white">
            <div className="flex items-center gap-1.5 border-b border-[#EEECE6] px-3 py-2">
              <span aria-hidden className="h-2 w-2 rounded-full bg-[#E2E0D8]" /><span aria-hidden className="h-2 w-2 rounded-full bg-[#E2E0D8]" /><span aria-hidden className="h-2 w-2 rounded-full bg-[#E2E0D8]" />
              <span className="ml-2 inline-flex items-center gap-1.5 text-[11px] text-ink-muted"><Icon name={t.icon} className="h-3.5 w-3.5" />{t.window}</span>
            </div>
            <div className="p-4 sm:p-5"><Preview t={t} /></div>
          </div>
        </div>

        {/* The words */}
        <div className="flex flex-col gap-4 p-6 sm:p-9">
          <h3 className="font-display text-[22px] font-extrabold leading-tight text-[#0B1F33] sm:text-[26px]">{t.title}</h3>
          <p className="text-[15px] leading-relaxed text-ink-soft">{t.text}</p>
          <Link href={t.href} className="inline-flex h-11 w-fit items-center gap-2 rounded-md bg-[#0B1F33] px-5 text-[14px] font-bold text-white hover:bg-brand hover:text-white">{t.action}<ArrowRight aria-hidden className="h-4 w-4" /></Link>
          <span aria-hidden className="my-2 h-px w-full bg-[#CFCCC2]" />
          {t.stat ? <p className="font-display text-[15px] font-bold text-[#0B1F33]">{t.stat.value} {t.stat.label.toLowerCase()} on BizSphere-Ug</p> : null}
          <ul className="flex flex-col gap-2">
            {t.points.map((p) => <li key={p} className="flex items-start gap-2 text-[14px] text-ink-soft"><Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[#1F7A4D]" />{p}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Preview({ t }: { t: HelpTab }) {
  if (t.kind === "vat") {
    return (
      <div className="flex flex-col gap-3">
        <span className="font-display text-[15px] font-extrabold text-[#0B1F33]">VAT calculator</span>
        <dl className="flex flex-col gap-2.5 text-[13px]">
          <div className="flex justify-between gap-3 rounded-md bg-[#F6F5F1] px-3 py-2"><dt className="text-ink-muted">Price</dt><dd className="font-semibold tabular-nums text-[#0B1F33]">UGX 1,000,000</dd></div>
          <div className="flex justify-between gap-3 rounded-md bg-[#F6F5F1] px-3 py-2"><dt className="text-ink-muted">VAT (18%)</dt><dd className="font-semibold tabular-nums text-[#0B1F33]">UGX 180,000</dd></div>
          <div className="flex justify-between gap-3 px-3 pt-1"><dt className="font-semibold text-[#0B1F33]">Total</dt><dd className="font-display text-[17px] font-extrabold tabular-nums text-[#1F7A4D]">UGX 1,180,000</dd></div>
        </dl>
        <span className="text-[11px] text-ink-muted">Worked example</span>
      </div>
    );
  }
  if (t.kind === "chips") {
    return (
      <ul className="flex flex-wrap gap-2">
        {t.rows.map((r) => <li key={r.href + r.title}><Link href={r.href} className="inline-flex rounded-full bg-[#F1EFE9] px-3 py-1.5 text-[12px] text-[#0B1F33] hover:bg-[#0B1F33] hover:text-white">{r.title}</Link></li>)}
        {t.more ? <li><Link href={t.more.href} data-pay="" data-next="/websites" className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[12px] text-ink hover:bg-[#0B1F33] hover:text-white"><LockKeyhole aria-hidden className="h-3.5 w-3.5" />{t.more.label}</Link></li> : null}
      </ul>
    );
  }
  if (!t.rows.length) {
    return (
      <div className="flex flex-col gap-3">
        <Link href={t.href} className="flex items-center gap-2 rounded-full bg-[#F1EFE9] px-4 py-2.5 text-[13px] text-ink-muted hover:text-[#0B1F33]"><MessagesSquare aria-hidden className="h-4 w-4" />Ask other owners a question…</Link>
        <p className="text-[12px] text-ink-muted">Be the first to start a conversation.</p>
      </div>
    );
  }
  return (
    <ul className="flex flex-col divide-y divide-[#EEECE6]">
      {t.rows.map((r, n) => (
        <li key={r.href + r.title}>
          <Link href={r.href} className="group flex items-center gap-3 py-2.5 text-[#0B1F33] hover:text-[#0B1F33]">
            {t.kind === "steps" ? <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#F1EFE9] text-[12px] font-bold">{n + 1}</span> : null}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[13px] font-semibold group-hover:underline group-hover:underline-offset-4">{r.title}</span>
              {r.sub ? <span className="truncate text-[11px] text-ink-muted">{r.sub}</span> : null}
            </span>
            {r.side ? <span className="shrink-0 text-[11px] font-semibold text-[#1F7A4D]">{r.side}</span> : <ArrowRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-ink-muted" />}
          </Link>
        </li>
      ))}
    </ul>
  );
}
