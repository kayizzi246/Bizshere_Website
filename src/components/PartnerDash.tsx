import Link from "next/link";
import { ExternalLink, type LucideIcon } from "lucide-react";

/**
 * The parts shared by the supplier dashboard (/supplier) and the expert dashboard (/expert), redesigned on
 * 11 Nov 2026 (client: a premium look, and very easy): a dark header in the site's hero colour with who you
 * are, your numbers and the way to your public page; "how it works" as three numbered steps; and white
 * cards, each with a number or an icon, one job per card.
 */

/** The dark header: photo, name, the link to the public page, sign out, and the numbers at a glance. */
export function DashHero({ kind, name, sub, photo, Fallback, viewHref, signOut, stats }: {
  kind: string; name: string; sub?: string | null; photo?: string | null; Fallback: LucideIcon; viewHref: string; signOut: React.ReactNode;
  stats: { label: string; value: number; Icon: LucideIcon; tone: string }[];
}) {
  return (
    <header className="under-header hero-premium text-white">
      <div className="container-site flex flex-col gap-6 pb-8 pt-6 sm:pb-10 sm:pt-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 sm:h-20 sm:w-20">
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or entered address */}
              {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : <Fallback aria-hidden className="h-7 w-7 text-white/70" />}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">{kind}</span>
              <h1 className="text-hero truncate text-[26px] leading-tight text-white sm:text-[34px]">{name}</h1>
              {sub ? <span className="truncate text-[14px] text-white/75">{sub}</span> : null}
            </span>
          </div>
          <span className="flex flex-wrap items-center gap-2">
            <Link href={viewHref} data-open="" className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-semibold text-heading hover:bg-accent hover:text-ink"><ExternalLink aria-hidden className="h-4 w-4" />See my page</Link>
            {signOut}
          </span>
        </div>
        <ul className="grid grid-cols-3 gap-2 sm:gap-3">
          {stats.map(({ label, value, Icon, tone }) => (
            <li key={label} className="flex flex-col gap-1.5 rounded-2xl border border-white/15 bg-white/[0.07] p-3 backdrop-blur-sm sm:flex-row sm:items-center sm:gap-4 sm:p-4">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${tone}`}><Icon aria-hidden className="h-4 w-4 sm:h-5 sm:w-5" /></span>
              <span className="flex min-w-0 flex-col">
                <span className="font-display text-[24px] font-extrabold leading-none text-white sm:text-[28px]">{value}</span>
                <span className="text-[11px] leading-tight text-white/75 sm:text-[13px]">{label}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}

/** "How it works": three short steps in a row, so nobody has to guess what happens after they press a button. */
export function DashSteps({ steps }: { steps: [string, string][] }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-3 sm:gap-3">
      {steps.map(([title, text], n) => (
        <li key={title} className="flex items-start gap-3 rounded-2xl bg-white p-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-tint font-display text-[14px] font-bold text-brand-dark">{n + 1}</span>
          <span className="flex flex-col gap-0.5"><span className="font-display text-[14px] font-bold text-heading">{title}</span><span className="text-[13px] leading-snug text-ink-muted">{text}</span></span>
        </li>
      ))}
    </ol>
  );
}

/** One job per card: a white rounded card with its icon, a title and one line that says what it is for. */
export function DashCard({ id, Icon, title, note, strong = false, children }: { id?: string; Icon: LucideIcon; title: string; note?: string; strong?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className={`flex scroll-mt-24 flex-col gap-4 rounded-3xl bg-white p-5 sm:p-6 ${strong ? "border-2 border-brand/30 shadow-[0_10px_30px_rgba(21,126,194,0.10)]" : "border border-line"}`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${strong ? "bg-brand text-white" : "bg-brand-tint text-brand"}`}><Icon aria-hidden className="h-5 w-5" /></span>
        <span className="flex min-w-0 flex-col">
          <h2 className="font-display text-[18px] font-extrabold leading-tight text-heading sm:text-[20px]">{title}</h2>
          {note ? <span className="text-[13px] text-ink-muted">{note}</span> : null}
        </span>
      </div>
      {children}
    </section>
  );
}

/** The saved / error message at the top, large enough not to be missed. */
export function DashNotice({ ok, bad }: { ok?: string; bad?: string }) {
  if (!ok && !bad) return null;
  return bad
    ? <p role="alert" className="rounded-2xl bg-bad-bg px-5 py-4 text-[15px] font-semibold text-bad-fg">{bad}</p>
    : <p role="status" className="rounded-2xl bg-[#E6F4EC] px-5 py-4 text-[15px] font-semibold text-[#1F7A4D]">✓ {ok}</p>;
}
