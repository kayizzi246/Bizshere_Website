"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CreditCard, Download, Landmark, LockKeyhole, Phone, Smartphone, Sparkles, Wallet, X } from "lucide-react";
import { accessState, startMembership, type CheckoutOutcome } from "@/app/actions/onboarding";
import { PhoneSignIn } from "./PhoneSignIn";
import { site } from "@/config/site";

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
 *
 * Links marked `data-pay` (Subscribe, Get full access) open the pop-up straight away on any page,
 * at the payment step, or at sign-in first for visitors without an account. `data-next` is where
 * to go afterwards. Their href (?onboard=pay) does the same on a full page load.
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
    if (paths && a.hasAttribute("data-pay")) {
      e.preventDefault();
      setNext(a.dataset.next?.startsWith("/") ? a.dataset.next : "/business-ideas");
      setStep(signedIn ? "pay" : "account");
      setOpen(true);
      return;
    }
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
    if (!isMember) { setStep(signedIn ? "pay" : "account"); setOpen(true); }
  }, [isMember, signedIn, paths]);

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
    <div role="dialog" aria-modal="true" aria-labelledby="onboard-title" className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto bg-ink/60 backdrop-blur-sm sm:items-center sm:px-4 sm:py-8" onClick={onClose}>
      {/* A sheet from the bottom on phones; a large two-panel card on larger screens: why it's worth it on the left, the form on the right */}
      <div ref={panel} className="onboard-pop relative grid max-h-[calc(100dvh-0.5rem)] w-full max-w-[880px] overflow-y-auto overscroll-contain rounded-t-3xl bg-white md:max-h-none md:grid-cols-[1fr_1.05fr] md:overflow-hidden md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        {/* Pinned to the top of the sheet, so it stays in reach while the sheet scrolls on phones */}
        {/* Desktop: positioned absolutely, so it is not a grid cell and the two panels keep their columns */}
        <div className="sticky top-0 z-10 col-span-full h-0 md:absolute md:inset-x-0 md:top-0">
          <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink hover:bg-page"><X className="h-5 w-5" /></button>
        </div>

        <WhyPanel plan={plan} />

        <div className="flex flex-col justify-center px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 sm:px-9 sm:pb-8 sm:pt-7 md:py-10">
          {step === "account" ? (
            <div className="flex flex-col gap-5">
              <StepBar n={1} />
              <div className="flex flex-col gap-2">
                <h2 id="onboard-title" className="font-display text-[26px] font-extrabold leading-[1.1] tracking-[-0.03em] text-heading sm:text-[30px]">Create your account</h2>
                <p className="text-[13px] leading-relaxed text-ink-muted">Just your phone number. No password. Already a member? Use the same number to get back in.</p>
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

const WHY = [
  { icon: Wallet, title: "Know the real cost first", text: "Full start-up budgets and every step of each business plan, line by line." },
  { icon: Phone, title: "Call the right people", text: "Supplier and expert contacts, each marked with the date we checked it." },
  { icon: Landmark, title: "Find money that fits", text: "Funding amounts, terms and criteria, and machine prices to compare." },
  { icon: Download, title: "Keep everything", text: "Price history, downloadable tools and templates, and pages you save." },
];

/** Left panel: why an account and membership are worth it. Navy like the hero; trimmed on phones. */
function WhyPanel({ plan }: { plan: Plan }) {
  return (
    <div className="relative isolate overflow-hidden bg-[#071A33] px-5 pb-4 pt-5 pr-16 text-white sm:px-9 sm:pb-6 sm:pt-8 md:py-10 md:pr-9">
      {/* Faint flat rings in the bottom-right corner, behind the list */}
      <svg aria-hidden viewBox="0 0 400 400" fill="none" className="pointer-events-none absolute -bottom-40 -right-40 -z-10 hidden h-[400px] w-[400px] sm:block">
        {[70, 130, 190].map((r) => <circle key={r} cx="200" cy="200" r={r} stroke="white" strokeOpacity="0.07" strokeWidth="1.5" />)}
      </svg>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-ink"><Sparkles aria-hidden className="h-3 w-3" />Full access</span>
      <p className="mt-3 font-display text-[24px] font-extrabold leading-[1.1] tracking-[-0.03em] sm:mt-4 sm:text-[28px] md:text-[32px]">Start your business with the <span className="text-accent">full picture</span></p>
      <p className="mt-2.5 hidden text-[12px] leading-relaxed text-white/65 sm:block">Free visitors see a preview. Members see everything to plan, buy and borrow.</p>
      <ul className="mt-6 hidden flex-col gap-2.5 sm:flex">
        {WHY.map((w) => (
          <li key={w.title} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent"><w.icon aria-hidden className="h-[18px] w-[18px]" /></span>
            <span className="flex flex-col gap-0.5">
              <span className="font-display text-[15px] font-bold leading-tight">{w.title}</span>
              <span className="text-[11.5px] leading-snug text-white/60">{w.text}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-white/75 sm:mt-6 sm:border-t sm:border-white/15 sm:pt-4 sm:text-[12px]">
        {plan.monthly ? <span><strong className="text-[14px] font-bold text-white">{plan.monthly}</strong> / month</span> : null}
        <span className="inline-flex items-center gap-1.5"><Check aria-hidden className="h-3.5 w-3.5 text-accent" />Cancel any time</span>
        <span className="inline-flex items-center gap-1.5"><Check aria-hidden className="h-3.5 w-3.5 text-accent" />MoMo, Airtel or card</span>
      </div>
    </div>
  );
}

/** "Step 1 of 2": account, then payment, as two bars that fill in. */
function StepBar({ n }: { n: 1 | 2 }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-bold uppercase tracking-wider text-accent-dark">Step {n} of 2 · {n === 1 ? "Your account" : "Payment"}</span>
      <span aria-hidden className="grid grid-cols-2 gap-1.5">
        <span className="h-1.5 rounded-full bg-brand" />
        <span className={`h-1.5 rounded-full ${n === 2 ? "bg-brand" : "bg-line"}`} />
      </span>
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
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-tint text-brand"><Check className="h-6 w-6" /></span>
      <h2 id="onboard-title" className="font-display text-[26px] font-extrabold tracking-[-0.03em] text-heading">You have full access</h2>
      <p className="text-[13px] text-ink-muted">Taking you there now…</p>
      <button type="button" onClick={onContinue} className="btn-primary mt-2 min-h-[46px] w-full text-[15px]">Continue</button>
    </div>
  );
}

const METHODS = [
  { id: "MTN_MOMO", label: "MTN MoMo", icon: Smartphone, tone: "bg-[#FFCB05] text-ink" },
  { id: "AIRTEL_MONEY", label: "Airtel Money", icon: Smartphone, tone: "bg-[#E40000] text-white" },
  { id: "CARD", label: "Card", icon: CreditCard, tone: "bg-heading text-white" },
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

  // After the mobile money prompt: check every few seconds whether the payment went through
  // (the gateway's webhook grants access), and carry on by itself, for up to 5 minutes.
  const waiting = result?.status === "prompt_sent";
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (!waiting) return;
    let tries = 0;
    const t = setInterval(async () => {
      tries += 1;
      const s = await accessState().catch(() => null);
      if (s?.isMember) { clearInterval(t); done.current(); }
      else if (tries >= 75) clearInterval(t);
    }, 4000);
    return () => clearInterval(t);
  }, [waiting]);

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
        <StepBar n={2} />
        <h2 id="onboard-title" className="mt-3 font-display text-[26px] font-extrabold leading-[1.1] tracking-[-0.03em] text-heading sm:text-[30px]">Unlock full access</h2>
        <p className="text-[13px] leading-relaxed text-ink-muted">One membership opens every directory. You&apos;re in straight away.</p>
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
        <p className="mt-2 font-display text-[20px] font-bold tracking-tight text-heading">{price ?? <span className="text-[15px] font-semibold text-ink-muted">Price to be confirmed</span>}{price ? <span className="ml-1 text-[13px] font-medium text-ink-muted">/ {period === "MONTHLY" ? "month" : "year"}</span> : null}</p>
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
            className="input min-h-[44px] text-[15px]" />
          <span className="text-[12px] font-normal text-ink-muted">You&apos;ll get a prompt on this phone to approve the payment.</span>
        </label>
      ) : null}

      {result?.status === "error" ? (
        <div role="alert" className="flex flex-col gap-1.5 rounded-lg bg-warn-bg px-3 py-2.5 text-[13px] font-medium text-warn-fg">
          <p>{result.message}</p>
          {/* Never a dead end: a direct way to reach a person who can activate the membership */}
          <p className="flex flex-wrap gap-x-3 gap-y-1">
            {site.contact.whatsapp ? <a href={`https://wa.me/${site.contact.whatsapp.replace(/D/g, "")}?text=${encodeURIComponent("Hello, I want to pay for BizSphere-Ug membership.")}`} target="_blank" rel="noopener noreferrer" className="font-bold underline">WhatsApp us</a> : null}
            {site.contact.phone ? <a href={`tel:${site.contact.phone.replace(/s/g, "")}`} className="font-bold underline">Call {site.contact.phone}</a> : null}
            <a href="/contact" className="font-bold underline">Send us a message</a>
          </p>
        </div>
      ) : null}
      {waiting ? (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-brand-tint px-3 py-2 text-[13px] font-medium text-brand-dark">
          <span aria-hidden className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          Check your phone and enter your PIN to approve. This page opens your access by itself as soon as the payment goes through.
        </p>
      ) : null}

      <button disabled={busy || waiting} className="btn-primary min-h-[48px] w-full text-[15px]"><LockKeyhole className="h-4 w-4" />{busy ? "Starting payment…" : price ? `Pay ${price}` : "Pay and unlock"}</button>
      <p className="flex items-center justify-center gap-1.5 text-[12px] text-ink-muted"><LockKeyhole aria-hidden className="h-3 w-3" />Secure payment · Cancel any time from your account</p>
    </form>
  );
}
