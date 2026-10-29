"use client";

import { useFormState, useFormStatus } from "react-dom";
import { submitCorrection, type CorrectionState } from "@/app/actions/member";

export function CorrectionForm({ item, signedIn }: { item: { id: string; title: string } | null; signedIn: boolean }) {
  const [state, action] = useFormState<CorrectionState, FormData>(submitCorrection, {});
  if (state.ok) {
    return (
      <div role="status" className="card flex flex-col gap-2 p-7">
        <h2 className="text-lg font-bold">Thank you</h2>
        <p className="text-ink-soft">An editor will check your report against the source. If we change the page, the review date on it will update.</p>
      </div>
    );
  }
  const err = (k: string) => state.errors?.[k]?.[0];
  return (
    <form action={action} className="card flex flex-col gap-4 p-7">
      {item ? (
        <>
          <input type="hidden" name="contentItemId" value={item.id} />
          <p className="text-sm">Reporting a problem with <strong>{item.title}</strong></p>
        </>
      ) : (
        <p role="alert" className="text-sm text-bad-fg">Open the page that has the problem and use its &ldquo;Report a correction&rdquo; link.</p>
      )}
      {err("contentItemId") ? <p role="alert" className="text-sm font-semibold text-bad-fg">{err("contentItemId")}</p> : null}
      <label className="label">What is wrong or out of date?
        <textarea name="message" required rows={6} aria-invalid={!!err("message")} className="input py-2" placeholder="e.g. The application deadline changed to 30 November. Source: the fund's website, checked today." />
        {err("message") ? <span role="alert" className="text-xs font-semibold text-bad-fg">{err("message")}</span> : null}
      </label>
      {!signedIn ? (
        <label className="label">Your email (optional, so we can ask about the source)
          <input name="email" type="email" className="input" />
          {err("email") ? <span role="alert" className="text-xs font-semibold text-bad-fg">{err("email")}</span> : null}
        </label>
      ) : null}
      <div className="flex justify-end"><Submit disabled={!item} /></div>
    </form>
  );
}

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return <button disabled={pending || disabled} className="btn-primary">{pending ? "Sending…" : "Send report"}</button>;
}
