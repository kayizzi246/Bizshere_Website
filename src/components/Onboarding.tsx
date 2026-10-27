"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CreditCard, LockKeyhole, Smartphone, X } from "lucide-react";
import { accessState, startMembership, type CheckoutOutcome } from "@/app/actions/onboarding";
import { PhoneSignIn } from "./PhoneSignIn";

/**
 * Onboarding pop-up for directory cards: sign in with a phone number (or Google)
 * → pay → full access, then on to the page that was tapped.
 *
 * Wrap any content with <OnboardingGate>. Links inside it marked `data-onboard`
 * open the pop-up instead of navigating, unless the viewer already has full access.
 * The link still works normally without JavaScript or when opened in a new tab.
 */
type Plan = { name: string; monthly: string | null; yearly: string | null };
type Step = "account" | "pay" | "done";

export function OnboardingGate({ children, signedIn, isMember, googleEnabled, plan }: {
  children: React.ReactNode;
  signedIn: boolean;
  isMember: boolean;
  googleEnabled: boolean;
  plan: Plan;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("account");
  const [next, setNext] = useState("/");

  const onClickCapture = (e: React.MouseEvent) => {
    if (isMember || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const a = (e.target as Element).closest<HTMLAnchorElement>("a[data-onboard]");
    if (!a) return;
    e.preventDefault();
    setNext(a.getAttribute("href") ?? "/");
    setStep(signedIn ? "pay" : "account");
    setOpen(true);
  };

  // Coming back from Google sign-in: carry on at the payment step.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("onboard") !== "pay") return;
    const target = q.get("next");
    setNext(target && target.startsWith("/") ? target : "/");
    window.history.replaceState(null, "", window.location.pathname);
    if (!isMember) { setStep("pay"); setOpen(true); }
  }, [isMember]);

  return (
    <div onClickCapture={onClickCapture}>
      {children}
      {open ? <OnboardingModal step={step} setStep={setStep} next={next} googleEnabled={googleEnabled} plan={plan} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

function OnboardingModal({ step, setStep, next, googleEnabled, plan, onClose }: {
  step: Step;
  setStep: (s: Step) => void;
  next: string;
  googleEnabled: boolean;
  plan: Plan;
  onClose: () => void;
}) {
  const router = useRouter();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const signedInNow = useCallback(async () => {
    router.refresh();
    const s = await accessState();
    if (s.isMember) { router.push(next); onClose(); } else setStep("pay");
  }, [next, onClose, router, setStep]);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="onboard-title" className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-ink/60 px-4 py-8 sm:items-center" onClick={onClose}>
      <div ref={panel} className="onboard-pop relative w-full max-w-[560px] overflow-hidden rounded-3xl bg-white" onClick={(e) => e.stopPropagation()}>
        <div aria-hidden className="h-1.5 bg-brand" />
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-5 flex h-10 w-10 items-center justify-center rounded-xl text-ink-muted hover:bg-page hover:text-ink"><X className="h-5 w-5" /></button>
        <div className="p-7 sm:p-10">
          {step === "account" ? (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2 pr-10">
                <h2 id="onboard-title" className="text-2xl font-extrabold sm:text-3xl">Get full access</h2>
                <p className="text-[15px] leading-relaxed text-ink-muted">Enter your phone number to unlock full plans, contacts, prices and downloads. Already subscribed? Use the same number and you&apos;re straight back in.</p>
              </div>
              <PhoneSignIn onSignedIn={signedInNow} googleEnabled={googleEnabled} googleCallbackUrl={`/?onboard=pay&next=${encodeURIComponent(next)}`} />
            </div>
          ) : null}
          {step === "pay" ? <PayStep plan={plan} onDone={() => { router.refresh(); setStep("done"); }} /> : null}
          {step === "done" ? <DoneStep onContinue={() => { router.push(next); onClose(); }} /> : null}
        </div>
      </div>
    </div>
  );
}

/** Success screen: moves on to the page they tapped by itself; the button is there for the impatient. */
function DoneStep({ onContinue }: { onContinue: () => void }) {
  const go = useRef(onContinue);
  go.current = onContinue;
  useEffect(() => {
    const t = setTimeout(() => go.current(), 1500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-tint text-brand"><Check className="h-8 w-8" /></span>
      <h2 id="onboard-title" className="text-2xl font-extrabold sm:text-3xl">You have full access</h2>
      <p className="text-[15px] text-ink-muted">Taking you there now…</p>
      <button type="button" onClick={onContinue} className="btn-primary mt-2 min-h-[56px] w-full text-lg">Continue</button>
    </div>
  );
}

const METHODS = [
  { id: "MTN_MOMO", label: "MTN MoMo", icon: Smartphone },
  { id: "AIRTEL_MONEY", label: "Airtel Money", icon: Smartphone },
  { id: "CARD", label: "Card", icon: CreditCard },
] as const;

/** +256772123456 → "0772 123 456"; anything else is shown as stored. */
function localPhone(p: string) {
  const m = /^\+256(\d{3})(\d{3})(\d{3})$/.exec(p);
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : p;
}

/** Network from a Ugandan mobile number: MTN 076/077/078/039, Airtel 070/074/075/020. */
function networkOf(p: string): "MTN_MOMO" | "AIRTEL_MONEY" | null {
  const m = /^\+256(\d{2})/.exec(p);
  if (!m) return null;
  if (["76", "77", "78", "39"].includes(m[1])) return "MTN_MOMO";
  if (["70", "74", "75", "20"].includes(m[1])) return "AIRTEL_MONEY";
  return null;
}

function PayStep({ plan, onDone }: { plan: Plan; onDone: () => void }) {
  const [period, setPeriod] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [method, setMethod] = useState<(typeof METHODS)[number]["id"]>("MTN_MOMO");
  const [payPhone, setPayPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckoutOutcome | null>(null);
  const price = period === "MONTHLY" ? plan.monthly : plan.yearly;

  // Pre-fill the number they signed in with, and pick its network, so most people only tap "Pay".
  useEffect(() => {
    accessState().then((s) => {
      if (!s.phone) return;
      setPayPhone((cur) => cur || localPhone(s.phone!));
      const net = networkOf(s.phone);
      if (net) setMethod(net);
    }).catch(() => {});
  }, []);

  async function pay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    const res = await startMembership({ period, method, phone: payPhone });
    setBusy(false);
    if (res.status === "active") onDone();
    else if (res.status === "redirect") window.location.href = res.url;
    else setResult(res);
  }

  return (
    <form onSubmit={pay} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2 pr-10">
        <h2 id="onboard-title" className="text-2xl font-extrabold sm:text-3xl">Unlock full access</h2>
        <p className="text-[15px] leading-relaxed text-ink-muted">Full plans and budgets, supplier and expert contacts, funding terms, price history and downloads.</p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-brand/30 bg-brand-tint/60 p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="font-display text-lg font-bold">{plan.name}</span>
          <div role="group" aria-label="Billing period" className="flex rounded-lg bg-white p-0.5 text-sm font-semibold">
            {(["MONTHLY", "YEARLY"] as const).map((p) => (
              <button key={p} type="button" onClick={() => setPeriod(p)} aria-pressed={period === p} className={`rounded-md px-3.5 py-1.5 ${period === p ? "bg-brand text-white" : "text-ink-muted"}`}>{p === "MONTHLY" ? "Monthly" : "Yearly"}</button>
            ))}
          </div>
        </div>
        <span className="font-display text-3xl font-extrabold">{price ?? <span className="text-lg font-semibold text-ink-muted">Price to be confirmed</span>}{price ? <span className="ml-1 text-base font-medium text-ink-muted">/ {period === "MONTHLY" ? "month" : "year"}</span> : null}</span>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold text-ink-soft">Pay with</legend>
        <div className="grid grid-cols-3 gap-2.5">
          {METHODS.map((m) => (
            <label key={m.id} className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-4 text-center text-sm font-semibold transition ${method === m.id ? "border-brand bg-brand-tint text-brand" : "border-line text-ink-soft hover:border-line-strong"}`}>
              <input type="radio" name="method" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} className="sr-only" />
              <m.icon className="h-6 w-6" />{m.label}
            </label>
          ))}
        </div>
      </fieldset>

      {method !== "CARD" ? (
        <label className="label">
          Mobile money number
          <input name="payPhone" type="tel" inputMode="tel" placeholder="0772 123 456" autoComplete="tel" value={payPhone}
            onChange={(e) => { setPayPhone(e.target.value); const net = networkOf(`+256${e.target.value.replace(/\D/g, "").replace(/^(256|0)/, "")}`); if (net) setMethod(net); }}
            className="input min-h-[56px] text-lg" />
          <span className="text-xs font-normal text-ink-muted">You&apos;ll get a prompt on this phone to approve the payment.</span>
        </label>
      ) : null}

      {result?.status === "error" ? <p role="alert" className="rounded-lg bg-warn-bg px-3 py-2 text-sm font-medium text-warn-fg">{result.message}</p> : null}
      {result?.status === "prompt_sent" ? <p role="status" className="rounded-lg bg-brand-tint px-3 py-2 text-sm font-medium text-brand-dark">Check your phone and approve the payment. Your access opens as soon as it goes through.</p> : null}

      <button disabled={busy} className="btn-primary min-h-[56px] w-full text-lg"><LockKeyhole className="h-5 w-5" />{busy ? "Starting payment…" : "Pay and unlock"}</button>
      <p className="text-center text-xs text-ink-muted">Cancel any time from your account.</p>
    </form>
  );
}
