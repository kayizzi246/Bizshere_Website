"use client";

import { useState } from "react";
import { checkStaffResetCode, finishStaffReset, requestStaffReset } from "@/app/actions/staff-account";

const FAILED = "Something went wrong. Please try again.";
const label = "flex flex-col gap-1.5 text-[14px] font-medium text-heading";

/**
 * Forgot password and the first log-in, inside the staff sign-in: email or phone, then the code from the
 * SMS, then a password of their own. Shown in place of the sign-in form (src/components/StaffSignIn.tsx).
 */
export function StaffReset({ first, onBack, onDone }: { first?: string | null; onBack: () => void; onDone: () => void }) {
  // `first`: a new team member's first log-in, the code is already on its way
  const [step, setStep] = useState<"who" | "code" | "password">(first ? "code" : "who");
  const [identifier, setIdentifier] = useState(first ?? "");
  const [code, setCode] = useState("");
  const [pass, setPass] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function send() {
    setBusy(true);
    setError(null);
    const res = await requestStaffReset(identifier).catch(() => ({ ok: false as const, error: FAILED }));
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setResent(step === "code");
    setCode("");
    setStep("code");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (step === "who") {
      if (!identifier.trim()) return setError("Enter your email or phone.");
      return send();
    }
    setBusy(true);
    setError(null);
    if (step === "code") {
      const res = await checkStaffResetCode(identifier, code).catch(() => ({ ok: false as const, error: FAILED }));
      setBusy(false);
      if (!res.ok) return setError(res.error);
      setPass(res.pass);
      setStep("password");
      return;
    }
    if (next !== again) { setBusy(false); return setError("Enter the same password twice."); }
    const res = await finishStaffReset(pass, next).catch(() => ({ ok: false as const, error: FAILED }));
    setBusy(false);
    if (res.ok) onDone(); else setError(res.error);
  }

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-4" noValidate>
      <h2 className="font-display text-[20px] font-extrabold text-heading">{step === "password" ? "Choose your password" : first ? "Set up your account" : "Reset your password"}</h2>
      {step === "who" ? (
        <>
          <p className="text-[14px] text-ink-muted">We&apos;ll text a code to the phone on your team account.</p>
          <label className={label}>Enter your email or phone
            <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} type="text" autoComplete="username" autoFocus placeholder="Email or phone number" className="input min-h-[46px] text-[15px]" />
          </label>
        </>
      ) : null}
      {step === "code" ? (
        <>
          <p className="rounded-lg bg-brand-tint px-3 py-2.5 text-[13px] text-brand-dark">{resent ? "A new code is on its way if this is a team account. Use the newest SMS." : first ? "We've texted a code to your phone. It expires in 10 minutes." : "If this is a team account with a phone, we've texted it a code. It expires in 10 minutes."}</p>
          <label className={label}>Enter the code from the SMS
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" autoComplete="one-time-code" autoFocus className="input min-h-[46px] text-center text-[18px] tracking-[0.4em]" />
          </label>
        </>
      ) : null}
      {step === "password" ? (
        <>
          <label className={label}>Password
            <input value={next} onChange={(e) => setNext(e.target.value)} type="password" autoComplete="new-password" autoFocus className="input min-h-[46px] text-[15px]" />
            <span className="text-xs font-normal text-ink-muted">At least 6 digits or letters. Numbers are fine.</span>
          </label>
          <label className={label}>Password again
            <input value={again} onChange={(e) => setAgain(e.target.value)} type="password" autoComplete="new-password" className="input min-h-[46px] text-[15px]" />
          </label>
        </>
      ) : null}
      {error ? <p role="alert" className="rounded-lg bg-bad-bg px-3 py-2 text-sm font-semibold text-bad-fg">{error}</p> : null}
      <button disabled={busy} className="btn-primary mt-1 min-h-[48px] w-full text-[15px]">{busy ? "Checking…" : step === "who" ? "Send me a code" : step === "code" ? "Continue" : "Save password"}</button>
      <span className="flex justify-between text-[13px]">
        {step === "code" ? <button type="button" disabled={busy} onClick={send} className="font-semibold text-brand">Send a new code</button> : <span />}
        <button type="button" onClick={onBack} className="font-semibold text-ink-muted">Back to log in</button>
      </span>
      {step === "who" ? <p className="text-center text-[13px] text-ink-muted">No phone on your account? Ask a super admin to set a new password in Admin → Team.</p> : null}
    </form>
  );
}
