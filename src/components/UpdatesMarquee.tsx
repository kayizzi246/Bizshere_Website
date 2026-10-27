import Link from "next/link";

type Update = { id: string; message: string; href: string | null };

/**
 * Scrolling bar of short updates, managed at /admin/updates.
 * Pure CSS: the list is rendered twice and slid left by half its width, so it loops
 * without a jump. Pauses on hover or keyboard focus; with reduced motion it stops
 * and becomes a row you can scroll by hand.
 */
export function UpdatesMarquee({ updates }: { updates: Update[] }) {
  if (updates.length === 0) return null;
  // Repeat short lists so one copy is always wider than the screen.
  const copies = Math.ceil(6 / updates.length);
  const row = Array.from({ length: copies }, () => updates).flat();
  const seconds = Math.max(25, row.length * 7);

  const items = (dup: boolean) =>
    row.map((u, n) => (
      <span key={`${u.id}-${n}`} className="flex shrink-0 items-center gap-3 text-sm font-semibold">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-mint" />
        {u.href ? (
          u.href.startsWith("/") ? (
            <Link href={u.href} tabIndex={dup ? -1 : undefined} className="text-white underline-offset-4 hover:text-brand-mint hover:underline">{u.message}</Link>
          ) : (
            <a href={u.href} target="_blank" rel="noopener noreferrer" tabIndex={dup ? -1 : undefined} className="text-white underline-offset-4 hover:text-brand-mint hover:underline">{u.message}</a>
          )
        ) : (
          <span>{u.message}</span>
        )}
      </span>
    ));

  return (
    <section aria-label="Latest updates" className="marquee border-b border-brand-dark bg-brand text-white">
      <div className="container-site flex items-center gap-4 py-3.5">
        <span className="flex shrink-0 items-center gap-2 rounded-full bg-brand-deep px-3 py-1 font-display text-xs font-extrabold uppercase tracking-wider">
          <span aria-hidden className="h-2 w-2 rounded-full bg-brand-mint" />
          Updates
        </span>
        <div className="marquee-viewport min-w-0 flex-1 overflow-hidden">
          <div className="marquee-track flex w-max" style={{ "--marquee-duration": `${seconds}s` } as React.CSSProperties}>
            <div className="flex shrink-0 gap-10 pr-10">{items(false)}</div>
            <div aria-hidden className="marquee-dup flex shrink-0 gap-10 pr-10">{items(true)}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
