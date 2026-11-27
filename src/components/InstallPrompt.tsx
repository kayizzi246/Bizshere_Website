"use client";

import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";

/** The browser's install event (Chrome, Edge, Samsung Internet), held until the person taps Install. */
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const VISITS = "bz-visits";
const HIDDEN_UNTIL = "bz-install-hidden";
const SHOW_FROM_VISIT = 3;
const HIDE_DAYS = 30;

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private window: no memory, no harm */ } };

/**
 * "Add BizSphere-Ug to your home screen" (client request, 9 Nov 2026): from someone's third visit, a small
 * card at the bottom. Where the browser can install (Android, Chrome), an Install button does it in one tap;
 * on an iPhone, which has no such button, it shows the two steps (Share, then Add to Home Screen). Never
 * shown once installed, nor while the cookie notice is still up; Not now hides it for 30 days.
 */
export function InstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [mode, setMode] = useState<"install" | "ios" | null>(null);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    if (standalone) return;
    // One visit per browser session
    let visits = Number(read(VISITS) ?? 0);
    try { if (!sessionStorage.getItem(VISITS)) { sessionStorage.setItem(VISITS, "1"); visits += 1; write(VISITS, String(visits)); } } catch { /* ignore */ }
    const hidden = Number(read(HIDDEN_UNTIL) ?? 0) > Date.now();
    const ready = visits >= SHOW_FROM_VISIT && !hidden && document.cookie.includes("cookie-notice=");
    const ua = navigator.userAgent;
    const iPhone = /iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (ready && iPhone) setMode("ios");
    const onPrompt = (e: Event) => { e.preventDefault(); setEvent(e as InstallEvent); if (ready) setMode("install"); };
    const onInstalled = () => setMode(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  if (!mode) return null;
  const notNow = () => { write(HIDDEN_UNTIL, String(Date.now() + HIDE_DAYS * 86_400_000)); setMode(null); };
  const install = async () => {
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === "dismissed") notNow(); else setMode(null);
  };

  return (
    // Smaller and tighter (client, 17 Nov 2026: "make fonts small, effective on all devices"). It sits over
    // the page on every screen, so it is sized to take as little of it as possible: 13px name, 11.5px line
    // under it, a 36px Install button. The bottom offset clears the iPhone's home indicator (safe-area-inset);
    // on a phone it spans the width, from sm it is a 360px card in the corner. The icon gets a tinted plate
    // and a hairline, so a pale or transparent icon is still a visible square rather than a blank gap.
    <div role="region" aria-label="Add to home screen" className="onboard-pop fixed inset-x-2.5 bottom-[calc(0.625rem+env(safe-area-inset-bottom))] z-[64] flex items-center gap-2.5 rounded-xl border border-line bg-white p-2.5 shadow-[0_8px_24px_rgba(7,26,51,0.14)] sm:inset-x-auto sm:bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:right-4 sm:max-w-[360px] sm:gap-3 sm:p-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- the site's own icon */}
      <img src="/icon.png" alt="" className="h-10 w-10 shrink-0 rounded-lg bg-brand-tint object-contain ring-1 ring-line" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="font-display text-[12.5px] font-bold leading-[1.25] text-heading [text-wrap:balance]">Keep BizSphere-Ug on your phone</p>
        {mode === "install" ? (
          <p className="text-[11.5px] leading-snug text-ink-soft sm:text-[12px]">Open it from your home screen, like an app.</p>
        ) : (
          <p className="text-[11.5px] leading-snug text-ink-soft sm:text-[12px]">Tap <Share aria-label="Share" className="inline h-3.5 w-3.5 align-[-2px] text-brand" />, then <strong className="font-bold text-heading">Add to Home Screen</strong>.</p>
        )}
      </div>
      {mode === "install" ? <button type="button" onClick={install} className="inline-flex h-9 shrink-0 items-center rounded-lg border border-[rgba(27,31,36,0.15)] bg-accent px-3 font-display text-[12.5px] font-bold text-ink transition-colors hover:bg-accent-dark hover:text-white">Install</button> : null}
      <button type="button" onClick={notNow} aria-label="Not now" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-page hover:text-heading"><X aria-hidden className="h-4 w-4" /></button>
    </div>
  );
}
