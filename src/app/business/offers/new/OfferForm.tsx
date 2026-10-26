"use client";

import { useFormState, useFormStatus } from "react-dom";
import { submitOffer, type OfferState } from "../../actions";

type M = { id: string; name: string; meta: string; sellers: number };

export function OfferForm({ machines, defaultMachine }: { machines: M[]; defaultMachine?: string }) {
  const [state, action] = useFormState<OfferState, FormData>(submitOffer, {});
  const err = (k: string) => state.errors?.[k]?.[0];

  return (
    <form action={action} className="flex flex-col gap-5">
      <section className="card flex flex-col gap-3 p-6">
        <h2 className="text-lg font-extrabold">1. Which machine are you selling?</h2>
        <p className="text-sm text-ink-muted">Pick it from our catalogue so buyers can compare your offer with other sellers. Not listed? Ask our editors to add it.</p>
        {machines.length === 0 ? <p className="text-sm text-ink-muted">No machines match your search.</p> : null}
        {machines.map((m, i) => (
          <label key={m.id} className="flex min-h-[60px] cursor-pointer items-center gap-3 rounded-xl border border-line px-4 has-[:checked]:border-2 has-[:checked]:border-brand has-[:checked]:bg-[#F1F8F3]">
            <input type="radio" name="machineId" value={m.id} defaultChecked={defaultMachine ? m.id === defaultMachine : i === 0} className="accent-brand" />
            <span className="flex flex-col"><span className="font-bold">{m.name}</span><span className="text-sm text-ink-muted">{m.meta}{m.meta ? " · " : ""}{m.sellers} other seller(s)</span></span>
          </label>
        ))}
        {err("machineId") ? <p role="alert" className="text-sm font-semibold text-bad-fg">{err("machineId")}</p> : null}
      </section>

      <section className="card flex flex-col gap-4 p-6">
        <h2 className="text-lg font-extrabold">2. Your price and terms</h2>
        <div className="flex flex-wrap gap-3.5">
          <label className="label flex-[1_1_180px]">Condition<select name="condition" className="input"><option value="NEW">New</option><option value="USED">Used</option><option value="REFURBISHED">Refurbished</option></select></label>
          <F name="priceMin" label="Lowest price (UGX)" err={err} inputMode="numeric" />
          <F name="priceMax" label="Highest price (UGX)" err={err} inputMode="numeric" />
        </div>
        <p className="text-sm text-ink-muted">Purchase price only. Leave a field empty if you don&apos;t know it yet; don&apos;t enter 0.</p>
        <div className="flex flex-wrap gap-3.5">
          <F name="quotedAt" label="Quote date" type="date" err={err} />
          <F name="validUntil" label="Valid until" type="date" err={err} />
          <F name="deliveryCharge" label="Delivery cost (UGX)" err={err} inputMode="numeric" />
        </div>
        <div className="flex flex-wrap gap-3.5">
          <F name="warrantyMonths" label="Warranty (months)" err={err} inputMode="numeric" />
          <F name="leadTime" label="Delivery lead time" err={err} placeholder="e.g. 2 weeks" />
          <label className="label flex-[1_1_180px]">Stock<select name="availability" className="input"><option>In stock</option><option>Import on order</option></select></label>
        </div>
        <div className="flex flex-wrap gap-5 text-[15px]">
          <label className="flex items-center gap-2"><input type="checkbox" name="installationSupport" defaultChecked className="h-[18px] w-[18px] accent-brand" />Installation included</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="trainingSupport" defaultChecked className="h-[18px] w-[18px] accent-brand" />Operator training included</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="sparePartsLocal" className="h-[18px] w-[18px] accent-brand" />Spare parts available locally</label>
        </div>
      </section>

      {err("form") ? <p role="alert" className="text-sm font-semibold text-bad-fg">{err("form")}</p> : null}
      <div className="flex justify-end"><Submit /></div>
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="btn-primary min-h-[50px] px-7">{pending ? "Submitting…" : "Submit for review"}</button>;
}

function F({ name, label, err, type = "text", placeholder, inputMode }: { name: string; label: string; err: (k: string) => string | undefined; type?: string; placeholder?: string; inputMode?: "numeric" }) {
  const e = err(name);
  return (
    <label className="label flex-[1_1_180px]">
      {label}
      <input name={name} type={type} placeholder={placeholder} inputMode={inputMode} aria-invalid={!!e} className={`input ${e ? "border-bad-fg" : ""}`} />
      {e ? <span role="alert" className="text-xs font-semibold text-bad-fg">{e}</span> : null}
    </label>
  );
}
