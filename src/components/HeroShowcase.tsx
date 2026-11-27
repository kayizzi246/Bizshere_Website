import Link from "next/link";
import { ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { BorderSnake } from "./BorderSnake";
import { Icon } from "./Icon";

export type ShowcaseRow = { href: string; icon: string; title: string; sub: string };
export type ShowcasePrice = { id: string; name: string; unit: string | null; price: string; change: number | null };

const TONES = ["bg-[#2E6BFF]/25 text-[#A9C3FF]", "bg-accent/20 text-accent", "bg-[#12B76A]/20 text-[#5BE3A1]", "bg-[#8B6CFF]/25 text-[#C6B8FF]"];

/**
 * The right side of the homepage hero while there are too few photos for HeroCollage (client, 24 Nov 2026):
 * the same glass panel with no pictures needed. On top the latest market prices (or, with none yet, the four
 * steps from idea to funding); under it the newest listings and the directories, each with a coloured icon,
 * scrolling slowly upwards. Stops while pointed at or focused, and for reduced motion (globals.css).
 */
export function HeroShowcase({ prices, updated, rows }: { prices: ShowcasePrice[]; updated: string | null; rows: ShowcaseRow[] }) {
  const list = (copy: boolean) => rows.map((r, i) => (
    <li key={`${r.href}${copy ? "-copy" : ""}`} aria-hidden={copy || undefined}>
      <Link href={r.href} tabIndex={copy ? -1 : undefined} className="flex items-center gap-3 rounded-xl bg-white/[0.06] raised p-2 text-white transition-colors hover:border-accent/60 hover:bg-white/[0.12] hover:text-white">
        <span className={`flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-lg ${TONES[i % TONES.length]}`}><Icon name={r.icon} className="h-5 w-5" /></span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
          <span className="truncate font-display text-[12.5px] font-bold">{r.title}</span>
          <span className="truncate text-[11px] text-white/65">{r.sub}</span>
        </span>
        <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-white/40" />
      </Link>
    </li>
  ));

  return (
    <div role="region" aria-label="Latest on BizSphere-Ug" className="relative flex h-[470px] flex-col gap-3 rounded-2xl bg-[#081A3C]/45 p-4 text-white">
      <BorderSnake />
      {prices.length ? (
        <div className="shrink-0 rounded-xl bg-[#081A3C]/80 raised p-4">
          <div className="flex items-start justify-between gap-3 pb-2">
            <span className="flex flex-col leading-tight">
              <span className="font-display text-[13px] font-extrabold">Market prices</span>
              <span className="text-[11px] text-white/60">Wholesale{updated ? ` · updated ${updated}` : ""}</span>
            </span>
            <Link href="/prices" className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-accent hover:text-white">See all<ChevronRight aria-hidden className="h-3.5 w-3.5" /></Link>
          </div>
          <ul className="divide-y divide-white/10">
            {prices.slice(0, 3).map((p) => {
              const up = (p.change ?? 0) >= 0.05, down = (p.change ?? 0) <= -0.05;
              return (
                <li key={p.id} className="flex items-center gap-3 py-2 text-[12.5px] last:pb-0">
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  {up || down ? (
                    <span className={`inline-flex shrink-0 items-center gap-1 text-[11px] tabular-nums ${up ? "text-[#3DD68C]" : "text-[#FF8A8A]"}`}>
                      {up ? <TrendingUp aria-hidden className="h-3.5 w-3.5" /> : <TrendingDown aria-hidden className="h-3.5 w-3.5" />}
                      {up ? "+" : ""}{p.change!.toFixed(1)}%
                    </span>
                  ) : null}
                  <span className="shrink-0 font-bold tabular-nums">{p.price}{p.unit ? <span className="font-normal text-white/60">/{p.unit}</span> : null}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="shrink-0 rounded-xl bg-[#081A3C]/80 raised p-4">
          <p data-size="" className="pb-3 font-display text-[13px] font-extrabold">From idea to business</p>
          <ol className="grid grid-cols-4 gap-2 text-center text-[11px]">
            {([["/business-ideas", "idea", "Idea"], ["/machines", "machine", "Machine"], ["/suppliers", "supplier", "Supplier"], ["/funding", "funding", "Funding"]] as const).map(([href, icon, text], i) => (
              <li key={href}>
                <Link href={href} className="flex flex-col items-center gap-1.5 text-white hover:text-accent">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${TONES[i]}`}><Icon name={icon} className="h-5 w-5" /></span>
                  {i + 1}. {text}
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}

      <span className="px-1 font-display text-[12px] font-bold text-white/80">New and useful</span>
      <div className="relative min-h-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,#000_8%,#000_90%,transparent)]">
        <ul className="collage-col collage-slow showcase-col flex flex-col gap-3">{list(false)}{list(true)}</ul>
      </div>
    </div>
  );
}
