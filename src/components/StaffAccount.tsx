"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { savePhoneChange, sendPhoneChangeCode } from "@/app/actions/staff-account";

const FAILED = "Something went wrong. Please try again.";

/** After a password change every session ends, this one too: straight to the sign-in. */
export function SignOutNow() {
  useEffect(() => { signOut({ callbackUrl: "/login?callbackUrl=%2Fadmin" }); }, []);
  return <p role="status" className="rounded-lg bg-brand-tint px-4 py-2.5 text-sm font-semibold text-brand-dark">Password changed. Taking you to log in again…</p>;
}

/** Changing the phone: the current password and the new number, then the code sent to that number. */
export function PhoneChange({ phone }: { phone: string | null }) {
  const [next, setNext] = useState("");
  const [current, setCurrent] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    if (!sent) {
      const res = await sendPhoneChangeCode(next, current).catch(() => ({ ok: false as const, error: FAILED }));
      setBusy(false);
      if (res.ok) setSent(true); else setError(res.error);
      return;
    }
    const res = await savePhoneChange(next, code, current).catch(() => ({ ok: false as const, error: FAILED }));
    setBusy(false);
    if (res.ok) { setDone(true); setSent(false); setNext(""); setCurrent(""); setCode(""); } else setError(res.error);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      {done ? <p role="status" className="rounded-lg bg-brand-tint px-3 py-2 text-sm font-semibold text-brand-dark">Phone number changed. Use it next time you log in.</p> : null}
      <p className="text-sm text-ink-muted">Current number: <span className="font-semibold text-heading">{phone ?? "None yet"}</span></p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="label">New phone number<input value={next} onChange={(e) => setNext(e.target.value)} disabled={sent} type="tel" autoComplete="off" placeholder="0772 123 456" className="input" /></label>
        <label className="label">Current password<input value={current} onChange={(e) => setCurrent(e.target.value)} disabled={sent} type="password" autoComplete="current-password" className="input" /></label>
      </div>
      {sent ? <label className="label">Code sent to your new number<input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" autoComplete="one-time-code" autoFocus className="input text-center text-[18px] tracking-[0.4em]" /></label> : null}
      {error ? <p role="alert" className="rounded-lg bg-bad-bg px-3 py-2 text-sm font-semibold text-bad-fg">{error}</p> : null}
      <button disabled={busy} className="btn-primary min-h-[44px] w-fit px-5 text-sm">{busy ? "Checking…" : sent ? "Confirm new number" : "Send code to new number"}</button>
    </form>
  );
}
