import { ChevronDown } from "lucide-react";

/** The end of a section heading that opens and closes: goes inside a <summary> of a `group/drop` <details>. */
export function DropHint() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-[14px] font-bold text-brand">
      <span className="hidden sm:inline sm:group-open/drop:hidden">Show</span><span className="hidden sm:group-open/drop:inline">Hide</span>
      <ChevronDown aria-hidden className="h-5 w-5 transition-transform duration-200 group-open/drop:rotate-180" />
    </span>
  );
}
