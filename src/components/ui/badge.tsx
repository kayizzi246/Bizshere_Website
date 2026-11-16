import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * A small label: a status, a count, or a "new" marker.
 *
 * The variants are the semantic pairs already defined in tailwind.config.ts (warn, bad, info), so a
 * badge means the same thing here as the same colours mean everywhere else on the site, and it
 * follows the admin's dark mode without a second set of rules.
 *
 * `fresh` is the one that earns its place on a listing: it marks something added since the visitor
 * last came, which is the difference between a page that looks the same every visit and one worth
 * checking. Use it only where it is true — a "new" badge on something that is not new is the
 * quickest way to teach people to ignore all of them.
 */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-normal",
  {
    variants: {
      variant: {
        neutral: "bg-page text-ink-soft",
        brand: "bg-brand-tint text-brand-dark",
        accent: "bg-accent-tint text-accent-dark",
        warn: "bg-warn-bg text-warn-fg",
        bad: "bg-bad-bg text-bad-fg",
        info: "bg-info-bg text-info-fg",
        outline: "border border-line text-ink-soft",
        fresh: "bg-accent text-white",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
