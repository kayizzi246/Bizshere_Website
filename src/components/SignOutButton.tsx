"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

/** Ends the session and returns to the staff sign-in (or `to`). `plain` draws it as a text link, for the footer. */
export function SignOutButton({ to = "/login?callbackUrl=%2Fadmin", className = "", plain = false }: { to?: string; className?: string; plain?: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" disabled={busy} onClick={() => { setBusy(true); signOut({ callbackUrl: to }); }}
      className={plain ? className : `flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[13px] font-medium ${className}`}>
      {plain ? null : <LogOut aria-hidden className="h-4 w-4" />}{busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
