import Link from "next/link";

type Update = { id: string; message: string; href: string | null };

/**
 * Scrolling bar of short updates, managed at /admin/updates. While we're live on
 * YouTube, a "LIVE" item leads the row and links to the player on the homepage.
 * Pure CSS: the list is rendered twice and slid left by half its width, so it loops
 * without a jump. Pauses on hover or keyboard focus; with reduced motion it stops
 * and becomes a row you can scroll by hand.
 */
export function UpdatesMarquee({ updates, live = null }: { updates: Update[]; live?: { title: string | null } | null }) {
  const all: (Update & { live?: boolean })[] = live
    ? [{ id: "live", message: live.title ? `We're live on YouTube: ${live.title}` : "We're live on YouTube now. Watch here", href: "/#watch", live: true }, ...updates]
    : updates;
  if (all.length === 0) return null;
  // Repeat short lists so one copy is always wider than the screen.
  const copies = Math.ceil(6 / all.length);
  const row = Array.from({ length: copies }, () => all).flat();
  const seconds = Math.max(25, row.length * 7);

  const text = "text-ink underline-offset-4 hover:text-brand hover:underline";
  const items = (dup: boolean) =>
    row.map((u, n) => (
      <span key={`${u.id}-${n}`} className="flex shrink-0 items-center gap-4 text-sm font-medium">
        {u.live ? (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-[#FF0033] px-1.5 py-0.5 font-display text-[10px] font-extrabold tracking-wider text-white"><span aria-hidden className="live-dot h-1.5 w-1.5 rounded-full bg-white" />LIVE</span>
        ) : null}
        {u.href ? (
          u.href.startsWith("/") ? (
            <Link href={u.href} tabIndex={dup ? -1 : undefined} className={`${text} ${u.live ? "font-bold" : ""}`}>{u.message}</Link>
          ) : (
            <a href={u.href} target="_blank" rel="noopener noreferrer" tabIndex={dup ? -1 : undefined} className={text}>{u.message}</a>
          )
        ) : (
          <span className="text-ink">{u.message}</span>
        )}
        <span aria-hidden className="ml-4 h-1.5 w-1.5 rotate-45 bg-brand" />
      </span>
    ));

  return (
    <section aria-label="Latest updates" className="marquee px-3 py-5 sm:px-4 sm:py-7">
      <div className="mx-auto flex max-w-site items-stretch overflow-hidden rounded-2xl border border-line bg-white">
        <span className="flex shrink-0 items-center gap-2 bg-ink px-4 font-display text-xs font-extrabold uppercase tracking-wider text-white sm:px-5">
          <span aria-hidden className="live-dot h-2 w-2 rounded-full bg-brand" />
          Latest
        </span>
        <div className="marquee-viewport min-w-0 flex-1 overflow-hidden py-3.5">
          <div className="marquee-track flex w-max" style={{ "--marquee-duration": `${seconds}s` } as React.CSSProperties}>
            <div className="flex shrink-0 gap-4 pl-6 pr-4">{items(false)}</div>
            <div aria-hidden className="marquee-dup flex shrink-0 gap-4 pl-6 pr-4">{items(true)}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
