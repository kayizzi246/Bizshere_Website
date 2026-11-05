"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { ShieldCheck } from "lucide-react";

/** Same value as STAFF_CODE_SENT in src/lib/auth.ts (not imported: that module is server-only). */
const CODE_SENT = "STAFF_CODE_SENT";

/**
 * Email (or phone) and password sign-in for staff: at /login when coming from the admin, and at the
 * private /staff/<key> link. Staff with a phone on their account then enter the code texted to it
 * (src/lib/auth.ts, staffNeedsCode): a password alone doesn't open the admin.
 */
export function StaffSignIn({ next = "/admin" }: { next?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // After the right password: the same email and password, plus the texted code.
  const [step, setStep] = useState<null | { identifier: string; password: string }>(null);
  const [code, setCode] = useState("");
  const [resent, setResent] = useState(false);

  async function attempt(identifier: string, password: string, smsCode?: string) {
    setBusy(true);
    setError(null);
    const res = await signIn("credentials", { identifier, password, ...(smsCode ? { code: smsCode } : {}), redirect: false });
    setBusy(false);
    if (res?.ok && !res.error) { window.location.href = next.startsWith("/admin") ? next : "/admin"; return; }
    if (res?.error === CODE_SENT) { setResent(Boolean(step)); setStep({ identifier, password }); setCode(""); return; }
    // A message from sending the code (e.g. "A code was just sent…"), or a plain wrong password or code
    const message = res?.error && res.error !== "CredentialsSignin" ? res.error : null;
    setError(message ?? (smsCode ? "That code is not correct, or it has expired." : "That email, phone or password is not correct."));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step) {
      if (!code.trim()) return setError("Enter the code from the SMS.");
      return attempt(step.identifier, step.password, code.trim());
    }
    const form = new FormData(e.currentTarget);
    const identifier = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!identifier || !password) return setError("Enter your email or phone and your password.");
    return attempt(identifier, password);
  }

  const label = "flex flex-col gap-1.5 text-[14px] font-medium text-heading";

  // Shown inside <AuthShell> (src/components/AuthShell.tsx), which draws the card and the page heading.
  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-sm flex-col gap-4" noValidate>
      <h2 className="sr-only">Staff sign in</h2>
      {step ? (
        <>
          <p className="flex items-start gap-2 rounded-lg bg-brand-tint px-3 py-2.5 text-[13px] text-brand-dark">
            <ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            {resent ? "New code sent. Use the newest SMS: earlier codes no longer work." : "Password correct. We texted a 6-digit code to the phone on your account. It expires in 10 minutes."}
          </p>
          <label className={label}>Enter the code from the SMS
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" autoComplete="one-time-code" autoFocus placeholder="••••••"
              className="input min-h-[46px] text-center text-[18px] tracking-[0.4em]" />
          </label>
        </>
      ) : (
        <>
          <label className={label}>Enter your email or phone
            <input name="email" type="text" inputMode="email" autoComplete="username" autoFocus placeholder="Email or phone number" className="input min-h-[46px] text-[15px]" />
          </label>
          <label className={label}>Enter your password
            <input name="password" type="password" autoComplete="current-password" placeholder="Password" className="input min-h-[46px] text-[15px]" />
          </label>
        </>
      )}
      {error ? <p role="alert" className="rounded-lg bg-bad-bg px-3 py-2 text-sm font-semibold text-bad-fg">{error}</p> : null}
      <button disabled={busy} className="btn-primary mt-1 min-h-[48px] w-full text-[15px]">{busy ? "Checking…" : step ? "Verify and log in" : "Log in"}</button>
      {step ? (
        <span className="flex justify-between text-[13px]">
          <button type="button" disabled={busy} onClick={() => attempt(step.identifier, step.password)} className="font-semibold text-brand">Send a new code</button>
          <button type="button" onClick={() => { setStep(null); setError(null); }} className="font-semibold text-ink-muted">Back</button>
        </span>
      ) : (
        <p className="text-center text-[13px] text-ink-muted">Forgot your password? Ask a super admin to set a new one in Admin → Team.</p>
      )}
    </form>
  );
}
