import type { ScenarioLevel } from "@prisma/client";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { Icon } from "./Icon";

/** Shared bits for the business idea list and page. */

export const PLAN_ORDER: ScenarioLevel[] = ["LOW", "STANDARD", "HIGHER"];
export const PLAN_LABEL: Record<ScenarioLevel, string> = { LOW: "Small start", STANDARD: "Standard", HIGHER: "Bigger start" };

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

/** A business idea as a card: photo, name, requirement count, and links to its overview and requirements. */
export function IdeaCard({ idea }: { idea: { slug: string; title: string; shortSummary: string | null; businessIdea: { pictureUrl: string | null; keyRequirements: string | null; _count: { steps: number }; scenarios: { _count: { lines: number } }[] } | null } }) {
  const name = idea.title.replace(/^Sample:\s*/i, "");
  const reqs = points(idea.businessIdea?.keyRequirements ?? null).length + Math.max(0, ...(idea.businessIdea?.scenarios.map((s) => s._count.lines) ?? [0]));
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white transition-colors hover:border-brand">
      <Link href={`/business-ideas/${idea.slug}`} tabIndex={-1} aria-hidden className="block overflow-hidden">
        <IdeaPhoto src={idea.businessIdea?.pictureUrl} alt="" className="aspect-[16/10] transition duration-500 group-hover:scale-[1.03]" />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <Link href={`/business-ideas/${idea.slug}`} className="font-display text-base font-bold leading-tight text-heading hover:text-brand">{name}</Link>
        {idea.shortSummary ? <p className="line-clamp-2 text-[13px] leading-relaxed text-ink-muted">{idea.shortSummary}</p> : null}
        <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft"><ClipboardList aria-hidden className="h-4 w-4 text-brand" />{reqs} requirements{idea.businessIdea?._count.steps ? ` · ${idea.businessIdea._count.steps} steps` : ""}</p>
        <div className="mt-auto flex gap-2 pt-3">
          <Link href={`/business-ideas/${idea.slug}`} className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-line text-sm font-semibold text-heading hover:border-brand hover:text-brand">Overview</Link>
          <Link href={`/business-ideas/${idea.slug}#requirements`} className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-brand text-sm font-semibold text-white hover:bg-brand-dark hover:text-white">Requirements</Link>
        </div>
      </div>
    </div>
  );
}
