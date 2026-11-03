"use client";

import { createContext, useContext, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart } from "lucide-react";
import { toggleWishlist } from "@/app/actions/member";

/**
 * Wishlist across the site: a heart on every card, and the header link with the count.
 * The (site) layout loads the signed-in viewer's saved item ids once and shares them here,
 * so every heart shows the right state without its own request. Signed-out visitors who tap
 * a heart are sent to sign in and come back to the same page. The list itself is on /account.
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

/** Header link to the wishlist, with the number saved. */
export function WishlistLink({ className = "" }: { className?: string }) {
  const { ids, signedIn } = useContext(WishlistContext);
  const href = signedIn ? "/account#wishlist" : `/login?callbackUrl=${encodeURIComponent("/account#wishlist")}`;
  return (
    <Link href={href} aria-label={`Wishlist${ids.size ? `, ${ids.size} saved` : ""}`} title="Wishlist"
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line text-ink hover:border-brand hover:text-brand ${className}`}>
      <Heart aria-hidden className="h-[18px] w-[18px]" />
      {ids.size ? <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-ink">{ids.size}</span> : null}
    </Link>
  );
}
