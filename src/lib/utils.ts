import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Join class names, with later Tailwind utilities beating earlier ones.
 *
 * Plain string concatenation leaves both `p-2` and `p-4` in the class list and the winner is
 * whichever CSS rule happens to come later in the stylesheet — not the one you passed last. This
 * resolves the conflict by argument order instead, so a component's own classes can always be
 * overridden by the `className` a caller passes in.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
