"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { staffLoginStep } from "@/app/actions/staff-account";
import { StaffReset } from "./StaffReset";

/** Same value as STAFF_CODE_SENT in src/lib/auth.ts (not imported: that module is server-only). */
const CODE_SENT = "STAFF_CODE_SENT";

/**
 * Email (or phone) and password sign-in for staff: at /login when coming from the admin, and at the
 * private /staff/<key> link. Someone new has no password yet: their number gets a code and they
 * choose one (StaffReset). With STAFF_SMS_CODE="on" every log-in also asks for a texted code.
 */
export function StaffSignIn({ next = "/admin" }: { next?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // After the right password: the same email and password, plus the texted code.
  const [step, setStep] = useState<null | { identifier: string; password: string }>(null);
  const [code, setCode] = useState("");
  const [resent, setResent] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [first, setFirst] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function attempt(identifier: string, password: string, smsCode?: string) {
    setBusy(true);
    setError(null);
    const fields = { identifier, password, ...(smsCode ? { code: smsCode } : {}), redirect: false };
    let res = await signIn("credentials", fields);
    // On a first visit the security token can change while the page is still starting up: NextAuth then
    // refuses the attempt quietly (answering "ok" with csrf=true), so try once more with the fresh token.
    if (res?.url?.includes("csrf=true")) res = await signIn("credentials", fields);
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
    if (!identifier) return setError("Enter your email or phone.");
    setBusy(true);
    setError(null);
    const start = await staffLoginStep(identifier).catch(() => ({ next: "password" }) as const);
    setBusy(false);
    if (start.next === "error") return setError(start.error);
    if (start.next === "code") { setFirst(identifier); setResetting(true); return; }
    if (!password) return setError("Enter your password.");
    return attempt(identifier, password);
  }

  const label = "flex flex-col gap-1.5 text-[14px] font-medium text-heading";

  if (resetting) return <StaffReset first={first} onBack={() => { setResetting(false); setFirst(null); }} onDone={() => { setResetting(false); setFirst(null); setNotice("Password saved. Log in with it now."); }} />;

  // Shown inside <StaffShell> (src/components/StaffShell.tsx), which draws the screen and the heading.
  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-4" noValidate>
      <h2 className="sr-only">Staff sign in</h2>
      {notice ? <p role="status" className="rounded-lg bg-brand-tint px-3 py-2.5 text-[13px] font-semibold text-brand-dark">{notice}</p> : null}
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
          <label className={label}>Email or phone
            <input name="email" type="text" autoComplete="username" autoFocus placeholder="you@example.com or 0772 123 456" className="input min-h-[48px] text-[15px]" />
          </label>
          <div className={label}>
            <span className="flex items-center justify-between gap-3">
              <label htmlFor="staff-password">Password</label>
              <button type="button" onClick={() => { setError(null); setNotice(null); setResetting(true); }} className="text-[13px] font-semibold text-brand hover:text-brand-dark">Forgot your password?</button>
            </span>
            <span className="relative block">
              <input id="staff-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" className="input min-h-[48px] w-full pr-12 text-[15px]" />
              <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ink-muted hover:text-heading">
                {showPassword ? <EyeOff aria-hidden className="h-[18px] w-[18px]" /> : <Eye aria-hidden className="h-[18px] w-[18px]" />}
              </button>
            </span>
          </div>
        </>
      )}
      {error ? <p role="alert" className="rounded-lg bg-bad-bg px-3 py-2 text-sm font-semibold text-bad-fg">{error}</p> : null}
      <button disabled={busy} className="btn-primary mt-1 min-h-[48px] w-full text-[15px]">{busy ? "Checking…" : step ? "Verify and log in" : "Log in"}</button>
      {step ? (
        <span className="flex justify-between text-[13px]">
          <button type="button" disabled={busy} onClick={() => attempt(step.identifier, step.password)} className="font-semibold text-brand">Send a new code</button>
          <button type="button" onClick={() => { setStep(null); setError(null); }} className="font-semibold text-ink-muted">Back</button>
        </span>
      ) : <p className="text-center text-[13px] text-ink-muted">First time here? Enter your phone number and press Log in. We&apos;ll text you a code.</p>}
    </form>
  );
}
