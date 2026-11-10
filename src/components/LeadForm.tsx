"use client";

import { useFormState, useFormStatus } from "react-dom";
import { usePathname } from "next/navigation";
import { CheckCircle2, MessageCircle, Send } from "lucide-react";
import { sendLead, type LeadFormState } from "@/app/actions/leads";
import { LEAD_INTERESTS, type LeadInterest } from "@/lib/leads";

/**
 * "Leave your number and we'll call you": the lead form on /contact and under the pricing. Four short
 * boxes, a thank-you in place, and a WhatsApp alternative when the site has a number.
 */
export function LeadForm({ defaults, interest = "membership", whatsapp, compact = false }: {
  defaults?: { name?: string | null; phone?: string | null; email?: string | null };
  interest?: LeadInterest;
  /** A ready wa.me link, when the site has a WhatsApp number. */
  whatsapp?: string | null;
  compact?: boolean;
}) {
  const [state, action] = useFormState<LeadFormState, FormData>(sendLead, {});
  const path = usePathname();
  const err = (k: string) => state.errors?.[k];
  const input = (k: string) => `input w-full min-w-0 ${err(k) ? "border-bad-fg" : ""}`;

  if (state.ok) {
    return (
      <div role="status" className="flex flex-col items-start gap-3 rounded-2xl border border-line bg-white p-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E6F4EC] text-[#1F7A4D]"><CheckCircle2 aria-hidden className="h-6 w-6" /></span>
        <p className="font-display text-[18px] font-extrabold text-heading">Thank you. We&apos;ll call you shortly.</p>
        <p className="text-[14px] text-ink-soft">Usually within the hour during working hours. If it&apos;s urgent, WhatsApp us now.</p>
        {whatsapp ? <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-[#25D366] px-5 text-[15px] font-bold text-white hover:bg-[#1DA851] hover:text-white"><MessageCircle aria-hidden className="h-4 w-4" />WhatsApp us</a> : null}
      </div>
    );
  }

  return (
    <form action={action} className={`flex flex-col gap-3 rounded-2xl border border-line bg-white ${compact ? "p-4 sm:p-5" : "p-5 sm:p-6"}`}>
      {!compact ? <p className="font-display text-[18px] font-extrabold text-heading">Leave your number and we&apos;ll call you</p> : null}
      {state.error ? <p role="alert" className="rounded-lg bg-bad-bg px-3 py-2 text-[13px] font-semibold text-bad-fg">{state.error}</p> : null}
      <input type="hidden" name="page" value={path ?? ""} />
      {/* Robots fill every box; people never see this one */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="label">Your name<input name="name" defaultValue={defaults?.name ?? ""} autoComplete="name" required className={input("name")} />{err("name") ? <span className="text-xs font-semibold text-bad-fg">{err("name")}</span> : null}</label>
        <label className="label">Phone number<input name="phone" type="tel" defaultValue={defaults?.phone ?? ""} autoComplete="tel" placeholder="0772 123 456" required className={input("phone")} />{err("phone") ? <span className="text-xs font-semibold text-bad-fg">{err("phone")}</span> : null}</label>
      </div>
      <label className="label">What do you want help with?
        <select name="interest" defaultValue={interest} className="input w-full">{LEAD_INTERESTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      </label>
      {!compact ? <label className="label">Email (optional)<input name="email" type="email" defaultValue={defaults?.email ?? ""} autoComplete="email" className={input("email")} />{err("email") ? <span className="text-xs font-semibold text-bad-fg">{err("email")}</span> : null}</label> : null}
      <label className="label">Message (optional)<textarea name="message" rows={compact ? 2 : 3} placeholder="e.g. I want to start a bakery in Mbarara. Which machines do I need?" className={`${input("message")} py-2`} /></label>
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Submit />
        {whatsapp ? <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-[#25D366] px-4 text-[14px] font-bold text-[#1F7A4D] hover:bg-[#25D366] hover:text-white"><MessageCircle aria-hidden className="h-4 w-4" />Or WhatsApp us</a> : null}
      </div>
      <p className="text-[12px] text-ink-muted">We only use your number to call you back. No spam.</p>
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="btn-primary min-h-[46px] px-5 text-[15px]"><Send aria-hidden className="h-4 w-4" />{pending ? "Sending…" : "Call me back"}</button>;
}
