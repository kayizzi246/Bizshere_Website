"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

/** Email and password sign-in for staff, shown only at the private /staff/<key> link. */
export function StaffSignIn() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const identifier = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!identifier || !password) return setError("Enter your email and password.");
    setBusy(true);
    setError(null);
    const res = await signIn("credentials", { identifier, password, redirect: false });
    setBusy(false);
    if (!res || res.error) return setError("Email or password is not correct.");
    window.location.href = "/admin";
  }

  return (
    <form onSubmit={submit} className="card mx-auto flex w-full max-w-sm flex-col gap-4 p-8" noValidate>
      <h1 className="text-xl font-extrabold">Staff sign in</h1>
      <label className="label">Email<input name="email" type="email" autoComplete="username" autoFocus className="input" /></label>
      <label className="label">Password<input name="password" type="password" autoComplete="current-password" className="input" /></label>
      {error ? <p role="alert" className="text-sm font-semibold text-bad-fg">{error}</p> : null}
      <button disabled={busy} className="btn-primary min-h-[50px]">{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
