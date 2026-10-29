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
 *
 * With `paths` (the site-wide gate in the (site) layout), it instead catches every link into
 * those paths, wherever it sits: header, footer, chips, cards, search results. Links marked
 * `data-onboard` are left to the page's own gate so only one pop-up opens.
 */
type Plan = { name: string; monthly: string | null; yearly: string | null };
type Step = "account" | "pay" | "done";

export function OnboardingGate({ children, signedIn, isMember, googleEnabled, plan, paths }: {
  children: React.ReactNode;
  signedIn: boolean;
  isMember: boolean;
  googleEnabled: boolean;
  plan: Plan;
  paths?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("account");
  const [next, setNext] = useState("/");

  const onClickCapture = (e: React.MouseEvent) => {
    if (isMember || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const a = (e.target as Element).closest<HTMLAnchorElement>("a[href]");
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
    if (paths) {
      if (a.hasAttribute("data-onboard")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !paths.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`))) return;
    } else if (!a.hasAttribute("data-onboard")) return;
    e.preventDefault();
    setNext(a.getAttribute("href") ?? "/");
    setStep(signedIn ? "pay" : "account");
    setOpen(true);
  };

  // Coming back from Google sign-in: carry on at the payment step. Only the site-wide gate
  // does this, so pages with their own gate don't open a second pop-up.
  useEffect(() => {
    if (!paths) return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("onboard") !== "pay") return;
    const target = q.get("next");
    setNext(target && target.startsWith("/") ? target : "/");
    window.history.replaceState(null, "", window.location.pathname);
    if (!isMember) { setStep("pay"); setOpen(true); }
  }, [isMember, paths]);

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
    <div role="dialog" aria-modal="true" aria-labelledby="onboard-title" className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto bg-ink/50 backdrop-blur-[2px] sm:items-center sm:px-4 sm:py-8" onClick={onClose}>
      {/* A sheet from the bottom on phones, a centred card on larger screens */}
      <div ref={panel} className="onboard-pop relative w-full max-w-[440px] overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl sm:border sm:border-line" onClick={(e) => e.stopPropagation()}>
        <span aria-hidden className="mx-auto mt-2.5 block h-1 w-9 rounded-full bg-line-strong sm:hidden" />
        <div className="flex items-center justify-between gap-3 px-5 pt-4 sm:px-6 sm:pt-5">
          {step !== "done" ? <Steps step={step} /> : <span />}
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-page hover:text-ink"><X className="h-[18px] w-[18px]" /></button>
        </div>
        <div className="px-5 pb-6 pt-3 sm:px-6">
          {step === "account" ? (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <h2 id="onboard-title" className="text-lg font-bold text-heading">Create your account</h2>
                <p className="text-[13px] leading-relaxed text-ink-muted">Sign up or sign in with your phone number. Already a member? Use the same number to get straight back in.</p>
              </div>
              <PhoneSignIn size="md" onSignedIn={signedInNow} googleEnabled={googleEnabled} googleCallbackUrl={`/?onboard=pay&next=${encodeURIComponent(next)}`} />
            </div>
          ) : null}
          {step === "pay" ? <PayStep plan={plan} onDone={() => { router.refresh(); setStep("done"); }} /> : null}
          {step === "done" ? <DoneStep onContinue={() => { router.push(next); onClose(); }} /> : null}
        </div>
      </div>
    </div>
  );
}

/** "1 Account — 2 Payment" at the top of the pop-up. */
function Steps({ step }: { step: Step }) {
  const items: [Step, string][] = [["account", "Account"], ["pay", "Payment"]];
  const at = items.findIndex(([k]) => k === step);
  return (
    <ol className="flex items-center gap-2 text-[12px] font-semibold">
      {items.map(([k, label], n) => (
        <li key={k} className="flex items-center gap-2" aria-current={n === at ? "step" : undefined}>
          {n ? <span aria-hidden className={`h-px w-6 ${n <= at ? "bg-brand" : "bg-line-strong"}`} /> : null}
          <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${n <= at ? "bg-brand text-white" : "bg-page text-ink-muted"}`}>{n < at ? <Check className="h-3 w-3" /> : n + 1}</span>
          <span className={n === at ? "text-heading" : "text-ink-muted"}>{label}</span>
        </li>
      ))}
    </ol>
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
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-tint text-brand"><Check className="h-6 w-6" /></span>
      <h2 id="onboard-title" className="text-lg font-bold text-heading">You have full access</h2>
      <p className="text-[13px] text-ink-muted">Taking you there now…</p>
      <button type="button" onClick={onContinue} className="btn-primary mt-2 min-h-[48px] w-full">Continue</button>
    </div>
  );
}

const METHODS = [
  { id: "MTN_MOMO", label: "MTN MoMo", icon: Smartphone, tone: "bg-[#FFCB05] text-ink" },
  { id: "AIRTEL_MONEY", label: "Airtel Money", icon: Smartphone, tone: "bg-[#E40000] text-white" },
  { id: "CARD", label: "Card", icon: CreditCard, tone: "bg-heading text-white" },
] as const;

const PERKS = ["Full plans and start-up budgets", "Supplier and expert contacts", "Funding terms, prices and downloads"];

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
    <form onSubmit={pay} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <h2 id="onboard-title" className="text-lg font-bold text-heading">Unlock full access</h2>
        <p className="text-[13px] leading-relaxed text-ink-muted">One membership opens every directory.</p>
      </div>

      <div className="rounded-xl border border-line bg-page p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-semibold text-ink-soft">{plan.name}</span>
          <div role="group" aria-label="Billing period" className="flex rounded-lg border border-line bg-white p-0.5 text-[12px] font-semibold">
            {(["MONTHLY", "YEARLY"] as const).map((p) => (
              <button key={p} type="button" onClick={() => setPeriod(p)} aria-pressed={period === p} className={`rounded-md px-3 py-1 transition-colors ${period === p ? "bg-brand text-white" : "text-ink-muted hover:text-ink"}`}>{p === "MONTHLY" ? "Monthly" : "Yearly"}</button>
            ))}
          </div>
        </div>
        <p className="mt-2 font-display text-[22px] font-bold tracking-tight text-heading">{price ?? <span className="text-[15px] font-semibold text-ink-muted">Price to be confirmed</span>}{price ? <span className="ml-1 text-[13px] font-medium text-ink-muted">/ {period === "MONTHLY" ? "month" : "year"}</span> : null}</p>
        <ul className="mt-3 flex flex-col gap-1.5 border-t border-line pt-3">
          {PERKS.map((t) => <li key={t} className="flex items-center gap-2 text-[13px] text-ink-soft"><Check aria-hidden className="h-3.5 w-3.5 shrink-0 text-brand" />{t}</li>)}
        </ul>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[13px] font-semibold text-ink-soft">Pay with</legend>
        <div className="grid grid-cols-3 gap-2">
          {METHODS.map((m) => (
            <label key={m.id} className={`flex min-h-[48px] cursor-pointer items-center gap-2 rounded-[10px] border px-2.5 text-[12px] font-semibold transition-colors ${method === m.id ? "border-brand bg-brand-tint/60 text-heading ring-1 ring-brand" : "border-line text-ink-soft hover:border-line-strong"}`}>
              <input type="radio" name="method" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} className="sr-only" />
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${m.tone}`}><m.icon className="h-3.5 w-3.5" /></span>
              <span className="leading-tight">{m.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {method !== "CARD" ? (
        <label className="label text-[13px]">
          Mobile money number
          <input name="payPhone" type="tel" inputMode="tel" placeholder="0772 123 456" autoComplete="tel" value={payPhone}
            onChange={(e) => { setPayPhone(e.target.value); const net = networkOf(`+256${e.target.value.replace(/\D/g, "").replace(/^(256|0)/, "")}`); if (net) setMethod(net); }}
            className="input min-h-[48px] text-[15px]" />
          <span className="text-[12px] font-normal text-ink-muted">You&apos;ll get a prompt on this phone to approve the payment.</span>
        </label>
      ) : null}

      {result?.status === "error" ? <p role="alert" className="rounded-lg bg-warn-bg px-3 py-2 text-[13px] font-medium text-warn-fg">{result.message}</p> : null}
      {result?.status === "prompt_sent" ? <p role="status" className="rounded-lg bg-brand-tint px-3 py-2 text-[13px] font-medium text-brand-dark">Check your phone and approve the payment. Your access opens as soon as it goes through.</p> : null}

      <button disabled={busy} className="btn-primary min-h-[48px] w-full text-[15px]"><LockKeyhole className="h-4 w-4" />{busy ? "Starting payment…" : price ? `Pay ${price}` : "Pay and unlock"}</button>
      <p className="flex items-center justify-center gap-1.5 text-[12px] text-ink-muted"><LockKeyhole aria-hidden className="h-3 w-3" />Secure payment · Cancel any time from your account</p>
    </form>
  );
}
