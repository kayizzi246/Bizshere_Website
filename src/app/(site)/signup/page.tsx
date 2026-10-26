"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { createFreeAccount } from "@/app/actions/signup";
import { Icon } from "@/components/Icon";

export default function SignupPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const res = await createFreeAccount(form);
    if (!res.ok) {
      setErrors(res.errors ?? {});
      setBusy(false);
      return;
    }
    // Sign straight in with the new account.
    await signIn("credentials", { email: String(form.get("email")).trim().toLowerCase(), password: String(form.get("password")), redirect: false });
    router.push("/account");
    router.refresh();
  }

  const field = (name: string, label: string, type = "text", auto?: string, hint?: string) => (
    <label className="label">{label}
      <input name={name} type={type} autoComplete={auto} aria-invalid={!!errors[name]} className={`input ${errors[name] ? "border-bad-fg" : ""}`} />
      {errors[name] ? <span role="alert" className="text-xs font-semibold text-bad-fg">{errors[name]}</span> : hint ? <span className="text-xs font-normal text-ink-muted">{hint}</span> : null}
    </label>
  );

  return (
    <div className="container-site grid items-center gap-12 py-14 lg:grid-cols-2">
      <div className="hidden flex-col gap-6 lg:flex">
        <span className="eyebrow">Free account</span>
        <h1 className="text-5xl font-extrabold leading-tight tracking-tight">Start planning your business today</h1>
        <ul className="flex flex-col gap-3 text-lg">
          {["Search every directory", "Read previews of every plan, machine and fund", "Save items into collections for your plan", "Upgrade any time to unlock full detail"].map((t) => (
            <li key={t} className="flex items-start gap-3"><Icon name="check" className="mt-1 h-5 w-5 shrink-0 text-brand" />{t}</li>
          ))}
        </ul>
      </div>
      <form onSubmit={onSubmit} className="card mx-auto flex w-full max-w-md flex-col gap-4 p-8 shadow-xl shadow-ink/5" noValidate>
        <div>
          <h2 className="text-2xl font-extrabold">Create your free account</h2>
          <p className="text-sm text-ink-muted">Already have one? <Link href="/login" className="font-bold">Sign in</Link></p>
        </div>
        {field("name", "Full name", "text", "name")}
        {field("email", "Email", "email", "email")}
        {field("phone", "Phone (optional)", "tel", "tel", "For mobile money payments later")}
        {field("password", "Password", "password", "new-password", "At least 8 characters")}
        <button disabled={busy} className="btn-primary min-h-[50px] rounded-full">{busy ? "Creating account…" : "Create free account"}</button>
        <p className="text-xs text-ink-muted">By creating an account you agree to our <Link href="/terms">terms</Link> and <Link href="/privacy">privacy policy</Link>.</p>
        <p className="border-t border-line pt-4 text-sm text-ink-muted">Selling machines, supplies or services? <Link href="/join" className="font-bold">Create a business account</Link></p>
      </form>
    </div>
  );
}
