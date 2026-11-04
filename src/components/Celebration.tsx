"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Download, Landmark, Phone, Wallet } from "lucide-react";
import { badgeAnimation, confettiAnimation } from "./celebration-lottie";

// lottie-web needs the browser (it reads `document` when it loads), so it never renders on the server.
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

const UNLOCKED = [
  { icon: Wallet, text: "Full budgets and plans" },
  { icon: Phone, text: "Supplier and expert contacts" },
  { icon: Landmark, text: "Funding terms" },
  { icon: Download, text: "Prices and downloads" },
];

/**
 * Full-screen welcome after a successful payment: the pop-up has closed, confetti falls and the
 * badge animates. "Start exploring" (or Escape) carries on to the page they wanted.
 */
export function Celebration({ until, renewed, onContinue }: { until: string | null; renewed: boolean; onContinue: () => void }) {
  const badge = useMemo(badgeAnimation, []);
  const confetti = useMemo(confettiAnimation, []);
  const [still, setStill] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const go = useRef(onContinue);
  go.current = onContinue;

  useEffect(() => {
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    button.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") go.current(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, []);

  const untilText = until ? new Date(until).toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" }) : null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="celebrate-title" className="celebrate-in fixed inset-0 z-[80] flex items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_center,#0E5E94_0%,#071A33_75%)] px-5 text-white">
      {!still ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 [&_svg]:!h-full [&_svg]:!w-full">
          <Lottie animationData={confetti} loop={false} rendererSettings={{ preserveAspectRatio: "xMidYMid slice" }} className="h-full w-full" />
        </div>
      ) : null}

      <div className="relative flex w-full max-w-md flex-col items-center text-center">
        <div aria-hidden className="h-44 w-44 sm:h-52 sm:w-52">
          <Lottie animationData={badge} loop={false} autoplay={!still} initialSegment={still ? [119, 120] : undefined} />
        </div>
        <p className="celebrate-rise mt-1 text-[13px] font-semibold uppercase tracking-[0.14em] text-accent">{renewed ? "Membership renewed" : "Payment successful"}</p>
        <h2 id="celebrate-title" className="celebrate-rise mt-2 font-display text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[42px]">
          Congratulations!<br />You&apos;re a member.
        </h2>
        <p className="celebrate-rise mt-3 text-[15px] text-white/75">
          Everything on BizSphere-Ug is open to you{untilText ? <> until <strong className="font-semibold text-white">{untilText}</strong></> : null}.
          We&apos;ll remind you by SMS or email before it renews.
        </p>
        <ul className="celebrate-rise mt-6 grid w-full grid-cols-2 gap-2 text-left">
          {UNLOCKED.map((u) => (
            <li key={u.text} className="flex items-center gap-2 rounded-xl bg-white/[0.08] px-3 py-2.5 text-[13px] text-white/85 ring-1 ring-white/10">
              <u.icon aria-hidden className="h-4 w-4 shrink-0 text-accent" /> {u.text}
            </li>
          ))}
        </ul>
        <button ref={button} type="button" onClick={onContinue} className="celebrate-rise group mt-7 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-[16px] font-bold text-heading transition hover:bg-brand-tint">
          Start exploring <ArrowRight aria-hidden className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
