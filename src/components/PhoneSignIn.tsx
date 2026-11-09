"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { ArrowLeft, Smartphone } from "lucide-react";
import { requestCode } from "@/app/actions/onboarding";

/** Why the phone sign-in refused (thrown in src/lib/auth.ts). Anything else: the code. */
const PHONE_ERRORS: Record<string, string> = {
  "too-many": "Too many sign-in tries from this internet connection. Wait 15 minutes, then try again.",
  suspended: "This account is paused. Contact us to open it again.",
  staff: "This number belongs to a team account. Sign in with your password at the staff sign-in instead.",
};
const WRONG_CODE = "That code isn't right, or it has expired (codes last 10 minutes). Check the SMS, or send a new code.";

/**
 * Passwordless sign-in: phone number first, then the one-time code we text.
 * New numbers get an account automatically, so sign-up and sign-in are the same.
 */
export function PhoneSignIn({ onSignedIn, googleEnabled, googleCallbackUrl, size = "lg" }: {
  onSignedIn: () => void;
  googleEnabled: boolean;
  googleCallbackUrl: string;
  size?: "md" | "lg";
}) {
  const [phone, setPhone] = useState<string | null>(null); // set once a code has been sent
  const [length, setLength] = useState(6);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // After a code is sent: a short note, and seconds until another can be asked for (the server allows one every 30 s)
  const [notice, setNotice] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const codeInput = useRef<HTMLInputElement>(null);
  // The code being checked. Phones that fill the code in from the SMS can fire twice: the first check signs
  // in and uses the code up, and a second one used to show "wrong code" (Nov 2026). One check per code.
  const checking = useRef<string | null>(null);
  const field = size === "lg" ? "min-h-[56px] text-lg" : "min-h-[48px] text-[15px]";

  useEffect(() => { if (phone) codeInput.current?.focus(); }, [phone]);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  // Each request texts a new code; the earlier ones keep working until they expire (src/lib/phone-codes.ts).
  async function send(raw: string, again = false) {
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await requestCode(raw);
    setBusy(false);
    if (res.ok) {
      setPhone(res.phone);
      setLength(res.length);
      setWait(30);
      if (again) {
        setNotice(`New code sent to ${res.phone}. Any code from the last 10 minutes works.`);
        if (codeInput.current) { codeInput.current.value = ""; codeInput.current.focus(); }
      }
    } else setError(res.error);
  }

  async function verify(raw: string) {
    const code = raw.replace(/\D/g, "");
    if (!phone || !code || checking.current !== null) return;
    checking.current = code;
    setBusy(true);
    setError(null);
    setNotice(null);
    const r = await signIn("phone", { phone, code, redirect: false }).catch(() => null);
    setBusy(false);
    if (!r || r.error) {
      checking.current = null;
      setError(!r ? "No connection. Check your internet and try again." : (r.error && PHONE_ERRORS[r.error]) || WRONG_CODE);
      if (codeInput.current) { codeInput.current.value = ""; codeInput.current.focus(); }
    } else onSignedIn(); // stays locked: signed in
  }

  if (phone) {
    return (
      <form onSubmit={(e) => { e.preventDefault(); verify(String(new FormData(e.currentTarget).get("code") ?? "")); }} className="flex flex-col gap-4" noValidate>
        <p className={size === "lg" ? "text-[15px] text-ink-soft" : "text-[13px] text-ink-soft"}>Enter the code we sent to <strong className="whitespace-nowrap text-ink">{phone}</strong>.</p>
        <label className={`label ${size === "lg" ? "" : "text-[13px]"}`}>
          Code
          {/* Checks itself as soon as the last digit is typed (or pasted, or filled from the SMS) */}
          <input ref={codeInput} name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={length} placeholder={"•".repeat(length)}
            onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); e.target.value = v; if (v.length === length) verify(v); }}
            className={`input ${field} text-center font-display font-bold tracking-[0.5em]`} />
        </label>
        {notice ? <p role="status" className="rounded-lg bg-brand-tint px-3 py-2 text-sm font-medium text-brand-dark">{notice}</p> : null}
        {error ? <p role="alert" className="rounded-lg bg-bad-bg px-3 py-2 text-sm font-medium text-bad-fg">{error}</p> : null}
        <button disabled={busy} className={`btn-primary w-full ${field}`}>{busy ? "Checking…" : "Verify and continue"}</button>
        <div className="flex justify-between text-sm">
          <button type="button" onClick={() => { setPhone(null); setError(null); setNotice(null); }} className="inline-flex items-center gap-1 font-semibold text-ink-muted hover:text-ink"><ArrowLeft className="h-4 w-4" /> Change number</button>
          <button type="button" disabled={busy || wait > 0} onClick={() => send(phone, true)} className="font-semibold text-brand hover:text-brand-dark disabled:text-ink-muted">{wait > 0 ? `Send a new code in ${wait}s` : busy ? "Sending…" : "Send a new code"}</button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={(e) => { e.preventDefault(); send(String(new FormData(e.currentTarget).get("phone") ?? "")); }} className="flex flex-col gap-4" noValidate>
        <label className={`label ${size === "lg" ? "" : "text-[13px]"}`}>
          Phone number
          <span className="relative">
            <Smartphone aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
            <input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0772 123 456" autoFocus className={`input w-full pl-12 ${field}`} />
          </span>
        </label>
        {error ? <p role="alert" className="rounded-lg bg-bad-bg px-3 py-2 text-sm font-medium text-bad-fg">{error}</p> : null}
        <button disabled={busy} className={`btn-primary w-full ${field}`}>{busy ? "Sending…" : "Send me a code"}</button>
        <p className="text-center text-xs text-ink-muted">We&apos;ll text you a one-time code. No password needed.</p>
      </form>

      {/* Google appears only once it is configured; a greyed-out button just looks unfinished */}
      {googleEnabled ? (
        <>
          <div className="flex items-center gap-3 text-xs text-ink-muted"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
          <button type="button" onClick={() => signIn("google", { callbackUrl: googleCallbackUrl })}
            className={`btn w-full border border-line-strong bg-white text-ink hover:border-ink hover:text-ink ${size === "lg" ? "min-h-[52px]" : "min-h-[48px] text-[14px]"}`}>
            <GoogleMark /> Continue with Google
          </button>
        </>
      ) : null}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="h-[18px] w-[18px]">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
