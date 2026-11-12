import type { LucideIcon } from "lucide-react";

/**
 * A section heading: a numbered kicker ("01 · The idea"), a gradient icon tile, and the title,
 * then one line under it.
 */
export function SectionTitle({ n, kicker, title, sub, icon: I }: { n?: string; kicker?: string; title: string; sub?: string; icon: LucideIcon }) {
  return (
    <div className="flex items-start gap-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand text-white"><I aria-hidden className="h-5 w-5" /></span>
      <span className="flex min-w-0 flex-col gap-1">
        {kicker ? <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent-dark">{n ? `${n} · ` : ""}{kicker}</span> : null}
        <h2 className="font-display text-[18px] font-bold leading-tight text-heading sm:text-[19px]">{title}</h2>
        {sub ? <p className="text-[13px] text-ink-muted sm:text-[14px]">{sub}</p> : null}
      </span>
    </div>
  );
}
