import type { Prisma, ScenarioLevel } from "@prisma/client";
import Link from "next/link";
import { ClipboardList, Info, Wallet } from "lucide-react";
import { compactRange } from "@/lib/format";
import { Icon } from "./Icon";

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
export function IdeaPhoto({ src, alt, className = "" }: { src?: string | null; alt: string; className?: string }) {
  if (src) {
    // Editors enter the address (or a /ideas/… path); no Next image domain list to maintain.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} loading="lazy" className={`block w-full bg-page object-cover ${className}`} />;
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
 * A business idea as a card: photo with the requirement count and category, name, requirement and
 * starting-capital boxes, and links to its overview and requirements.
 */
export function IdeaCard({ idea }: { idea: CardIdea }) {
  const name = idea.title.replace(/^Sample:\s*/i, "");
  const bi = idea.businessIdea;
  const reqs = bi ? requirementCount(bi) : 0;
  const cost = bi ? compactRange(bi.capitalMin, bi.capitalMax, bi.currency) : null;
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_3px_rgba(7,26,51,0.06)] transition hover:-translate-y-0.5 hover:border-brand hover:shadow-[0_14px_30px_-14px_rgba(7,26,51,0.25)]">
      <Link href={`/business-ideas/${idea.slug}`} tabIndex={-1} aria-hidden className="relative block overflow-hidden">
        <IdeaPhoto src={bi?.pictureUrl} alt="" className="aspect-[16/9] transition duration-500 group-hover:scale-[1.03]" />
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[11px] sm:right-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-xs font-bold text-heading"><ClipboardList className="h-3.5 w-3.5 text-brand" />{reqs}</span>
        {idea.primaryCategory ? <span className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-[#071A33]/80 px-2.5 py-0.5 text-[11px] font-semibold sm:bottom-3 sm:left-3 sm:px-3 sm:py-1 sm:text-xs text-white backdrop-blur">{idea.primaryCategory.name}</span> : null}
      </Link>
      {/* Phones show two cards a row, so below sm the card is compact: stats and buttons stacked */}
      <div className="flex flex-1 flex-col gap-2.5 px-2.5 pb-2.5 pt-3 sm:gap-4 sm:p-5">
        <Link href={`/business-ideas/${idea.slug}`} className="font-display text-[15px] font-bold leading-tight text-heading hover:text-brand sm:text-lg">{name}</Link>
        <dl className="grid gap-2 sm:grid-cols-2 sm:gap-2.5">
          <div className="flex flex-col-reverse justify-end gap-0.5 rounded-lg bg-page px-2 py-1.5 sm:rounded-xl sm:px-3 sm:py-2.5">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Requirements</dt>
            <dd className="inline-flex items-center gap-1.5 font-display text-base font-bold text-heading"><ClipboardList aria-hidden className="h-4 w-4 text-brand" />{reqs}</dd>
          </div>
          <div className="flex flex-col gap-0.5 rounded-lg bg-page px-2 py-1.5 sm:rounded-xl sm:px-3 sm:py-2.5">
            <dt className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted"><Wallet aria-hidden className="h-3.5 w-3.5 text-accent" />Capital</dt>
            <dd className="text-[13px] font-bold text-heading">{cost ?? <span className="font-medium text-ink-muted">Being priced</span>}</dd>
          </div>
        </dl>
        <div className="mt-auto flex flex-col gap-2 sm:flex-row">
          <Link href={`/business-ideas/${idea.slug}`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-line text-[13px] font-semibold sm:h-10 sm:text-sm text-heading hover:border-brand hover:text-brand"><Info aria-hidden className="hidden h-4 w-4 sm:block" />Overview</Link>
          <Link href={`/business-ideas/${idea.slug}/requirements`} className="order-first inline-flex h-9 flex-[1.6] items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-brand text-[13px] font-semibold sm:order-none sm:h-10 sm:text-sm text-white hover:bg-brand-dark hover:text-white"><ClipboardList aria-hidden className="hidden h-4 w-4 sm:block" />Requirements<span aria-hidden className="hidden sm:inline"> →</span></Link>
        </div>
      </div>
    </div>
  );
}
