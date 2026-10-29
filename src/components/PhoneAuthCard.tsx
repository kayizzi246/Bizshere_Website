"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { PhoneSignIn } from "./PhoneSignIn";

/**
 * Sign-in / sign-up card for /login and /signup: phone number and code first.
 * `allowEmail` adds "Sign in with email instead" for accounts that have an email
 * and password (staff, older accounts).
 */
export function PhoneAuthCard({ title, googleEnabled, redirectTo, allowEmail = false, footer }: {
  title: string;
  googleEnabled: boolean;
  redirectTo: string;
  allowEmail?: boolean;
  footer?: React.ReactNode;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const done = () => { router.push(redirectTo); router.refresh(); };

  async function emailSignIn(e: React.FormEvent<HTMLFormElement>) {
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
    done();
  }

  return (
    <div className="card mx-auto flex w-full max-w-md flex-col gap-5 p-8">
      <h1 className="text-xl font-bold">{title}</h1>
      {email ? (
        <form onSubmit={emailSignIn} className="flex flex-col gap-4" noValidate>
          <label className="label">Email<input name="email" type="email" autoComplete="email" className="input" /></label>
          <label className="label">Password<input name="password" type="password" autoComplete="current-password" className="input" /></label>
          {error ? <p role="alert" className="text-sm font-semibold text-bad-fg">{error}</p> : null}
          <button disabled={busy} className="btn-primary min-h-[50px]">{busy ? "Signing in…" : "Sign in"}</button>
        </form>
      ) : (
        <PhoneSignIn onSignedIn={done} googleEnabled={googleEnabled} googleCallbackUrl={redirectTo} size="md" />
      )}
      {allowEmail ? (
        <button type="button" onClick={() => { setEmail(!email); setError(null); }} className="self-center text-sm font-semibold text-brand hover:text-brand-dark">
          {email ? "Use my phone number instead" : "Sign in with email instead"}
        </button>
      ) : null}
      {footer}
    </div>
  );
}
