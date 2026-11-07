"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Download, Landmark, LockKeyhole, Phone, ShieldCheck, Wallet, X } from "lucide-react";
import { accessState, cancelPayment, checkPayment, startMembership } from "@/app/actions/onboarding";
import { PhoneSignIn } from "./PhoneSignIn";
import { Celebration } from "./Celebration";
import { PLAN_PERIODS, yearlySaving } from "@/lib/billing";
import { site } from "@/config/site";
import { OPEN_PATHS } from "@/config/directories";

/**
 * Onboarding pop-up for directory cards: sign in with a phone number (or Google)
 * → choose a plan → pay on Pesapal's page inside the pop-up → full-screen welcome, then on to
 * the page that was tapped. The person never leaves the page they were on.
 *
 * Wrap any content with <OnboardingGate>. Links inside it marked `data-onboard`
 * open the pop-up instead of navigating, unless the viewer already has full access.
 * The link still works normally without JavaScript or when opened in a new tab.
 *
 * With `paths` (the site-wide gate in the (site) layout), it instead catches every link to a single
 * item under those paths, wherever it sits: header, footer, chips, cards, search results. Links to
 * the list pages themselves (e.g. /business-ideas) open for everyone. Links marked
 * `data-onboard` are left to the page's own gate so only one pop-up opens.
 *
 * Links marked `data-pay` (Subscribe, Get full access) open the pop-up straight away on any page,
 * at the plan step, or at sign-in first for visitors without an account. `data-renew` does the same
 * for members renewing early. `data-next` is where to go afterwards, `data-period` (DAILY, WEEKLY,
 * MONTHLY, YEARLY) the plan picked to start with. Their href (?onboard=pay or ?onboard=renew, &period=…)
 * does the same on a full page load, e.g. from a renewal reminder SMS.
 *
 * The pop-up only closes with its × button or Escape, never by tapping outside it.
 */
type Period = (typeof PLAN_PERIODS)[number];
type Plan = {
  name: string;
  currency: string;
  daily?: string | null;
  weekly?: string | null;
  monthly: string | null;
  yearly: string | null;
  amounts: Record<Period, number | null>;
};
type Step = "account" | "pay";
const PERIODS: readonly Period[] = PLAN_PERIODS;
const asPeriod = (v: string | null | undefined): Period => (PERIODS.includes(v as Period) ? (v as Period) : "MONTHLY");

export function OnboardingGate({ children, signedIn, isMember, googleEnabled, plan, paths }: {
  children: React.ReactNode;
  signedIn: boolean;
  isMember: boolean;
  googleEnabled: boolean;
  plan: Plan;
  paths?: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("account");
  const [next, setNext] = useState("/");
  const [period, setPeriod] = useState<Period>("MONTHLY");
  const [renew, setRenew] = useState(false);
  const [celebrate, setCelebrate] = useState<{ until: string | null; renewed: boolean } | null>(null);

  const openAt = useCallback((target: string, p: Period, renewing: boolean) => {
    setNext(target);
    setPeriod(p);
    setRenew(renewing);
    setStep(signedIn ? "pay" : "account");
    setOpen(true);
  }, [signedIn]);

  const onClickCapture = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const a = (e.target as Element).closest<HTMLAnchorElement>("a[href]");
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
    const target = a.dataset.next?.startsWith("/") ? a.dataset.next : null;
    // Renewing early: members too, and signed-in people only (the link is shown to them alone)
    if (paths && a.hasAttribute("data-renew") && signedIn) {
      e.preventDefault();
      openAt(target ?? location.pathname, asPeriod(a.dataset.period), true);
      return;
    }
    if (isMember) return;
    if (paths && a.hasAttribute("data-pay")) {
      e.preventDefault();
      openAt(target ?? "/business-ideas", asPeriod(a.dataset.period), false);
      return;
    }
    if (paths) {
      if (a.hasAttribute("data-onboard")) return;
      const url = new URL(a.href, location.href);
      // Only single items (/business-ideas/small-bakery); the lists themselves (/business-ideas) open for everyone
      if (url.origin !== location.origin || OPEN_PATHS.includes(url.pathname) || /\/(pdf|file)$/.test(url.pathname) || !paths.some((p) => url.pathname.startsWith(`${p}/`))) return;
      // On the homepage, an item opens its service (/machines/hammer-mill → /machines), where every one of
      // them is listed; paying starts there, from an item. Get full access buttons (data-pay) still pay here.
      if (location.pathname === "/") {
        e.preventDefault();
        router.push(paths.filter((p) => url.pathname.startsWith(`${p}/`)).sort((x, y) => y.length - x.length)[0]);
        return;
      }
    } else if (!a.hasAttribute("data-onboard")) return;
    e.preventDefault();
    openAt(a.getAttribute("href") ?? "/", "MONTHLY", false);
  };

  // Full page loads: ?onboard=pay (back from Google sign-in, old links), ?onboard=renew (renewal
  // reminders), ?welcome=1 (paid on Pesapal outside the pop-up). Only the site-wide gate does
  // this, so pages with their own gate don't open a second pop-up.
  useEffect(() => {
    if (!paths) return;
    const q = new URLSearchParams(window.location.search);
    const onboard = q.get("onboard");
    if (q.get("welcome") === "1") {
      window.history.replaceState(null, "", window.location.pathname + window.location.hash);
      accessState().then((s) => { if (s.isMember) setCelebrate({ until: s.memberUntil, renewed: false }); }).catch(() => {});
      return;
    }
    if (onboard !== "pay" && onboard !== "renew") return;
    const target = q.get("next");
    window.history.replaceState(null, "", window.location.pathname + window.location.hash);
    // Renewing while signed out (a reminder opened on another device): sign in first, then the plans
    const renewing = onboard === "renew";
    if (renewing || !isMember) openAt(target && target.startsWith("/") ? target : renewing ? window.location.pathname : "/", asPeriod(q.get("period")), renewing);
  }, [isMember, signedIn, paths, openAt]);

  // Paid: the pop-up closes and the full-screen welcome takes over.
  const paid = useCallback(async () => {
    setOpen(false);
    router.refresh();
    const s = await accessState().catch(() => null);
    setCelebrate({ until: s?.memberUntil ?? null, renewed: renew });
  }, [renew, router]);

  return (
    <div onClickCapture={onClickCapture}>
      {children}
      {open ? (
        <OnboardingModal step={step} setStep={setStep} next={next} renew={renew} initialPeriod={period} googleEnabled={googleEnabled} plan={plan}
          onPaid={paid} onClose={() => setOpen(false)} />
      ) : null}
      {celebrate ? (
        <Celebration until={celebrate.until} renewed={celebrate.renewed} onContinue={() => {
          setCelebrate(null);
          if (!celebrate.renewed && next !== location.pathname) router.push(next);
        }} />
      ) : null}
    </div>
  );
}

function OnboardingModal({ step, setStep, next, renew, initialPeriod, googleEnabled, plan, onPaid, onClose }: {
  step: Step;
  setStep: (s: Step) => void;
  next: string;
  renew: boolean;
  initialPeriod: Period;
  googleEnabled: boolean;
  plan: Plan;
  onPaid: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  // The Pesapal order open in the iframe, if any: closing the pop-up cancels it.
  const pending = useRef<string | null>(null);
  const [checkout, setCheckout] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const close = useCallback(async () => {
    const id = pending.current;
    pending.current = null;
    onClose();
    // Paid at the very last moment: keep it and welcome them
    if (id && (await cancelPayment(id).catch(() => null)) === "SUCCEEDED") onPaid();
  }, [onClose, onPaid]);
  const requestClose = useCallback(() => { if (pending.current) setConfirmLeave(true); else void close(); }, [close]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") requestClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [requestClose]);

  const signedInNow = useCallback(async () => {
    router.refresh();
    const s = await accessState();
    if (s.isMember && !renew) { router.push(next); onClose(); } else setStep("pay");
  }, [next, onClose, renew, router, setStep]);

  return (
    // No onClick on the backdrop: tapping outside never closes the pop-up (a payment may be under way)
    <div role="dialog" aria-modal="true" aria-labelledby="onboard-title" className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto bg-ink/60 backdrop-blur-sm sm:items-center sm:px-4 sm:py-8">
      {/* A sheet from the bottom on phones; a large two-panel card on larger screens: why it's worth it on the left, the form on the right.
          While paying, the Pesapal page takes the whole card. */}
      <div className={`onboard-pop relative grid max-h-[calc(100dvh-0.5rem)] w-full overflow-y-auto overscroll-contain rounded-t-3xl bg-white md:max-h-none md:overflow-hidden md:rounded-3xl ${checkout ? "max-w-[620px]" : "max-w-[920px] md:grid-cols-[1fr_1.1fr]"}`}>
        {/* Pinned to the top of the sheet, so it stays in reach while the sheet scrolls on phones */}
        {/* Desktop: positioned absolutely, so it is not a grid cell and the two panels keep their columns */}
        <div className="sticky top-0 z-20 col-span-full h-0 md:absolute md:inset-x-0 md:top-0">
          <button type="button" onClick={requestClose} aria-label="Close" className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink shadow-sm ring-1 ring-line hover:bg-page"><X className="h-5 w-5" /></button>
        </div>

        {checkout ? null : <WhyPanel renew={renew} />}

        <div className={`flex flex-col justify-center px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 sm:px-9 sm:pb-8 sm:pt-7 ${checkout ? "sm:px-6 md:py-6" : "md:py-10"}`}>
          {step === "account" ? (
            <div className="flex flex-col gap-5">
              <StepBar n={1} />
              <div className="flex flex-col gap-2">
                <h2 id="onboard-title" className="font-display text-[26px] font-extrabold leading-[1.1] tracking-[-0.03em] text-heading sm:text-[30px]">Create your account</h2>
                <p className="text-[13px] leading-relaxed text-ink-muted">Just your phone number. No password. Already a member? Use the same number to get back in.</p>
              </div>
              <PhoneSignIn size="md" onSignedIn={signedInNow} googleEnabled={googleEnabled} googleCallbackUrl={`/?onboard=pay&next=${encodeURIComponent(next)}`} />
            </div>
          ) : (
            <PayStep plan={plan} renew={renew} initialPeriod={initialPeriod} pending={pending} onCheckout={setCheckout} onPaid={() => { pending.current = null; onPaid(); }} />
          )}
        </div>

        {confirmLeave ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/90 p-6 backdrop-blur-sm">
            <div role="alertdialog" aria-labelledby="leave-title" className="flex max-w-sm flex-col gap-3 rounded-2xl border border-line bg-white p-6 text-center shadow-[0_12px_32px_rgba(7,26,51,0.14)]">
              <p id="leave-title" className="font-display text-[20px] font-extrabold text-heading">Stop this payment?</p>
              <p className="text-[13px] text-ink-muted">If you&apos;ve already approved it on your phone, wait a moment: we&apos;ll open your access as soon as it arrives.</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setConfirmLeave(false)} className="btn-primary min-h-[44px]">Keep paying</button>
                <button type="button" onClick={() => { setConfirmLeave(false); void close(); }} className="btn-outline min-h-[44px]">Cancel payment</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const WHY = [
  { icon: Wallet, title: "The real start-up cost", text: "Full budgets, line by line, and every step of each business plan." },
  { icon: Phone, title: "Who to call", text: "Supplier and expert contacts, with the date we last checked each one." },
  { icon: Landmark, title: "Where to borrow", text: "Funding amounts, terms and who qualifies." },
  { icon: Download, title: "Prices and downloads", text: "Price history, machine prices, tools and templates." },
];

/** Left panel: why an account and membership are worth it. Deep brand blue like the hero; trimmed on phones. */
function WhyPanel({ renew }: { renew: boolean }) {
  return (
    <div className="bg-brand-deep px-5 pb-4 pt-5 pr-16 text-white sm:px-9 sm:pb-6 sm:pt-8 md:py-10 md:pr-9">
      <p className="font-display text-[24px] font-extrabold leading-[1.12] tracking-[-0.02em] sm:text-[28px] md:text-[30px]">{renew ? "Keep every door open." : "Subscribe now to enjoy full access"}</p>
      <p className="mt-3 hidden text-[13px] leading-relaxed text-white/70 sm:block">{renew ? "Renew now and the new time is added to what you have left:" : "Anyone can read a preview. Members get the whole page:"}</p>
      <ul className="mt-4 hidden flex-col divide-y divide-white/10 sm:flex">
        {WHY.map((w) => (
          <li key={w.title} className="flex items-start gap-3 py-3 first:pt-0">
            <w.icon aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0 text-accent" />
            <span className="text-[13px] leading-snug text-white/70"><span className="font-semibold text-white">{w.title}.</span> {w.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** "Step 1 of 2": account, then payment, as two bars that fill in. */
function StepBar({ n }: { n: 1 | 2 }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-ink-muted">Step {n} of 2</span>
      <span aria-hidden className="grid grid-cols-2 gap-1.5">
        <span className="h-1.5 rounded-full bg-brand" />
        <span className={`h-1.5 rounded-full ${n === 2 ? "bg-brand" : "bg-line"}`} />
      </span>
    </div>
  );
}

const fmt = (n: number, currency: string) => `${currency} ${n.toLocaleString("en-UG", { maximumFractionDigits: 0 })}`;

const OPTIONS: Record<Period, { title: string; per: string; note: string }> = {
  DAILY: { title: "Day pass", per: "day", note: "24 hours of full access" },
  WEEKLY: { title: "Weekly", per: "week", note: "7 days of full access" },
  MONTHLY: { title: "Monthly", per: "month", note: "Renews monthly, cancel any time" },
  YEARLY: { title: "Yearly", per: "year", note: "One payment for 12 months" },
};

/**
 * Choose a plan, then pay on Pesapal's page in an iframe, all inside the pop-up. While the page is
 * open we check every few seconds whether the payment went through (Pesapal confirms it to the
 * server), and the return page inside the iframe tells us the moment it's done.
 */
function PayStep({ plan, renew, initialPeriod, pending, onCheckout, onPaid }: {
  plan: Plan;
  renew: boolean;
  initialPeriod: Period;
  pending: React.MutableRefObject<string | null>;
  onCheckout: (on: boolean) => void;
  onPaid: () => void;
}) {
  const available = PERIODS.filter((p) => plan.amounts[p] !== null);
  const [period, setPeriod] = useState<Period>(available.includes(initialPeriod) ? initialPeriod : available[0] ?? "MONTHLY");
  // Renewing: the member's current plan, marked "Your plan" (any other plan can be picked instead)
  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);
  useEffect(() => {
    if (!renew) return;
    accessState().then((s) => { if (s.memberPeriod) setCurrentPeriod(s.memberPeriod as Period); }).catch(() => {});
  }, [renew]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<{ url: string; paymentId: string } | null>(null);
  const [frameReady, setFrameReady] = useState(false);
  const [slow, setSlow] = useState(false);
  const [attemptFailed, setAttemptFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const amount = plan.amounts[period];
  const price = amount !== null ? fmt(amount, plan.currency) : null;
  const saving = yearlySaving(plan.amounts);

  const done = useRef(onPaid);
  done.current = onPaid;

  const settle = useCallback(async (paymentId: string) => {
    const s = await checkPayment(paymentId).catch(() => "PENDING" as const);
    if (s === "SUCCEEDED") { done.current(); return true; }
    // One attempt failed (prompt timed out, wrong PIN, low balance): keep Pesapal's page open to retry
    // the same order, and keep checking, since a retry that succeeds still counts.
    if (s === "FAILED") { setAttemptFailed(true); return false; }
    if (s === "CANCELLED" || s === "REFUNDED") {
      pending.current = null;
      setOrder(null);
      onCheckout(false);
      setError("The payment didn't go through and no money was taken. Please try again.");
      return true;
    }
    return false;
  }, [onCheckout, pending]);

  // Check every 4 seconds for up to 10 minutes, and at once when the return page says it's done.
  useEffect(() => {
    if (!order) return;
    let tries = 0;
    let stopped = false;
    const t = setInterval(async () => {
      tries += 1;
      if (tries === 45) setSlow(true);
      if (stopped || tries > 150) { clearInterval(t); return; }
      if (await settle(order.paymentId)) { stopped = true; clearInterval(t); }
    }, 4000);
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== "bizsphere:payment") return;
      void settle(order.paymentId).then((finished) => { if (finished) { stopped = true; clearInterval(t); } });
    };
    window.addEventListener("message", onMessage);
    return () => { clearInterval(t); window.removeEventListener("message", onMessage); };
  }, [order, settle]);

  async function start(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await startMembership({ period }).catch(() => ({ status: "error", message: "Something went wrong. Please try again." }) as const);
    setBusy(false);
    if (res.status === "active") onPaid();
    else if (res.status === "checkout") {
      pending.current = res.paymentId;
      setFrameReady(false);
      setSlow(false);
      setAttemptFailed(false);
      setOrder({ url: res.url, paymentId: res.paymentId });
      onCheckout(true);
    } else setError(res.message);
  }

  async function changePlan() {
    const id = pending.current;
    pending.current = null;
    setOrder(null);
    onCheckout(false);
    if (id && (await cancelPayment(id).catch(() => null)) === "SUCCEEDED") onPaid();
  }

  if (order) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 pr-12">
          <button type="button" onClick={changePlan} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-ink-soft ring-1 ring-line hover:bg-page"><ArrowLeft className="h-4 w-4" />Change plan</button>
          <span className="min-w-0 truncate text-[13px] text-ink-muted"><span id="onboard-title" className="font-semibold text-heading">{OPTIONS[period].title}</span> · {price}</span>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-line bg-page">
          {!frameReady ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-[13px] text-ink-muted">
              <span aria-hidden className="h-7 w-7 animate-spin rounded-full border-[3px] border-brand border-t-transparent" />
              Opening the secure payment page…
            </div>
          ) : null}
          {/* key: "Try again" reloads Pesapal's page for the same order */}
          <iframe key={attempt} src={order.url} title="Pesapal secure payment" onLoad={() => setFrameReady(true)} allow="payment"
            className="relative block h-[min(640px,calc(100dvh-11rem))] w-full bg-white" />
        </div>
        {attemptFailed ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-warn-bg px-3 py-2 text-[12px] font-medium text-warn-fg">
            <span>That attempt didn&apos;t go through and no money was taken. Check the number and that you have enough balance, then try again.</span>
            <button type="button" onClick={() => { setAttemptFailed(false); setFrameReady(false); setAttempt((n) => n + 1); }}
              className="rounded-full bg-white px-3 py-1 font-bold text-heading ring-1 ring-line hover:bg-page">Try again</button>
          </div>
        ) : (
          <p role="status" className="flex items-start gap-2 rounded-lg bg-brand-tint px-3 py-2 text-[12px] font-medium text-brand-dark">
            <span aria-hidden className="mt-0.5 h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            {slow ? "Still waiting for the payment. If you approved it, it can take a minute to arrive." : "Choose MoMo, Airtel Money or card above, then Proceed. For mobile money, a prompt comes to your phone: enter your PIN to approve. This closes by itself when the payment goes through."}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={start} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        {renew ? null : <StepBar n={2} />}
        <h2 id="onboard-title" className={`${renew ? "" : "mt-3 "}font-display text-[26px] font-extrabold leading-[1.1] tracking-[-0.03em] text-heading sm:text-[30px]`}>{renew ? "Renew or change plan" : "Choose your plan"}</h2>
        <p className="text-[13px] leading-relaxed text-ink-muted">{renew ? "Keep your plan or pick another: the time you buy is added to the end of your current membership." : "One membership opens every directory. You're in the moment you pay."}</p>
      </div>

      {available.length ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Plan</legend>
          {available.map((p) => {
            const on = period === p;
            const badge = p === "MONTHLY" ? "Most popular" : p === "YEARLY" && saving ? `Save ${saving}%` : null;
            const mine = renew && p === currentPeriod;
            return (
              <label key={p} className={`relative flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3.5 transition ${on ? "border-brand bg-brand-tint/50 ring-2 ring-brand" : "border-line hover:border-line-strong"}`}>
                <input type="radio" name="period" value={p} checked={on} onChange={() => setPeriod(p)} className="sr-only" />
                <span aria-hidden className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-brand bg-brand text-white" : "border-line-strong"}`}>{on ? <Check className="h-3 w-3" strokeWidth={3} /> : null}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex flex-wrap items-center gap-2 text-[15px] font-bold text-heading">
                    {OPTIONS[p].title}
                    {mine ? <span className="rounded-full bg-heading px-2 py-0.5 text-[11px] font-bold text-white">Your plan</span> : null}
                    {badge ? <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${p === "YEARLY" ? "bg-accent-tint text-accent-dark" : "bg-brand text-white"}`}>{badge}</span> : null}
                  </span>
                  <span className="text-[12px] text-ink-muted">{OPTIONS[p].note}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-display text-[17px] font-extrabold tracking-tight text-heading">{fmt(plan.amounts[p]!, plan.currency)}</span>
                  <span className="block text-[11px] text-ink-muted">per {OPTIONS[p].per}</span>
                </span>
              </label>
            );
          })}
        </fieldset>
      ) : (
        <p className="rounded-xl border border-line bg-page p-4 text-[13px] text-ink-muted">Membership prices are being confirmed. Please check back soon.</p>
      )}

      {error ? (
        <div role="alert" className="flex flex-col gap-1.5 rounded-lg bg-warn-bg px-3 py-2.5 text-[13px] font-medium text-warn-fg">
          <p>{error}</p>
          {/* Never a dead end: a direct way to reach a person who can activate the membership */}
          <p className="flex flex-wrap gap-x-3 gap-y-1">
            {site.contact.whatsapp ? <a href={`https://wa.me/${site.contact.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Hello, I want to pay for BizSphere-Ug membership.")}`} target="_blank" rel="noopener noreferrer" className="font-bold underline">WhatsApp us</a> : null}
            {site.contact.phone ? <a href={`tel:${site.contact.phone.replace(/\s/g, "")}`} className="font-bold underline">Call {site.contact.phone}</a> : null}
            <a href="/contact" className="font-bold underline">Send us a message</a>
          </p>
        </div>
      ) : null}

      <button disabled={busy || !price} className="btn-primary min-h-[50px] w-full text-[15px]"><LockKeyhole className="h-4 w-4" />{busy ? "Opening payment…" : price ? `Continue · ${price}` : "Continue"}</button>
      <div className="flex flex-col items-center gap-2">
        <span className="flex flex-wrap justify-center gap-1.5">
          {[["MTN MoMo", "bg-[#FFCB05] text-ink"], ["Airtel Money", "bg-[#E40000] text-white"], ["Visa · Mastercard", "bg-heading text-white"]].map(([label, tone]) => (
            <span key={label} className={`rounded-md px-2 py-1 text-[11px] font-bold ${tone}`}>{label}</span>
          ))}
        </span>
        <p className="flex items-center gap-1.5 text-[12px] text-ink-muted"><ShieldCheck aria-hidden className="h-3.5 w-3.5" />Secured by Pesapal · Reminder before every renewal</p>
      </div>
    </form>
  );
}
