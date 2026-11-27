import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * The site's button, in the colours already defined in tailwind.config.ts — brand blue, the deeper
 * blue of the header's call to action, and the logo orange. Nothing here introduces a new colour.
 *
 * `asChild` renders the caller's element (a `Link`, usually) with these classes instead of wrapping
 * it in a `<button>`, so a link that looks like a button is still a link: it opens in a new tab on
 * a middle click, and screen readers announce it as a link rather than a control.
 */
const buttonVariants = cva(
  // `active:scale-[0.98]` is the press feedback: the button answers the finger before the page does,
  // which is most of what makes an interface feel quick on a slow connection.
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-50 motion-reduce:active:scale-100 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-brand text-white hover:bg-brand-dark hover:text-white",
        deep: "bg-brand-deep text-white hover:bg-navy hover:text-white",
        accent: "bg-accent text-white hover:bg-accent-dark hover:text-white",
        outline: "border border-line bg-surface text-heading hover:border-brand hover:bg-page hover:text-brand",
        ghost: "text-ink-soft hover:bg-page hover:text-heading",
        link: "text-brand underline-offset-4 hover:text-brand-dark hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-[12px]",
        md: "h-10 px-4 text-[12.5px]",
        lg: "h-11 px-6 text-[14px]",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  },
);
Button.displayName = "Button";

export { buttonVariants };
