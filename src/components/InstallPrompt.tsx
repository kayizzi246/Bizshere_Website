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
    <div role="region" aria-label="Add to home screen" className="onboard-pop fixed inset-x-3 bottom-3 z-[64] flex items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-[0_12px_32px_rgba(7,26,51,0.18)] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:max-w-[420px] sm:p-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- the site's own icon */}
      <img src="/icon.png" alt="" className="h-12 w-12 shrink-0 rounded-xl" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="font-display text-[15px] font-extrabold leading-tight text-heading">Keep BizSphere-Ug on your phone</p>
        {mode === "install" ? (
          <p className="text-[13px] leading-snug text-ink-soft">Open it from your home screen, like an app.</p>
        ) : (
          <p className="text-[13px] leading-snug text-ink-soft">Tap <Share aria-label="Share" className="inline h-4 w-4 align-[-3px] text-brand" />, then <strong className="text-heading">Add to Home Screen</strong>.</p>
        )}
      </div>
      {mode === "install" ? <button type="button" onClick={install} className="btn-primary min-h-[44px] shrink-0 px-4">Install</button> : null}
      <button type="button" onClick={notNow} aria-label="Not now" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-page hover:text-heading"><X aria-hidden className="h-5 w-5" /></button>
    </div>
  );
}
