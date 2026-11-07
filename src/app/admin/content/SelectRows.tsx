"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmButton } from "@/components/ConfirmButton";

const boxes = (el: Element | null) => [...(el?.closest("form")?.querySelectorAll<HTMLInputElement>('input[name="ids"]') ?? [])];

/** The tick at the top of the table: ticks or clears every row shown, with a dash when only some are ticked. */
export function SelectAllRows() {
  const ref = useRef<HTMLInputElement>(null);
  const sync = useCallback(() => {
    const all = boxes(ref.current);
    const ticked = all.filter((b) => b.checked).length;
    if (!ref.current) return;
    ref.current.checked = all.length > 0 && ticked === all.length;
    ref.current.indeterminate = ticked > 0 && ticked < all.length;
  }, []);
  useEffect(() => {
    document.addEventListener("change", sync);
    return () => document.removeEventListener("change", sync);
  }, [sync]);
  useEffect(sync); // also after the rows change, as after a delete
  return (
    <input ref={ref} type="checkbox" aria-label="Select all" className="h-[17px] w-[17px] cursor-pointer accent-brand"
      onChange={(e) => {
        for (const b of boxes(ref.current)) b.checked = e.target.checked;
        document.dispatchEvent(new Event("change"));
      }} />
  );
}

/** The bar above the table: how many are ticked, and what to do with them. Nothing can be pressed until something is ticked. */
export function SelectedActions({ review, archive, remove }: { review: (form: FormData) => Promise<void>; archive: (form: FormData) => Promise<void>; remove?: (form: FormData) => Promise<void> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [{ ticked, all }, setCount] = useState({ ticked: 0, all: 0 });
  const sync = useCallback(() => {
    const rows = boxes(ref.current);
    const n = rows.filter((b) => b.checked).length;
    setCount((c) => (c.ticked === n && c.all === rows.length ? c : { ticked: n, all: rows.length }));
  }, []);
  useEffect(() => {
    document.addEventListener("change", sync);
    return () => document.removeEventListener("change", sync);
  }, [sync]);
  useEffect(sync);
  const pages = `${ticked} ${ticked === 1 ? "page" : "pages"}`;
  const pick = (on: boolean) => {
    for (const b of boxes(ref.current)) b.checked = on;
    document.dispatchEvent(new Event("change"));
  };

  return (
    <div ref={ref} className="flex flex-wrap items-center gap-2 border-b border-line p-3 text-sm">
      <span className="font-semibold text-heading">{ticked ? `${ticked} selected` : "None selected"}</span>
      {all && ticked < all ? <button type="button" onClick={() => pick(true)} className="min-h-[44px] px-2 font-semibold text-brand hover:text-brand-dark">Select all {all}</button> : null}
      {ticked ? <button type="button" onClick={() => pick(false)} className="min-h-[44px] px-2 font-semibold text-ink-soft hover:text-brand">Clear</button> : null}
      <span className="ml-auto flex flex-wrap items-center gap-2">
        <button formAction={review} disabled={!ticked} title="Takes them off the website until someone checks them" className="btn-outline min-h-[44px] px-3 disabled:cursor-not-allowed disabled:opacity-50">Take off to check</button>
        <button formAction={archive} disabled={!ticked} title="Hides them from the website; they stay in the admin" className="btn-outline min-h-[44px] px-3 disabled:cursor-not-allowed disabled:opacity-50">Hide</button>
        {remove && ticked ? (
          <ConfirmButton action={remove} title={ticked === all && all > 1 ? `Delete all ${pages}?` : `Delete ${pages}?`} message={`${ticked === 1 ? "This page and everything attached to it" : "These pages and everything attached to them"} will be removed from the database.`} className="h-[38px]">
            {ticked === all && all > 1 ? `Delete all ${ticked}` : `Delete ${ticked}`}
          </ConfirmButton>
        ) : null}
      </span>
    </div>
  );
}
