"use client";

import { useTransition } from "react";
import { Bookmark } from "lucide-react";

/**
 * Save / unsave a listing from inside another form (the search form), where a nested
 * <form> isn't allowed. Signed-out visitors are sent to sign in by the action.
 */
export function SaveButton({ id, back, saved, action }: { id: string; back: string; saved: boolean; action: (form: FormData) => Promise<void> }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} aria-pressed={saved}
      onClick={() => start(async () => { const f = new FormData(); f.set("contentItemId", id); f.set("back", back); await action(f); })}
      aria-label={saved ? "Saved" : "Save"}
      className={`btn min-h-[40px] shrink-0 border px-3 text-[13px] disabled:opacity-60 sm:px-4 ${saved ? "border-brand bg-brand-tint text-brand-dark" : "border-line bg-white text-ink hover:border-brand hover:text-brand"}`}>
      <Bookmark aria-hidden className={`h-4 w-4 ${saved ? "fill-current" : ""}`} /><span className="hidden sm:inline">{saved ? "Saved" : "Save"}</span>
    </button>
  );
}
