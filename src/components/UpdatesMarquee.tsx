import Link from "next/link";

type Update = { id: string; message: string; href: string | null };

/**
 * Slim announcement pill of short updates, managed at /admin/updates. While we're live on
 * YouTube, a "LIVE" item leads the row and links to the player on the homepage.
 * Pure CSS: the list is rendered twice and slid left by half its width, so it loops
 * without a jump. Pauses on hover or keyboard focus; with reduced motion it stops
 * and becomes a row you can scroll by hand.
 * `dark` is the homepage hero version: a slim news ribbon of plain text on deep brand blue, no band around it.
 */
export function UpdatesMarquee({ updates, live = null, dark = false }: { updates: Update[]; live?: { title: string | null } | null; dark?: boolean }) {
  const all: (Update & { live?: boolean })[] = live
    ? [{ id: "live", message: live.title ? `We're live on YouTube: ${live.title}` : "We're live on YouTube now. Watch here", href: "/#watch", live: true }, ...updates]
    : updates;
  if (all.length === 0) return null;
  // Repeat short lists so one copy is always wider than the screen.
  const copies = Math.ceil(6 / all.length);
  const row = Array.from({ length: copies }, () => all).flat();
  const seconds = Math.max(30, row.length * 8);

  // Dark: plain text with an orange dot before each item (no chips). Light: chips.
  const chip = dark
    ? "inline-flex shrink-0 items-center gap-2.5 px-3 py-1 text-[13px] font-medium text-white/80"
    : "inline-flex shrink-0 items-center gap-2 rounded-full border border-line bg-page/70 px-3 py-1 text-[13px] text-ink-soft";
  const hover = dark ? "hover:text-white" : "hover:border-brand/40 hover:bg-white hover:text-ink";
  const items = (dup: boolean) =>
    row.map((u, n) => {
      const body = (
        <>
          {u.live ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FF0033] px-1.5 py-px text-[10px] font-bold tracking-wide text-white"><span aria-hidden className="live-dot h-1.5 w-1.5 rounded-full bg-white" />LIVE</span>
          ) : dark ? (
            <span aria-hidden className="h-1 w-1 rotate-45 bg-accent" />
          ) : (
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
          )}
          <span className={`${dark ? "decoration-white/40 underline-offset-4 group-hover:underline" : ""} ${u.live ? `font-semibold ${dark ? "text-white" : "text-ink"}` : ""}`}>{u.message}</span>
          {u.href ? <span aria-hidden className={`transition group-hover:translate-x-0.5 ${dark ? "text-white/50 group-hover:text-accent" : "text-ink-muted group-hover:text-brand"}`}>→</span> : null}
        </>
      );
      const key = `${u.id}-${n}`;
      if (!u.href) return <span key={key} className={chip}>{body}</span>;
      const cls = `group ${chip} transition-colors ${hover}`;
      return u.href.startsWith("/") ? (
        <Link key={key} href={u.href} tabIndex={dup ? -1 : undefined} className={cls}>{body}</Link>
      ) : (
        <a key={key} href={u.href} target="_blank" rel="noopener noreferrer" tabIndex={dup ? -1 : undefined} className={cls}>{body}</a>
      );
    });

  const track = (
    <div className="marquee-viewport min-w-0 flex-1 overflow-hidden">
      <div className="marquee-track flex w-max" style={{ "--marquee-duration": `${seconds}s` } as React.CSSProperties}>
        <div className={`flex shrink-0 pl-2 pr-2 ${dark ? "gap-1" : "gap-2"}`}>{items(false)}</div>
        <div aria-hidden className={`marquee-dup flex shrink-0 pr-2 ${dark ? "gap-1" : "gap-2"}`}>{items(true)}</div>
      </div>
    </div>
  );

  // Hero: a slim news ribbon. Orange edge on the left, a megaphone and "WHAT'S NEW" label, a hairline divider, then the text.
  if (dark) {
    return (
      <div role="region" aria-label="Latest updates" className="marquee flex h-10 w-full max-w-[660px] items-center overflow-hidden rounded-lg border border-white/10 border-l-[3px] border-l-accent bg-brand-deep/45 backdrop-blur-sm">
        <span className="flex h-full shrink-0 items-center gap-2 border-r border-white/10 pl-3 pr-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
          <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
          </svg>
          What&apos;s new
        </span>
        {track}
      </div>
    );
  }

  const pill = (
    <div className="flex items-center gap-2 rounded-full border border-line bg-white p-1.5">
      <span className="flex h-8 shrink-0 items-center gap-2 rounded-full bg-brand-deep pl-2.5 pr-3.5 text-xs font-semibold text-white">
        <span aria-hidden className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:hidden" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        What&apos;s new
      </span>
      {track}
    </div>
  );

  return (
    <section aria-label="Latest updates" className="marquee border-b border-line bg-white">
      <div className="container-site py-4">{pill}</div>
    </section>
  );
}
