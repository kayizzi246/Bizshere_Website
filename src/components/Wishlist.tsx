"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Heart, Trash2, X } from "lucide-react";
import { toggleWishlist, wishlistItems, type WishlistEntry } from "@/app/actions/member";

/**
 * Wishlist across the site: a heart on every card, and the header link with the count.
 * The (site) layout loads the signed-in viewer's saved item ids once and shares them here,
 * so every heart shows the right state without its own request. Signed-out visitors who tap
 * a heart are sent to sign in and come back to the same page. The header button opens the list
 * in a drawer from the right; collections and the full list are on /account.
 */
type Ctx = { ids: Set<string>; signedIn: boolean; toggle: (id: string) => void; pending: boolean };
const WishlistContext = createContext<Ctx>({ ids: new Set(), signedIn: false, toggle: () => {}, pending: false });

export function WishlistProvider({ initial, signedIn, children }: { initial: string[]; signedIn: boolean; children: React.ReactNode }) {
  const [ids, setIds] = useState(() => new Set(initial));
  const [pending, start] = useTransition();
  const router = useRouter();
  // Removed or added elsewhere (the account page's Remove button): follow the server's list.
  const key = initial.join();
  useEffect(() => { setIds(new Set(key ? key.split(",") : [])); }, [key]);

  const toggle = (id: string) => {
    const here = window.location.pathname + window.location.search;
    if (!signedIn) { router.push(`/login?callbackUrl=${encodeURIComponent(here)}`); return; }
    // Show the change at once; undo it if the server says otherwise.
    const was = ids.has(id);
    const flip = (on: boolean) => setIds((cur) => { const n = new Set(cur); if (on) n.add(id); else n.delete(id); return n; });
    flip(!was);
    start(async () => {
      const res = await toggleWishlist(id, here).catch(() => null);
      if (!res) flip(was);
      else if ("signIn" in res) router.push(`/login?callbackUrl=${encodeURIComponent(here)}`);
      else flip(res.saved);
    });
  };

  return <WishlistContext.Provider value={{ ids, signedIn, toggle, pending }}>{children}</WishlistContext.Provider>;
}

/** Round heart button for a card corner. Place it outside the card's link (a button can't sit inside one). */
export function WishlistHeart({ id, className = "" }: { id: string; className?: string }) {
  const { ids, toggle } = useContext(WishlistContext);
  const on = ids.has(id);
  return (
    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(id); }} aria-pressed={on}
      aria-label={on ? "Remove from wishlist" : "Add to wishlist"} title={on ? "In your wishlist" : "Add to wishlist"}
      className={`z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 ring-1 ring-black/10 backdrop-blur transition hover:scale-110 ${className}`}>
      <Heart aria-hidden className={`h-4 w-4 transition ${on ? "fill-accent text-accent" : "text-ink-soft"}`} />
    </button>
  );
}

/** Wide wishlist button for detail pages. */
export function WishlistButton({ id }: { id: string }) {
  const { ids, toggle } = useContext(WishlistContext);
  const on = ids.has(id);
  return (
    <button type="button" onClick={() => toggle(id)} aria-pressed={on}
      className={`inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-xl border text-sm font-bold ${on ? "border-accent bg-accent-tint text-accent-dark" : "border-line text-ink hover:border-brand hover:text-brand"}`}>
      <Heart aria-hidden className={`h-4 w-4 ${on ? "fill-current" : ""}`} />{on ? "In your wishlist" : "Add to wishlist"}
    </button>
  );
}

/** Header button with the number saved: opens the wishlist drawer. Signed out, it goes to sign-in. */
export function WishlistLink({ className = "" }: { className?: string }) {
  const { ids, signedIn } = useContext(WishlistContext);
  const [open, setOpen] = useState(false);
  const label = `Wishlist${ids.size ? `, ${ids.size} saved` : ""}`;
  const look = `relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line text-ink hover:border-brand hover:text-brand ${className}`;
  const count = ids.size ? <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-ink">{ids.size}</span> : null;
  if (!signedIn) {
    return (
      <Link href={`/login?callbackUrl=${encodeURIComponent("/account#wishlist")}`} aria-label={label} title="Wishlist" className={look}>
        <Heart aria-hidden className="h-[18px] w-[18px]" />{count}
      </Link>
    );
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={label} aria-haspopup="dialog" aria-expanded={open} title="Wishlist" className={look}>
        <Heart aria-hidden className="h-[18px] w-[18px]" />{count}
      </button>
      {open ? <WishlistDrawer onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/**
 * The wishlist as a panel sliding in from the right, over the page: picture, name and type of each
 * saved item, a link to open it and a button to remove it. Closes with ×, Escape or a tap outside.
 * The items are fetched when it opens; removing one updates the hearts on the page at once.
 */
function WishlistDrawer({ onClose }: { onClose: () => void }) {
  const { ids, toggle } = useContext(WishlistContext);
  const [items, setItems] = useState<WishlistEntry[] | null>(null);
  const [closing, setClosing] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const shut = useRef(onClose);
  shut.current = onClose;

  // Slide out, then unmount
  const close = useCallback(() => {
    setClosing(true);
    setTimeout(() => shut.current(), matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 220);
  }, []);

  // Fetched on open, and again if a heart elsewhere adds an item while it's open; removals only filter.
  const missing = items !== null && [...ids].some((id) => !items.some((i) => i.id === id));
  useEffect(() => {
    if (items !== null && !missing) return;
    wishlistItems().then(setItems).catch(() => setItems([]));
  }, [items, missing]);

  useEffect(() => {
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [close]);

  const shown = (items ?? []).filter((i) => ids.has(i.id));

  return (
    <div className="fixed inset-0 z-[65]" role="dialog" aria-modal="true" aria-labelledby="wishlist-title">
      <div aria-hidden onClick={close} className={`absolute inset-0 bg-ink/50 backdrop-blur-[2px] ${closing ? "drawer-fade-out" : "drawer-fade"}`} />
      <div ref={panel} tabIndex={-1} className={`absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col bg-surface shadow-[-12px_0_40px_rgba(7,26,51,0.18)] outline-none ${closing ? "drawer-out" : "drawer-in"}`}>
        <div className="flex items-center gap-3 border-b border-line px-5 py-4 sm:px-6">
          <Heart aria-hidden className="h-5 w-5 fill-accent text-accent" />
          <h2 id="wishlist-title" className="font-display text-[17px] font-extrabold uppercase tracking-[0.06em] text-heading">Your wishlist</h2>
          <span className="text-[13px] font-medium text-ink-muted">({ids.size} {ids.size === 1 ? "item" : "items"})</span>
          <button type="button" onClick={close} aria-label="Close wishlist" className="ml-auto flex h-10 w-10 items-center justify-center rounded-full text-ink-soft hover:bg-page hover:text-ink"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
          {items === null ? (
            <ul className="flex flex-col gap-4" aria-label="Loading">
              {[0, 1, 2].map((n) => (
                <li key={n} className="flex animate-pulse gap-4"><span className="h-[72px] w-[72px] shrink-0 rounded-xl bg-page" /><span className="flex flex-1 flex-col gap-2 pt-1.5"><span className="h-3.5 w-3/4 rounded bg-page" /><span className="h-3 w-1/3 rounded bg-page" /></span></li>
              ))}
            </ul>
          ) : shown.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-tint"><Heart aria-hidden className="h-7 w-7 text-accent" /></span>
              <p className="font-display text-[18px] font-extrabold text-heading">Nothing saved yet</p>
              <p className="max-w-[260px] text-[13px] text-ink-muted">Tap the heart on any business idea, machine, supplier or listing to keep it here.</p>
              <Link href="/business-ideas" onClick={close} className="btn-primary mt-2 min-h-[44px] rounded-full px-5">Browse business ideas</Link>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {shown.map((i) => (
                <li key={i.id} className="flex items-start gap-4 py-4 first:pt-1">
                  <Link href={i.href} onClick={close} tabIndex={-1} aria-hidden className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-page">
                    {/* Editors enter any address for pictures, as on the cards (src/components/IdeaParts.tsx) */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {i.picture ? <img src={i.picture} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Heart className="h-6 w-6 text-line-strong" />}
                  </Link>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <Link href={i.href} onClick={close} className="line-clamp-2 text-[15px] font-semibold leading-snug text-heading hover:text-brand">{i.title}</Link>
                    <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-brand">{i.type}</span>
                    {i.summary ? <span className="line-clamp-1 text-[12px] text-ink-muted">{i.summary}</span> : null}
                  </span>
                  <button type="button" onClick={() => toggle(i.id)} aria-label={`Remove ${i.title} from wishlist`} title="Remove"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-bad-bg hover:text-bad-fg"><Trash2 className="h-[18px] w-[18px]" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-line px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
          <Link href="/account#wishlist" onClick={close} className="btn-primary min-h-[50px] w-full rounded-xl text-[15px]">
            Organise in my account <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
          <button type="button" onClick={close} className="min-h-[40px] text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-muted hover:text-ink">Continue browsing</button>
        </div>
      </div>
    </div>
  );
}
