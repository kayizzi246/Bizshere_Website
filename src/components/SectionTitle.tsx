import type { LucideIcon } from "lucide-react";

/**
 * A section heading: a numbered kicker ("01 · The idea"), a gradient icon tile, and the title,
 * then one line under it.
 */
export function SectionTitle({ n, kicker, title, sub, icon: I }: { n?: string; kicker?: string; title: string; sub?: string; icon: LucideIcon }) {
  return (
    <div className="flex items-start gap-3.5">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-deep text-white shadow-[0_8px_20px_rgba(21,126,194,0.30)]"><I aria-hidden className="h-5 w-5" /></span>
      <span className="flex min-w-0 flex-col gap-1">
        {kicker ? <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent-dark">{n ? `${n} · ` : ""}{kicker}</span> : null}
        <h2 className="font-display text-[21px] font-extrabold leading-tight tracking-[-0.02em] text-heading sm:text-[24px]">{title}</h2>
        {sub ? <p className="text-[13px] text-ink-muted sm:text-[14px]">{sub}</p> : null}
      </span>
    </div>
  );
}
