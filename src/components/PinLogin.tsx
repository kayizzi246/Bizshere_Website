"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { KeyRound, Loader2, LockKeyhole, Phone, Smartphone } from "lucide-react";
import { pinStatus, requestPinReset, resetPinWithCode } from "@/app/actions/pin";

/** Wrong PINs before the "Reset PIN" button appears (the server pauses sign-in after 5). */
const RESET_AFTER = 4;

const WORDS = {
  supplier: { title: "Supplier sign in", intro: "For sellers listed on BizSphere-Ug. Sign in with your phone and 4-digit PIN.", who: "a seller", register: "This phone isn't registered yet. Register your business to get your dashboard." },
  expert: { title: "Expert sign in", intro: "For business experts listed on BizSphere-Ug. Sign in with your phone and 4-digit PIN.", who: "an expert", register: "This phone isn't registered yet. Register as an expert to get your dashboard." },
  any: { title: "Sign in", intro: "Enter your 4-digit PIN.", who: "a seller or expert", register: "Call us and we'll set up your sign-in." },
} as const;

/**
 * Phone-and-PIN sign-in for sellers (/suppliers/login), experts (/experts/login) and the personal
 * sign-in address (/<username>, `account` set: the PIN only). The team's registration texts the
 * first PIN; the portal then asks for a new one. After 4 wrong PINs a "Reset PIN" button texts a
 * one-time code; code + new PIN resets it and signs in. Unregistered numbers are told to call the team.
 */
export function PinLogin({ kind, portal, callPhone, account }: {
  kind: "supplier" | "expert" | "any";
  portal: string;
  callPhone: string | null;
  account?: { login: string; name: string; phoneHint: string | null };
}) {
  const words = WORDS[kind];
  const [phone, setPhone] = useState("");
  const login = account?.login ?? phone;
  const [pinValue, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [fails, setFails] = useState(0);
  const [state, setState] = useState<"idle" | "not-registered" | "no-password" | "invalid" | "wrong">("idle");
  // Reset: "code" after the SMS is sent.
  const [reset, setReset] = useState<null | { step: "code"; length: number }>(null);
  const [code, setCode] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const digits = (v: string, n: number) => v.replace(/\D/g, "").slice(0, n);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setState("idle");
    const status = await pinStatus(login, kind).catch(() => "invalid" as const);
    if (status !== "ok") { setState(status); setBusy(false); return; }
    const res = await signIn("credentials", { identifier: login, password: pinValue, redirect: false });
    if (res?.ok) { window.location.assign(portal); return; }
    setFails((n) => n + 1);
    setState("wrong");
    setPin("");
    setBusy(false);
  }

  async function sendResetCode() {
    setBusy(true);
    setError(null);
    const res = await requestPinReset(login, kind).catch(() => ({ ok: false as const, error: "Something went wrong. Please try again." }));
    setBusy(false);
    if (res.ok) { setResent(Boolean(reset)); setCode(""); setReset({ step: "code", length: res.length }); }
    else setError(res.error);
  }

  async function saveNewPin(e: React.FormEvent) {
    e.preventDefault();
    if (next.length !== 4 || next !== again) { setError("Enter the same 4-digit PIN twice."); return; }
    setBusy(true);
    setError(null);
    const res = await resetPinWithCode(login, code, next, kind).catch(() => ({ ok: false as const, error: "Something went wrong. Please try again." }));
    if (!res.ok) { setError(res.error); setBusy(false); return; }
    const done = await signIn("credentials", { identifier: login, password: next, redirect: false });
    if (done?.ok) window.location.assign(portal);
    else { setBusy(false); setReset(null); setFails(0); setState("idle"); }
  }

  const call = callPhone ? (
    <a href={`tel:${callPhone.replace(/\s/g, "")}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-dark hover:text-white"><Phone aria-hidden className="h-4 w-4" />Call {callPhone}</a>
  ) : (
    <a href="/contact" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-dark hover:text-white"><Phone aria-hidden className="h-4 w-4" />Contact the team</a>
  );
  const pinInput = "input min-h-[46px] w-full pl-9 text-[18px] tracking-[0.5em]";
  const sentTo = account ? (account.phoneHint ?? "your phone") : phone;

  return (
    // Shown inside <AuthShell> (src/components/AuthShell.tsx), which draws the card and the page heading.
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1 text-center">
        <h2 className="font-display text-[22px] font-extrabold tracking-[-0.02em] text-heading">{reset ? "Reset your PIN" : account ? `Welcome, ${account.name}` : words.title}</h2>
        <p className="text-[14px] text-ink-muted">{reset ? (resent ? `New code sent to ${sentTo}. Use the newest SMS: earlier codes no longer work.` : `We sent a code by SMS to ${sentTo}.`) : account ? `Enter your 4-digit PIN to open your dashboard${account.phoneHint ? ` (phone ${account.phoneHint})` : ""}.` : words.intro}</p>
      </div>

      {reset ? (
        <form onSubmit={saveNewPin} className="flex flex-col gap-3" noValidate>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-soft">Code from the SMS
            <input inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(digits(e.target.value, reset.length))} placeholder={"•".repeat(reset.length)} className="input min-h-[46px] w-full text-center text-[18px] tracking-[0.5em]" />
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-soft">New 4-digit PIN
            <span className="relative"><KeyRound aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input type="password" inputMode="numeric" autoComplete="new-password" required value={next} onChange={(e) => setNext(digits(e.target.value, 4))} className={pinInput} /></span>
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-soft">Repeat the new PIN
            <span className="relative"><KeyRound aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input type="password" inputMode="numeric" autoComplete="new-password" required value={again} onChange={(e) => setAgain(digits(e.target.value, 4))} className={pinInput} /></span>
          </label>
          {error ? <p role="alert" className="text-sm font-semibold text-bad-fg">{error}</p> : null}
          <button disabled={busy} className="btn-primary min-h-[48px] w-full text-[15px] disabled:opacity-60">{busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}{busy ? "Saving…" : "Save PIN and sign in"}</button>
          <span className="flex justify-between text-[13px]">
            <button type="button" onClick={sendResetCode} disabled={busy} className="font-semibold text-brand">Send the code again</button>
            <button type="button" onClick={() => { setReset(null); setError(null); }} className="font-semibold text-ink-muted">Back to sign in</button>
          </span>
        </form>
      ) : state === "not-registered" ? (
        <div role="alert" className="flex flex-col gap-3 rounded-xl bg-accent-tint p-4">
          <p className="text-sm font-semibold text-accent-dark">This {account ? "account" : "number"} isn&apos;t registered as {words.who}.</p>
          <p className="text-sm text-ink-soft">{words.register}</p>
          {kind === "any" ? call : <a href={kind === "expert" ? "/experts/join" : "/suppliers/join"} className="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-dark hover:text-white">{kind === "expert" ? "Become an Expert" : "Become a Supplier"}</a>}
          {account ? null : <button type="button" onClick={() => setState("idle")} className="text-left text-[13px] font-semibold text-brand">Try another number</button>}
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
          {account ? null : (
            <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-soft">Phone number
              <span className="relative">
                <Smartphone aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <input type="tel" inputMode="tel" autoComplete="tel" required value={phone} onChange={(e) => { setPhone(e.target.value); setFails(0); }} placeholder="0772 123 456" className="input min-h-[46px] w-full pl-9 text-[15px]" />
              </span>
            </label>
          )}
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-soft">4-digit PIN
            <span className="relative">
              <LockKeyhole aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input type="password" inputMode="numeric" autoComplete="current-password" autoFocus={Boolean(account)} required value={pinValue} onChange={(e) => setPin(digits(e.target.value, 4))} placeholder="••••" className={pinInput} />
            </span>
          </label>
          {state === "invalid" ? <p role="alert" className="text-sm font-semibold text-bad-fg">Enter a valid phone number, e.g. 0772 123 456.</p> : null}
          {state === "wrong" ? <p role="alert" className="text-sm font-semibold text-bad-fg">Wrong PIN{fails < RESET_AFTER ? ` (${RESET_AFTER - fails} ${RESET_AFTER - fails === 1 ? "try" : "tries"} before you can reset it)` : ""}.</p> : null}
          {state === "no-password" ? <p role="alert" className="text-sm font-semibold text-bad-fg">Your PIN isn&apos;t set up yet. Reset it below, or call us.</p> : null}
          {error ? <p role="alert" className="text-sm font-semibold text-bad-fg">{error}</p> : null}
          <button disabled={busy || pinValue.length !== 4} className="btn-primary min-h-[48px] w-full text-[15px] disabled:opacity-60">{busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}{busy ? "Signing in…" : "Sign in"}</button>
          {fails >= RESET_AFTER || state === "no-password" ? (
            <button type="button" onClick={sendResetCode} disabled={busy} className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border-2 border-accent bg-accent-tint text-[15px] font-bold text-accent-dark hover:bg-accent hover:text-ink disabled:opacity-60">
              <KeyRound aria-hidden className="h-4 w-4" />Reset PIN by SMS
            </button>
          ) : null}
          <p className="text-center text-[13px] text-ink-muted">Not registered as {words.who}? {callPhone ? <a href={`tel:${callPhone.replace(/\s/g, "")}`} className="font-semibold">Call {callPhone}</a> : <a href="/contact" className="font-semibold">Contact us</a>} to register.</p>
        </form>
      )}
    </div>
  );
}
