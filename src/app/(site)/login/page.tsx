"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!email || !password) return setError("Enter your email and password.");
    setBusy(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (res?.error) return setError("Email or password is not correct.");
    router.push(params.get("callbackUrl") ?? "/");
    router.refresh();
  }

  return (
    <div className="container-site flex justify-center py-16">
      <form onSubmit={onSubmit} className="card flex w-full max-w-md flex-col gap-4 p-8" noValidate>
        <h1 className="text-2xl font-extrabold">Sign in</h1>
        <label className="label">Email<input name="email" type="email" autoComplete="email" className="input" /></label>
        <label className="label">Password<input name="password" type="password" autoComplete="current-password" className="input" /></label>
        {error ? <p role="alert" className="text-sm font-semibold text-bad-fg">{error}</p> : null}
        <button disabled={busy} className="btn-primary min-h-[50px]">{busy ? "Signing in…" : "Sign in"}</button>
        <p className="text-sm text-ink-muted">New here? <Link href="/signup" className="font-bold">Create a free account</Link></p>
        <p className="text-sm text-ink-muted">Want to list your business? <Link href="/join" className="font-bold">Create a business account</Link></p>
      </form>
    </div>
  );
}
