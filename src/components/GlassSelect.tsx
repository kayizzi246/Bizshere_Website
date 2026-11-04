"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type GlassOption = { value: string; label: string };

/**
 * The site's dropdown: a button that opens a frosted-glass list (translucent, blurred backdrop,
 * a soft drop-in). Replaces <select>, whose list the browser draws and can't be styled.
 *
 * Two ways to use it:
 *   - controlled:  value + onChange (e.g. the directory filters)
 *   - in a form:   name + defaultValue; a hidden input carries the value, so GET forms submit it.
 *     A change also fires a "change" event on that input, so <AutoSubmit> applies it straight away.
 *
 * Keyboard: Enter, Space or ↓ opens; ↑ ↓ move; Enter picks; Escape or Tab closes.
 * `dark`: for dark pages (Markets and Prices). `icon`: shown at the start of the button.
 */
export function GlassSelect({ options, value, defaultValue, onChange, name, label, icon, dark = false, className = "", panelClassName = "" }: {
  options: GlassOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  name?: string;
  /** Accessible name, e.g. "Sort by" */
  label: string;
  icon?: React.ReactNode;
  dark?: boolean;
  /** The button's look; the defaults suit a plain field. */
  className?: string;
  panelClassName?: string;
}) {
  const [own, setOwn] = useState(defaultValue ?? options[0]?.value ?? "");
  const current = value ?? own;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const hidden = useRef<HTMLInputElement>(null);
  const changed = useRef(false);
  const listId = useId();
  const selected = options.find((o) => o.value === current) ?? options[0];

  // Close on a tap or click outside
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // In a form: tell it the value changed (after React has put the new value in the hidden input)
  useEffect(() => {
    if (!changed.current) return;
    changed.current = false;
    hidden.current?.dispatchEvent(new Event("change", { bubbles: true }));
  }, [own]);

  const pick = (v: string) => {
    setOpen(false);
    if (v === current) return;
    if (value === undefined) { changed.current = true; setOwn(v); }
    onChange?.(v);
  };
  const show = () => { setActive(Math.max(0, options.findIndex((o) => o.value === current))); setOpen(true); };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") { e.preventDefault(); show(); }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
    else if (e.key === "Tab") setOpen(false);
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(options.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (options[active]) pick(options[active].value); }
  };

  const tone = dark
    ? "border-white/15 bg-[#15171c]/70 text-white shadow-[0_18px_50px_rgba(0,0,0,0.55)]"
    : "border-white/60 bg-white/70 text-heading shadow-[0_18px_50px_rgba(7,26,51,0.18)]";

  return (
    <div ref={root} className="relative min-w-0" onKeyDown={onKey}>
      {name ? <input ref={hidden} type="hidden" name={name} value={current} data-glass-select="" /> : null}
      <button type="button" onClick={() => (open ? setOpen(false) : show())} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} aria-label={`${label}: ${selected?.label ?? ""}`}
        className={`flex w-full min-w-0 items-center gap-2 text-left outline-none ${className || `h-11 rounded-xl border px-3 text-[14px] font-medium ${dark ? "border-white/15 bg-white/[0.06] text-white" : "border-line bg-white text-heading hover:border-brand"}`}`}>
        {icon ? <span aria-hidden className="shrink-0">{icon}</span> : null}
        <span className="min-w-0 flex-1 truncate">{selected?.label}</span>
        <ChevronDown aria-hidden className={`h-4 w-4 shrink-0 opacity-60 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <ul id={listId} role="listbox" aria-label={label}
          className={`glass-drop absolute left-0 top-[calc(100%+6px)] z-50 max-h-72 min-w-full overflow-y-auto overscroll-contain rounded-2xl border p-1.5 backdrop-blur-xl backdrop-saturate-150 [scrollbar-width:thin] ${tone} ${panelClassName}`}>
          {options.map((o, n) => {
            const on = o.value === current;
            return (
              <li key={o.value || "__any"} role="option" aria-selected={on}
                onPointerEnter={() => setActive(n)} onClick={() => pick(o.value)}
                className={`flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-[14px] transition-colors ${n === active ? (dark ? "bg-white/[0.12]" : "bg-brand/10") : ""} ${on ? "font-semibold" : ""}`}>
                <span className="flex-1">{o.label}</span>
                {on ? <Check aria-hidden className={`h-4 w-4 shrink-0 ${dark ? "text-accent" : "text-brand"}`} /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
