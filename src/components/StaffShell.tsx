import { ShieldCheck } from "lucide-react";
import { PanelWords, SplitShell } from "./SplitShell";

/** The staff sign-in screen, at /login (from the admin) and the private /staff/<key> link. */
export function StaffShell({ children }: { children: React.ReactNode }) {
  return (
    <SplitShell heading="Welcome back" sub="Log in to the BizSphere-Ug admin."
      foot={<span className="inline-flex items-center gap-1.5"><ShieldCheck aria-hidden className="h-4 w-4 text-brand" />For the BizSphere-Ug team only. Every log-in is recorded.</span>}
      panel={<PanelWords lead="Run the whole platform from" accent="one place" text="Keep listings, prices, payments and members up to date for businesses across Uganda." chips={["Directories", "Market prices", "Payments", "Members", "Suppliers", "Experts"]} />}>
      {children}
    </SplitShell>
  );
}
