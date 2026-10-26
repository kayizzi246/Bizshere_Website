"use client";

import Link from "next/link";
import { useState } from "react";

const TYPES = [
  ["SUPPLIER", "Supplier", "Raw materials, ingredients, packaging"],
  ["MACHINE_DEALER", "Machine dealer", "Equipment sales and installation"],
  ["CONSULTANCY", "Consultant or expert", "Advice, training, setup"],
  ["FUNDING_PROVIDER", "Funding provider", "Loans, grants, investment"],
  ["SERVICE_PROVIDER", "Service provider", "Transport, repairs, design"],
] as const;

const PLANS = [
  ["business_basic", "Basic listing", "Free", "Profile, limited listings, verification badges"],
  ["business_featured", "Featured", "Price set by admin", "Top of search in your categories, enquiry inbox"],
  ["business_premium", "Premium", "Price set by admin", "Homepage spots and listing statistics"],
] as const;

const DISTRICTS = ["Kampala", "Wakiso", "Mukono", "Jinja", "Mbarara", "Gulu", "Mbale", "Arua", "Masaka", "Lira"];
const STEPS = ["Account", "Business", "Verification", "Plan"];

type Errors = Record<string, string[] | undefined>;

export function JoinForm() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Record<string, string | boolean>>({ accountType: "SUPPLIER", plan: "business_basic", district: "Kampala" });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: string, v: string | boolean) => {
    setData((d) => ({ ...d, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const val = (k: string) => (typeof data[k] === "string" ? (data[k] as string) : "");

  // Client checks per step (the server validates everything again).
  function validate(s: number): Errors {
    const e: Errors = {};
    if (s === 1) {
      if (val("name").trim().length < 2) e.name = ["Enter your full name"];
      if (!/^\S+@\S+\.\S+$/.test(val("email"))) e.email = ["Enter a valid email"];
      if (!/^\+?256\d{9}$|^0\d{9}$/.test(val("phone").replace(/\s/g, ""))) e.phone = ["Enter a Ugandan phone number"];
      if (val("password").length < 8) e.password = ["At least 8 characters"];
    }
    if (s === 2 && val("legalName").trim().length < 2) e.legalName = ["Enter the registered business name"];
    if (s === 3 && data.consent !== true) e.consent = ["Please confirm to continue"];
    return e;
  }

  async function next() {
    const e = validate(step);
    if (Object.keys(e).length) return setErrors(e);
    if (step < 4) return setStep(step + 1);
    setBusy(true);
    const res = await fetch("/api/business/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, phone: val("phone").replace(/\s/g, "") }),
    });
    setBusy(false);
    if (res.ok) return setDone(true);
    const body = await res.json().catch(() => ({}));
    const errs: Errors = body.errors ?? { form: ["Something went wrong. Please try again."] };
    setErrors(errs);
    const firstStep = Object.keys(errs).some((k) => ["name", "email", "phone", "password"].includes(k)) ? 1 : Object.keys(errs).some((k) => ["legalName", "website"].includes(k)) ? 2 : step;
    setStep(firstStep);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-tint text-3xl text-brand">✓</span>
        <h2 className="text-2xl font-extrabold">Application submitted</h2>
        <p className="max-w-md text-ink-soft">Our editors will review your business. You can sign in now and prepare your listings; they go live once approved.</p>
        <Link href="/login?callbackUrl=/business" className="btn-primary min-h-[50px]">Sign in to my business account</Link>
      </div>
    );
  }

  return (
    <>
      <ol aria-label="Sign-up steps" className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const on = step >= n;
          return (
            <li key={label} className="flex flex-[1_1_130px] items-center gap-2.5">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${on ? "bg-brand text-white" : "bg-[#EEF0EC] text-ink-muted"}`}>{step > n ? "✓" : n}</span>
              <span className={`text-sm ${step === n ? "font-extrabold" : "font-semibold text-ink-muted"}`}>{label}</span>
            </li>
          );
        })}
      </ol>

      {step === 1 ? (
        <div className="flex flex-col gap-5">
          <h2 className="text-2xl font-extrabold">Create your account</h2>
          <fieldset className="flex flex-wrap gap-2.5">
            <legend className="mb-2.5 text-sm font-bold">Account type</legend>
            {TYPES.map(([id, label, hint]) => (
              <button key={id} type="button" aria-pressed={data.accountType === id} onClick={() => set("accountType", id)}
                className={`flex min-h-[76px] flex-[1_1_180px] flex-col items-start gap-1 rounded-2xl px-4 py-3.5 text-left ${data.accountType === id ? "border-2 border-brand bg-[#F1F8F3]" : "border border-line-strong bg-white"}`}>
                <span className="font-bold">{label}</span><span className="text-sm text-ink-muted">{hint}</span>
              </button>
            ))}
          </fieldset>
          <Row>
            <Field label="Your full name" name="name" value={val("name")} onChange={set} errors={errors} autoComplete="name" />
            <Field label="Work email" name="email" type="email" value={val("email")} onChange={set} errors={errors} autoComplete="email" />
          </Row>
          <Row>
            <Field label="Phone number" name="phone" type="tel" placeholder="+256 7XX XXX XXX" value={val("phone")} onChange={set} errors={errors} autoComplete="tel" />
            <Field label="Create password" name="password" type="password" value={val("password")} onChange={set} errors={errors} autoComplete="new-password" hint="At least 8 characters" />
          </Row>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-extrabold">Business details</h2>
          <Row>
            <Field label="Registered business name" name="legalName" value={val("legalName")} onChange={set} errors={errors} />
            <Field label="Registration number" name="registrationNumber" placeholder="URSB number" value={val("registrationNumber")} onChange={set} errors={errors} />
          </Row>
          <Row>
            <label className="label flex-[1_1_200px]">District
              <select className="input" value={val("district")} onChange={(e) => set("district", e.target.value)}>{DISTRICTS.map((d) => <option key={d}>{d}</option>)}</select>
            </label>
            <Field label="Physical address" name="physicalAddress" placeholder="Street, building, landmark" value={val("physicalAddress")} onChange={set} errors={errors} />
          </Row>
          <Field label="What do you supply or offer?" name="offers" placeholder="e.g. bakery ovens, mixers, flour" value={val("offers")} onChange={set} errors={errors} />
          <label className="label">Short description<textarea rows={3} className="input py-3" value={val("description")} onChange={(e) => set("description", e.target.value)} /></label>
          <Row>
            <Field label="WhatsApp number" name="whatsapp" type="tel" value={val("whatsapp")} onChange={set} errors={errors} />
            <Field label="Website (optional)" name="website" type="url" value={val("website")} onChange={set} errors={errors} />
          </Row>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-extrabold">Verification</h2>
          <p className="text-ink-muted">After you submit, upload your certificate of registration and the director&apos;s ID from your business dashboard. Documents are never shown publicly.</p>
          <div className="rounded-2xl bg-page p-4 text-sm text-ink-soft"><strong className="text-ink">What we check:</strong> we call your phone number, match your registration number and, where possible, confirm your address. Each check appears on your profile with its date.</div>
          <label className="flex items-start gap-2.5 text-sm leading-relaxed">
            <input type="checkbox" checked={data.consent === true} onChange={(e) => set("consent", e.target.checked)} className="mt-0.5 h-[18px] w-[18px] accent-brand" />
            I confirm these details are true and agree to the Terms and Privacy Notice, including how my business data is processed under the Data Protection and Privacy Act, 2019.
          </label>
          {errors.consent ? <p role="alert" className="text-sm font-semibold text-bad-fg">{errors.consent[0]}</p> : null}
        </div>
      ) : null}

      {step === 4 ? (
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-extrabold">Choose a listing plan</h2>
          <div className="flex flex-wrap gap-3.5">
            {PLANS.map(([id, name, price, desc]) => (
              <button key={id} type="button" aria-pressed={data.plan === id} onClick={() => set("plan", id)}
                className={`flex flex-[1_1_200px] flex-col items-start gap-2 rounded-2xl p-5 text-left ${data.plan === id ? "border-2 border-brand bg-[#F1F8F3]" : "border border-line-strong bg-white"}`}>
                <span className="text-lg font-extrabold">{name}</span><span className="text-lg font-extrabold">{price}</span><span className="text-sm text-ink-muted">{desc}</span>
              </button>
            ))}
          </div>
          <p className="text-sm text-ink-muted">Paid plans start after approval. Pay with MTN Mobile Money, Airtel Money or card.</p>
        </div>
      ) : null}

      {errors.form ? <p role="alert" className="text-sm font-semibold text-bad-fg">{errors.form[0]}</p> : null}
      <div className="flex justify-between gap-3 border-t border-line pt-5">
        <button type="button" onClick={() => setStep(Math.max(1, step - 1))} className={`btn-outline min-h-[50px] ${step === 1 ? "invisible" : ""}`}>Back</button>
        <button type="button" disabled={busy} onClick={next} className="btn-primary min-h-[50px] px-8">{step === 4 ? (busy ? "Submitting…" : "Submit application") : "Continue"}</button>
      </div>
    </>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-3.5">{children}</div>;
}

function Field(props: { label: string; name: string; value: string; onChange: (k: string, v: string) => void; errors: Errors; type?: string; placeholder?: string; hint?: string; autoComplete?: string }) {
  const err = props.errors[props.name]?.[0];
  return (
    <label className="label flex-[1_1_260px]">
      {props.label}
      <input name={props.name} type={props.type ?? "text"} value={props.value} placeholder={props.placeholder} autoComplete={props.autoComplete}
        onChange={(e) => props.onChange(props.name, e.target.value)} aria-invalid={!!err} className={`input ${err ? "border-bad-fg" : ""}`} />
      {err ? <span role="alert" className="text-xs font-semibold text-bad-fg">{err}</span> : props.hint ? <span className="text-xs font-normal text-ink-muted">{props.hint}</span> : null}
    </label>
  );
}
