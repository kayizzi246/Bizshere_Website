"use client";

import { useId, useRef, useState } from "react";
import { Check, Eye, EyeOff, Plus, X } from "lucide-react";
import { Icon } from "./Icon";

/**
 * The fields of the supplier and expert sign-up form (src/components/PartnerJoin.tsx; client, 24 Nov 2026):
 * an icon in front, a soft fill that turns white with a blue glow while it is being filled in, and a green
 * tick once what is typed is enough. They submit under the same names as plain inputs.
 */
const box = "group relative flex items-center rounded-xl border border-line bg-page transition-[border-color,background-color,box-shadow] duration-200 hover:border-brand/50 focus-within:border-brand focus-within:bg-surface focus-within:shadow-[0_0_0_4px_rgba(9,105,218,0.12)]";
const field = "peer h-12 w-full min-w-0 rounded-xl bg-transparent text-[15px] font-medium text-heading outline-none placeholder:font-normal placeholder:text-ink-muted";
const glyph = "pointer-events-none flex h-12 w-11 shrink-0 items-center justify-center text-ink-muted transition-colors group-focus-within:text-brand";

function Label({ id, text, optional }: { id: string; text: string; optional?: boolean }) {
  return (
    <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-[13px] font-semibold text-heading">
      {text}{optional ? <span className="text-[11px] font-normal text-ink-muted">Optional</span> : null}
    </label>
  );
}

export function JoinField({ name, label, icon, ...rest }: { name: string; label: string; icon: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "id" | "className">) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label id={id} text={label} optional={!rest.required} />
      <div className={box}>
        <span className={glyph}><Icon name={icon} className="h-[18px] w-[18px]" /></span>
        {/* placeholder=" ": the tick needs to know when the field is empty */}
        <input id={id} name={name} {...rest} placeholder={rest.placeholder ?? " "} className={`${field} pr-9`} />
        <Check aria-hidden strokeWidth={3} className="pointer-events-none absolute right-3 h-4 w-4 scale-50 text-[#12805C] opacity-0 transition peer-[:valid:not(:placeholder-shown)]:scale-100 peer-[:valid:not(:placeholder-shown)]:opacity-100" />
      </div>
    </div>
  );
}

/** What they sell or help with, as tags: Enter or a comma adds one. Submitted as one comma-separated value. */
export function JoinTags({ name, label, hint, suggestions }: { name: string; label: string; hint: string; suggestions: string[] }) {
  const id = useId();
  const [tags, setTags] = useState<string[]>([]);
  const [text, setText] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const clean = (list: string[]) => list.map((t) => t.trim()).filter(Boolean)
    .filter((t, i, all) => all.findIndex((x) => x.toLowerCase() === t.toLowerCase()) === i);
  // What is still being typed counts too, so nobody loses the last one by not pressing Enter.
  const all = clean([...tags, ...text.split(",")]);
  const add = (value: string) => {
    const next = clean([...tags, ...value.split(",")]);
    if (next.join(", ").length > 600) return;
    setTags(next);
    setText("");
  };
  const left = suggestions.filter((s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase()));

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label id={id} text={label} />
      <input type="hidden" name={name} value={all.join(", ").slice(0, 600)} />
      <div className={`${box} min-h-[84px] cursor-text flex-wrap content-start gap-1.5 p-2`} onClick={() => input.current?.focus()}>
        {tags.map((t) => (
          <span key={t} className="inline-flex max-w-full items-center gap-1 rounded-lg bg-brand-tint py-1 pl-2.5 pr-1 text-[13px] font-semibold text-brand-dark">
            <span className="truncate">{t}</span>
            <button type="button" aria-label={`Remove ${t}`} onClick={(e) => { e.stopPropagation(); setTags(tags.filter((x) => x !== t)); }} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md hover:bg-brand hover:text-white"><X aria-hidden className="h-3.5 w-3.5" /></button>
          </span>
        ))}
        <input ref={input} id={id} value={text} required={!tags.length} minLength={tags.length ? undefined : 2} maxLength={600} aria-describedby={`${id}-hint`}
          placeholder={tags.length ? "Add another" : "Type one and press Enter"}
          onChange={(e) => (e.target.value.includes(",") ? add(e.target.value) : setText(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && text.trim()) { e.preventDefault(); add(text); }
            else if (e.key === "Backspace" && !text && tags.length) setTags(tags.slice(0, -1));
          }}
          className="h-8 min-w-[10rem] flex-1 bg-transparent px-1.5 text-[15px] font-medium text-heading outline-none placeholder:font-normal placeholder:text-ink-muted" />
      </div>
      {left.length ? (
        <div className="flex flex-wrap gap-1.5">
          {left.map((s) => (
            <button key={s} type="button" onClick={() => setTags(clean([...tags, s]))} className="inline-flex h-8 items-center gap-1 rounded-full border border-dashed border-line-strong px-2.5 text-[12px] font-medium text-ink-soft transition-colors hover:border-brand hover:bg-brand-tint hover:text-brand-dark">
              <Plus aria-hidden className="h-3 w-3" />{s}
            </button>
          ))}
        </div>
      ) : null}
      <span id={`${id}-hint`} className="text-xs text-ink-muted">{hint}</span>
    </div>
  );
}

/** The 4-digit PIN, twice, with one button to show both and a note saying whether they match. */
export function JoinPin() {
  const id = useId();
  const [pin, setPin] = useState("");
  const [again, setAgain] = useState("");
  const [shown, setShown] = useState(false);
  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 4);
  const full = again.length === 4 && pin.length === 4;
  const match = full && pin === again;
  const one = (key: string, name: string, label: string, value: string, set: (v: string) => void) => (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label id={`${id}${key}`} text={label} />
      <div className={box}>
        <span className={glyph}><Icon name="shield" className="h-[18px] w-[18px]" /></span>
        <input id={`${id}${key}`} name={name} type={shown ? "text" : "password"} inputMode="numeric" pattern="\d{4}" required autoComplete="new-password"
          title="4 digits" value={value} onChange={(e) => set(digits(e.target.value))} placeholder="4 digits" aria-describedby={`${id}-note`}
          className={`${field} pr-3 tracking-[0.35em] placeholder:tracking-normal`} />
      </div>
    </div>
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-3">
        {one("a", "pin", "Choose a 4-digit PIN", pin, setPin)}
        {one("b", "pinAgain", "PIN again", again, setAgain)}
      </div>
      <div className="flex min-h-[32px] items-center justify-between gap-3">
        <span id={`${id}-note`} role="status" className={`text-xs ${match ? "font-semibold text-[#12805C]" : full ? "font-semibold text-bad-fg" : "text-ink-muted"}`}>
          {match ? "The PINs match." : full ? "The two PINs are different." : "You will use this PIN to sign in."}
        </span>
        <button type="button" aria-pressed={shown} onClick={() => setShown(!shown)} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-brand hover:bg-brand-tint">
          {shown ? <EyeOff aria-hidden className="h-4 w-4" /> : <Eye aria-hidden className="h-4 w-4" />}{shown ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}
