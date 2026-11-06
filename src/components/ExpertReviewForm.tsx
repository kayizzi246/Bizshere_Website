import Link from "next/link";
import { Star } from "lucide-react";
import { submitExpertReview } from "@/app/actions/reviews";

/**
 * "Write a review" on an expert's page. Signed out: a sign-in link. Reviews are checked by the
 * team before they show (src/app/actions/reviews.ts).
 */
export function ExpertReviewForm({ consultantId, back, signedIn, status }: { consultantId: string; back: string; signedIn: boolean; status?: string }) {
  return (
    <div id="reviews" className="flex scroll-mt-36 flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 className="w-fit font-display text-lg font-extrabold text-heading sm:text-xl">Write a review</h2>
      {status === "sent" ? <p role="status" className="rounded-lg bg-brand-tint px-3 py-2 text-sm font-semibold text-brand-dark">Thank you. Your review will show once our team has checked it.</p> : null}
      {status === "error" ? <p role="alert" className="rounded-lg bg-bad-bg px-3 py-2 text-sm font-semibold text-bad-fg">Choose a star rating and write at least a few words.</p> : null}
      {signedIn ? (
        <form action={submitExpertReview} className="flex flex-col gap-3">
          <input type="hidden" name="consultantId" value={consultantId} />
          <input type="hidden" name="back" value={back} />
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 text-[13px] font-semibold text-ink-soft">Your rating</legend>
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="cursor-pointer">
                  <input type="radio" name="rating" value={n} required className="peer sr-only" />
                  <span className="inline-flex h-10 items-center gap-1 rounded-lg border border-line px-3 text-sm font-bold text-ink-soft peer-checked:border-accent peer-checked:bg-accent peer-checked:text-ink peer-focus-visible:ring-2 peer-focus-visible:ring-brand">
                    {n}<Star aria-hidden className="h-4 w-4 fill-current" /><span className="sr-only">{n === 1 ? "star" : "stars"}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-soft">Your review
            <textarea name="body" rows={3} required minLength={10} maxLength={1000} placeholder="What did they help you with, and how did it go?" className="input w-full py-2 text-[14px]" />
          </label>
          <button className="btn-primary min-h-[44px] w-fit px-5 text-sm">Send review</button>
          <p className="text-[12px] text-ink-muted">Reviews are checked by our team before they show. One review per person; writing again replaces yours.</p>
        </form>
      ) : (
        <p className="text-sm text-ink-soft"><Link href={`/login?callbackUrl=${encodeURIComponent(back)}`} className="font-semibold">Sign in</Link> to write a review.</p>
      )}
    </div>
  );
}
