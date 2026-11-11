import type { Prisma, ScenarioLevel } from "@prisma/client";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { WishlistHeart } from "./Wishlist";
import { compactRange } from "@/lib/format";
import { Icon } from "./Icon";
import { SeenBadge } from "./Recent";

/** Shared bits for the business idea list and page. */

export const PLAN_ORDER: ScenarioLevel[] = ["LOW", "STANDARD", "HIGHER"];
// The budget plans are shown as business sizes.
export const PLAN_LABEL: Record<ScenarioLevel, string> = { LOW: "Small", STANDARD: "Medium", HIGHER: "Large" };

/** SMALL → Small, MEDIUM_HIGH → Medium high */
export const titleCase = (v: string | null | undefined) => (v ? v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ") : null);

/** Template levels (profit potential, experience) as a position on a 3-dot scale. */
export const LEVEL_DOTS: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3 };

/** What a card needs; shared by the list page and the "more ideas" row. */
export const IDEA_CARD_SELECT = {
  id: true, slug: true, title: true, shortSummary: true, primaryCategory: { select: { id: true, name: true } },
  businessIdea: { select: { pictureUrl: true, keyRequirements: true, capitalMin: true, capitalMax: true, currency: true, scenarios: { select: { _count: { select: { lines: true } } } } } },
} satisfies Prisma.ContentItemSelect;
type CardPayload = Prisma.ContentItemGetPayload<{ select: typeof IDEA_CARD_SELECT }>;
type Capital = Prisma.Decimal | number | null;
/** A card's idea. Capital may be a plain number, so the in-page search (a client component) can show cards too. */
export type CardIdea = Omit<CardPayload, "businessIdea"> & {
  businessIdea: (Omit<NonNullable<CardPayload["businessIdea"]>, "capitalMin" | "capitalMax"> & { capitalMin: Capital; capitalMax: Capital }) | null;
};

/** The idea's photo, or a plain panel with the idea icon when there isn't one yet. */
/** `contain`: the whole picture is shown inside the box, nothing cut off (the list cards; client, 11 Nov 2026). */
export function IdeaPhoto({ src, alt, className = "", contain = false }: { src?: string | null; alt: string; className?: string; contain?: boolean }) {
  if (src) {
    // Editors enter the address (or a /ideas/… path); no Next image domain list to maintain.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} loading="lazy" className={`block w-full bg-page ${contain ? "object-contain" : "object-cover"} ${className}`} />;
  }
  return (
    <div className={`flex w-full items-center justify-center bg-brand-tint text-brand ${className}`}>
      <Icon name="idea" className="h-10 w-10" strokeWidth={1.5} />
    </div>
  );
}

/** One point per line, as entered in the admin. */
export function points(text: string | null): string[] {
  return (text ?? "").split("\n").map((s) => s.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
}

/** Key requirements plus the costed items of the biggest budget plan. */
export function requirementCount(idea: { keyRequirements: string | null; scenarios: { _count: { lines: number } }[] }) {
  return points(idea.keyRequirements).length + Math.max(0, ...idea.scenarios.map((s) => s._count.lines));
}

/**
 * A business idea as a card: photo with the category, name, one line with the requirement count and
 * starting capital, and links to its business details and startup budget.
 */
export function IdeaCard({ idea }: { idea: CardIdea }) {
  const name = idea.title.replace(/^Sample:\s*/i, "");
  const bi = idea.businessIdea;
  const cost = bi ? compactRange(bi.capitalMin, bi.capitalMax, bi.currency) : null;
  // A costed budget: at least one budget plan with items in it
  const hasBudget = Boolean(bi?.scenarios.some((sc) => sc._count.lines > 0));
  return (
    // The photo sits inset in the card with its own rounded corners; the cost has its own tinted panel.
    <div className="group relative flex h-full flex-col rounded-[20px] border border-line bg-white p-1.5 transition hover:-translate-y-0.5 hover:border-brand/60 hover:shadow-[0_10px_28px_rgba(21,126,194,0.12)] sm:p-2">
      <div className="relative">
        <WishlistHeart id={idea.id} className="absolute right-2 top-2" />
        <Link href={`/business-ideas/${idea.slug}`} tabIndex={-1} aria-hidden className="relative block overflow-hidden rounded-[14px]">
          <IdeaPhoto contain src={bi?.pictureUrl} alt="" className="aspect-[4/3] transition duration-300 group-hover:scale-[1.04] sm:aspect-[5/4]" />
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/45 to-transparent" />
          <SeenBadge href={`/business-ideas/${idea.slug}`} className="absolute left-2 top-2" />
          {idea.primaryCategory ? <span className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-brand-dark sm:text-xs">{idea.primaryCategory.name}</span> : null}
        </Link>
      </div>
      {/* Name, a brief description, the starting capital, two buttons. Phones show two cards a row, so
          below sm the buttons stack, and are a little taller there to be easy to tap. */}
      <div className="flex flex-1 flex-col gap-2 px-1.5 pb-1.5 pt-3 sm:gap-2.5 sm:px-2 sm:pb-2">
        <Link href={`/business-ideas/${idea.slug}`} className="font-display text-[14px] font-extrabold leading-tight tracking-[-0.01em] text-heading hover:text-brand sm:text-[14px]">{name}</Link>
        {idea.shortSummary ? <p className="line-clamp-2 text-[12px] leading-snug text-ink-muted sm:text-[12px]">{idea.shortSummary}</p> : null}
        <p className="flex items-center gap-2 rounded-xl bg-page px-2.5 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-tint text-accent-dark"><Wallet aria-hidden className="h-3.5 w-3.5" /></span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-muted">Start-up capital</span>
            {cost ? <strong className="truncate text-[12px] font-bold text-heading">{cost}</strong> : <span className="text-[12px] font-medium text-ink-soft">Being priced</span>}
          </span>
        </p>
        {/* Side by side when the card is wide enough, otherwise one under the other: each button needs
            at least 8.5rem, so in a narrow card (phones, the "more ideas" row) they wrap instead of
            running past the edge. Business details first, in solid blue; Startup budget lighter; the budget button
            says "Budget unavailable" (and isn't a link) while the idea has no costed budget yet. */}
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <Link href={`/business-ideas/${idea.slug}`} className="inline-flex h-10 min-w-[8.5rem] flex-1 items-center justify-center whitespace-nowrap rounded-full bg-brand px-3 text-[12px] font-bold text-white hover:bg-brand-dark hover:text-white sm:h-9 sm:text-[12px]">Business details</Link>
          {hasBudget ? (
            <Link href={`/business-ideas/${idea.slug}/requirements`} className="inline-flex h-10 min-w-[8.5rem] flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-full bg-brand-tint px-3 text-[12px] font-semibold text-brand-dark hover:bg-brand/15 hover:text-brand-dark sm:h-9 sm:text-[12px]">Startup budget<span aria-hidden className="transition group-hover:translate-x-0.5">→</span></Link>
          ) : (
            <span aria-disabled="true" title="No start-up budget for this business yet" className="inline-flex h-10 min-w-[8.5rem] flex-1 cursor-not-allowed items-center justify-center whitespace-nowrap rounded-full bg-page px-3 text-[12px] font-semibold text-ink-muted ring-1 ring-line sm:h-9 sm:text-[12px]">Budget unavailable</span>
          )}
        </div>
      </div>
    </div>
  );
}
