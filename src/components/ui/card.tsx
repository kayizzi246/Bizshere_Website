import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A panel in the site's surface and line colours — the `.card` utility in globals.css as a
 * component, so a card can carry a header, a title and a footer without each page re-deciding the
 * spacing.
 *
 * `interactive` is for a card that is itself a link or a button: it lifts a little and its border
 * takes the brand colour under the pointer, which is what tells someone the whole panel is
 * clickable rather than just the link inside it. The site uses borders and colour rather than
 * shadows for this (client, 16 Nov 2026). Leave it off for a card that only displays something — a
 * panel that reacts to the pointer but does nothing when clicked reads as broken.
 */
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }>(
  ({ className, interactive = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-line bg-surface",
        interactive &&
          "cursor-pointer transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-brand motion-reduce:hover:translate-y-0",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("flex flex-col gap-1.5 p-5", className)} {...props} />,
);
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("font-display text-[15px] font-bold leading-tight text-heading", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => <p ref={ref} className={cn("text-[13px] leading-snug text-ink-muted", className)} {...props} />,
);
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center gap-3 border-t border-line p-5", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";
