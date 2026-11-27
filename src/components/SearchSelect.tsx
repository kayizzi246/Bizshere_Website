"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export type SearchOption = { value: string; label: string; hint?: string };

/**
 * A searchable dropdown for admin forms: a button that opens a panel with a search box, the
 * matching options (with an optional grey hint, e.g. a market's district) and the typed words
 * highlighted. Replaces a long <select> where scrolling to find one product is slow.
 *
 * In a form it submits `name` like a <select>. `required` is enforced by the browser through a
 * hidden-from-view text input, so the form won't send with nothing chosen. Give the form a new
 * `key` to empty it again.
 *
 * Keyboard: Enter, Space or ↓ opens; typing searches; ↑ ↓ move; Enter picks; Escape closes.
 * Colours come from the theme tokens, so it follows the admin's light and dark modes.
 */
export function SearchSelect({ options, name, defaultValue = "", placeholder = "Choose…", label, required = false, clearable = false, emptyText = "Nothing matches", searchable }: {
  options: SearchOption[];
  name: string;
  defaultValue?: string;
  placeholder?: string;
  /** Accessible name, e.g. "Market" */
  label: string;
  required?: boolean;
  /** Shows a × to go back to nothing chosen. */
  clearable?: boolean;
  emptyText?: string;
  /** Defaults to on when there are more than 6 options. */
  searchable?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();
  const withSearch = searchable ?? options.length > 6;
  const selected = options.find((o) => o.value === value) ?? null;

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = useMemo(
    () => options.filter((o) => words.every((w) => `${o.label} ${o.hint ?? ""}`.toLowerCase().includes(w))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options, query],
  );

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  useEffect(() => { if (open) (withSearch ? search.current : list.current)?.focus(); }, [open, withSearch]);
  useEffect(() => { list.current?.querySelector(`[data-n="${active}"]`)?.scrollIntoView({ block: "nearest" }); }, [active]);

  const show = () => {
    setQuery("");
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const close = () => { setOpen(false); button.current?.focus(); };
  const pick = (v: string) => { setValue(v); close(); };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); show(); }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "Tab") setOpen(false);
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(shown.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (shown[active]) pick(shown[active].value); }
  };

  /** The label with the searched words in bold. */
  const mark = (text: string) => {
    if (!words.length) return text;
    const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
    return text.split(re).map((part, n) => (n % 2 ? <mark key={n} className="rounded-[3px] bg-brand/20 px-0.5 font-bold text-inherit">{part}</mark> : part));
  };

  return (
    <div ref={root} className="relative min-w-0" onKeyDown={onKey}>
      {/* What the form sends; `required` makes the browser stop an empty submit and point here. */}
      <input name={name} value={value} required={required} onChange={() => {}} tabIndex={-1} aria-hidden
        onInvalid={() => button.current?.focus()}
        className="pointer-events-none absolute bottom-0 left-1/2 h-px w-px opacity-0" />

      <button ref={button} type="button" onClick={() => (open ? setOpen(false) : show())}
        aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} aria-label={`${label}: ${selected?.label ?? placeholder}`}
        className={`input group flex w-full min-w-0 items-center gap-2 text-left transition-[border-color,box-shadow] ${open ? "border-brand ring-4 ring-brand/15" : "hover:border-brand/60"}`}>
        <span className={`min-w-0 flex-1 truncate ${selected ? "text-ink" : "text-ink-muted"}`}>
          {selected ? selected.label : placeholder}
          {selected?.hint ? <span className="ml-1.5 text-[12px] text-ink-muted">{selected.hint}</span> : null}
        </span>
        {clearable && selected ? (
          <span role="button" tabIndex={-1} aria-label={`Clear ${label}`} onClick={(e) => { e.stopPropagation(); setValue(""); }}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-page hover:text-ink">
            <X aria-hidden className="h-3.5 w-3.5" />
          </span>
        ) : null}
        <ChevronDown aria-hidden className={`h-4 w-4 shrink-0 text-ink-muted transition-transform duration-200 ${open ? "rotate-180 text-brand" : ""}`} />
      </button>

      {open ? (
        <div className="glass-drop absolute left-0 top-[calc(100%+6px)] z-50 flex w-full min-w-[16rem] flex-col overflow-hidden rounded-2xl border border-line bg-surface/95 text-ink shadow-[0_24px_60px_-12px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          {withSearch ? (
            <label className="flex items-center gap-2 border-b border-line px-3">
              <Search aria-hidden className="h-4 w-4 shrink-0 text-ink-muted" />
              <span className="sr-only">Search {label}</span>
              <input ref={search} value={query} onChange={(e) => { setQuery(e.target.value); setActive(0); }} placeholder={`Search ${label.toLowerCase()}…`}
                role="combobox" aria-expanded aria-controls={listId} aria-autocomplete="list"
                className="h-11 min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-muted" />
              {query ? <span className="shrink-0 text-[11px] font-semibold text-ink-muted">{shown.length}</span> : null}
            </label>
          ) : null}
          <ul ref={list} id={listId} role="listbox" aria-label={label} tabIndex={-1}
            className="max-h-72 overflow-y-auto overscroll-contain p-1.5 outline-none [scrollbar-width:thin]">
            {shown.map((o, n) => {
              const on = o.value === value;
              return (
                <li key={o.value || "__none"} data-n={n} role="option" aria-selected={on}
                  onPointerEnter={() => setActive(n)} onClick={() => pick(o.value)}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-[13px] transition-colors ${n === active ? "bg-brand/10" : ""} ${on ? "font-semibold text-brand" : ""}`}>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{mark(o.label)}</span>
                    {o.hint ? <span className="truncate text-[12px] font-normal text-ink-muted">{mark(o.hint)}</span> : null}
                  </span>
                  {on ? <Check aria-hidden className="h-4 w-4 shrink-0 text-brand" /> : null}
                </li>
              );
            })}
            {shown.length === 0 ? <li className="px-3 py-6 text-center text-[12.5px] text-ink-muted">{emptyText}</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
