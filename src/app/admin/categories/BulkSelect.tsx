"use client";

import { useEffect, useRef, useState } from "react";
import { ConfirmButton } from "@/components/ConfirmButton";

export const BULK_FORM = "category-bulk";
const boxes = () => [...document.querySelectorAll<HTMLInputElement>(`input[form="${BULK_FORM}"][name="ids"]`)];

/** The tick at the top of the table: ticks or clears every row, and shows a dash when only some are ticked. */
export function SelectAll() {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const sync = () => {
      const all = boxes();
      const ticked = all.filter((b) => b.checked).length;
      if (!ref.current) return;
      ref.current.checked = all.length > 0 && ticked === all.length;
      ref.current.indeterminate = ticked > 0 && ticked < all.length;
    };
    sync();
    document.addEventListener("change", sync);
    return () => document.removeEventListener("change", sync);
  }, []);
  return (
    <input ref={ref} type="checkbox" aria-label="Select all categories" className="h-[18px] w-[18px] cursor-pointer accent-brand"
      onChange={(e) => {
        for (const b of boxes()) b.checked = e.target.checked;
        document.dispatchEvent(new Event("change"));
      }} />
  );
}

/**
 * Appears once something is ticked: how many, then move everything in them into one category, or
 * delete them. A category in use can be ticked but is never deleted (the server checks again), so
 * the bar says how many will really go.
 */
export function BulkBar({ action, move, back, targets }: { action: (form: FormData) => Promise<void>; move: (form: FormData) => Promise<void>; back: string; targets: { id: string; label: string }[] }) {
  const [picked, setPicked] = useState<{ id: string; used: boolean }[]>([]);
  const [target, setTarget] = useState("");
  useEffect(() => {
    const sync = () => setPicked(boxes().filter((b) => b.checked).map((b) => ({ id: b.value, used: Boolean(b.dataset.used) })));
    sync();
    document.addEventListener("change", sync);
    return () => document.removeEventListener("change", sync);
  }, []);
  const ticked = picked.length;
  const deletable = picked.filter((b) => !b.used).length;
  const kept = ticked - deletable;
  const clear = () => {
    for (const b of boxes()) b.checked = false;
    document.dispatchEvent(new Event("change"));
  };
  const others = picked.filter((b) => b.id !== target).length;
  const targetName = targets.find((t) => t.id === target)?.label ?? "";

  return (
    <form id={BULK_FORM} className={ticked ? "sticky top-[4.5rem] z-20 flex flex-col gap-3 rounded-2xl border border-brand bg-surface px-4 py-3" : "hidden"}>
      <input type="hidden" name="back" value={back} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-sm font-bold text-heading">{ticked} selected</span>
        {kept ? <span className="text-[13px] text-ink-muted">{kept} in use, so {kept === 1 ? "it" : "they"} will be kept if you delete</span> : null}
        <span className="ml-auto flex items-center gap-3">
          <button type="button" onClick={clear} className="text-sm font-semibold text-ink-soft hover:text-brand">Clear</button>
          {deletable ? (
            <ConfirmButton action={action} plain className="h-10" title={`Delete ${deletable} ${deletable === 1 ? "category" : "categories"}?`}
              message={`No page uses ${deletable === 1 ? "this category" : "these categories"}, so nothing on the website changes.${kept ? ` The ${kept} in use will be kept.` : ""}`}>
              Delete {deletable}
            </ConfirmButton>
          ) : null}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <label htmlFor="move-target" className="text-sm font-semibold text-heading">Move their pages into</label>
        <select id="move-target" name="target" value={target} onChange={(e) => setTarget(e.target.value)} className="input min-h-[40px] min-w-[14rem] flex-1 text-sm sm:max-w-sm">
          <option value="">Choose a category…</option>
          {targets.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <button type="submit" formAction={move} disabled={!target || !others} className="btn-primary min-h-[40px] px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          onClick={(e) => { if (!window.confirm(`Move everything in ${others} ${others === 1 ? "category" : "categories"} into ${targetName}?`)) e.preventDefault(); }}>
          Move
        </button>
      </div>
    </form>
  );
}
