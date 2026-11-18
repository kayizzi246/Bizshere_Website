"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LockKeyhole } from "lucide-react";

/**
 * The "Show more" lock that sits where member-only rows would be.
 *
 * One tap, not two (18 Nov 2026): the button is a `data-pay` link, so the site-wide pop-up
 * (src/components/Onboarding.tsx, mounted in the (site) layout) opens straight at the plans — or at
 * the phone sign-in first for a visitor — and comes back to this page afterwards. It used to open a
 * card that said the same things again and had its own "See membership plans" button; everything
 * that card listed is in the pop-up itself.
 *
 * The blurred rows behind it are FAKE filler passed in as `teaser` (e.g. "UGX 0,000,000"), never the
 * real data. Real member-only data is not sent to a visitor's browser at all.
 */
export function Gate({
  title,
  text,
  button = "Show more",
  teaser,
  compact = false,
}: {
  title?: string;
  text?: string;
  button?: string;
  teaser?: React.ReactNode;
  compact?: boolean;
  /** No longer used: the pop-up writes its own heading. Kept so older pages still compile. */
  modalTitle?: string;
}) {
  const path = usePathname();
  // data-pay + data-next: open the plans in place, then return to this page.
  const open = { href: `/membership?onboard=pay&next=${encodeURIComponent(path || "/")}`, "data-pay": "", "data-next": path || "/" };

  return (
    <div className="relative">
      {teaser ? <div aria-hidden className="blurred">{teaser}</div> : null}
      <div className={`${teaser ? "absolute inset-0" : ""} flex items-center justify-center bg-white/40 py-4`}>
        {compact ? (
          <Link {...open} className="btn border border-brand bg-white text-brand hover:bg-brand hover:text-white">
            <LockKeyhole aria-hidden className="h-4 w-4" /> {button}
          </Link>
        ) : (
          <div className="flex max-w-sm flex-col items-center gap-2.5 rounded-2xl border border-line bg-white px-6 py-5 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-tint text-brand"><LockKeyhole aria-hidden className="h-[18px] w-[18px]" /></span>
            {title ? <span className="text-[17px] font-bold">{title}</span> : null}
            {text ? <span className="text-sm text-ink-muted">{text}</span> : null}
            <Link {...open} className="btn-primary">{button}</Link>
            <span className="text-[12px] text-ink-muted">Pay with MoMo, Airtel Money or card. It opens straight away.</span>
          </div>
        )}
      </div>
    </div>
  );
}
