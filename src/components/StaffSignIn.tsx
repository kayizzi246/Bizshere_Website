"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

/** Email and password sign-in for staff: at /login when coming from the admin, and at the private /staff/<key> link. */
export function StaffSignIn({ next = "/admin" }: { next?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const identifier = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!identifier || !password) return setError("Enter your email or phone and your password.");
    setBusy(true);
    setError(null);
    const res = await signIn("credentials", { identifier, password, redirect: false });
    setBusy(false);
    if (!res || res.error) return setError("That email, phone or password is not correct.");
    window.location.href = next.startsWith("/admin") ? next : "/admin";
  }

  // Shown inside <AuthShell> (src/components/AuthShell.tsx), which draws the card and the page heading.
  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-sm flex-col gap-4" noValidate>
      <h2 className="sr-only">Staff sign in</h2>
      <label className="flex flex-col gap-1.5 text-[14px] font-medium text-heading">Enter your email or phone
        <input name="email" type="text" inputMode="email" autoComplete="username" autoFocus placeholder="Email or phone number" className="input min-h-[46px] text-[15px]" />
      </label>
      <label className="flex flex-col gap-1.5 text-[14px] font-medium text-heading">Enter your password
        <input name="password" type="password" autoComplete="current-password" placeholder="Password" className="input min-h-[46px] text-[15px]" />
      </label>
      {error ? <p role="alert" className="rounded-lg bg-bad-bg px-3 py-2 text-sm font-semibold text-bad-fg">{error}</p> : null}
      <button disabled={busy} className="btn-primary mt-1 min-h-[48px] w-full text-[15px]">{busy ? "Signing in…" : "Log in"}</button>
      <p className="text-center text-[13px] text-ink-muted">Forgot your password? Ask a super admin to set a new one in Admin → Team.</p>
    </form>
  );
}
