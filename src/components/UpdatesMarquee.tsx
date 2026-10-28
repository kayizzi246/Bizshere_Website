import Link from "next/link";

type Update = { id: string; message: string; href: string | null };

/**
 * Slim announcement pill of short updates, managed at /admin/updates. While we're live on
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
  const seconds = Math.max(30, row.length * 8);

  const chip = "inline-flex shrink-0 items-center gap-2 rounded-full border border-line bg-page/70 px-3 py-1 text-[13px] text-ink-soft";
  const items = (dup: boolean) =>
    row.map((u, n) => {
      const body = (
        <>
          {u.live ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FF0033] px-1.5 py-px text-[10px] font-bold tracking-wide text-white"><span aria-hidden className="live-dot h-1.5 w-1.5 rounded-full bg-white" />LIVE</span>
          ) : (
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
          )}
          <span className={u.live ? "font-semibold text-ink" : ""}>{u.message}</span>
          {u.href ? <span aria-hidden className="text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-brand">→</span> : null}
        </>
      );
      const key = `${u.id}-${n}`;
      if (!u.href) return <span key={key} className={chip}>{body}</span>;
      const cls = `group ${chip} transition-colors hover:border-brand/40 hover:bg-white hover:text-ink`;
      return u.href.startsWith("/") ? (
        <Link key={key} href={u.href} tabIndex={dup ? -1 : undefined} className={cls}>{body}</Link>
      ) : (
        <a key={key} href={u.href} target="_blank" rel="noopener noreferrer" tabIndex={dup ? -1 : undefined} className={cls}>{body}</a>
      );
    });

  return (
    <section aria-label="Latest updates" className="marquee border-b border-line bg-white">
      <div className="container-site py-4">
        <div className="flex items-center gap-2 rounded-full border border-line bg-white p-1.5">
          <span className="flex h-8 shrink-0 items-center gap-2 rounded-full bg-brand-deep pl-2.5 pr-3.5 text-xs font-semibold text-white">
            <span aria-hidden className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            What&apos;s new
          </span>
          <div className="marquee-viewport min-w-0 flex-1 overflow-hidden">
            <div className="marquee-track flex w-max" style={{ "--marquee-duration": `${seconds}s` } as React.CSSProperties}>
              <div className="flex shrink-0 gap-2 pl-2 pr-2">{items(false)}</div>
              <div aria-hidden className="marquee-dup flex shrink-0 gap-2 pr-2">{items(true)}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
