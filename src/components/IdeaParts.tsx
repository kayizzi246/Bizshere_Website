import type { ScenarioLevel } from "@prisma/client";
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
