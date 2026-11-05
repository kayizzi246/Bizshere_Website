import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PanelParticles } from "./PanelParticles";

/**
 * The full-height sign-in and registration screen, for staff, suppliers and experts: the form on the
 * left, a navy brand panel on the right. data-bare hides the site's header and footer (globals.css),
 * so it stands alone with just the way back to the website. The panel shows on wide screens;
 * `panelOnPhone` keeps it, below the form, where it holds something people need, like the pricing.
 */
export function SplitShell({ heading, sub, foot, panel, panelOnPhone = false, children }: { heading?: string; sub?: string; foot?: React.ReactNode; panel: React.ReactNode; panelOnPhone?: boolean; children: React.ReactNode }) {
  return (
    <div data-bare="" className="grid min-h-[100dvh] grid-cols-[minmax(0,1fr)] bg-white lg:grid-cols-2">
      <div className="flex flex-col gap-8 p-5 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="BizSphere-Ug home"><Image src="/brand/logo-full.png" alt="BizSphere-Ug" width={1018} height={696} className="h-16 w-auto sm:h-20" priority /></Link>
          <Link href="/" className="inline-flex items-center gap-2 text-[16px] font-semibold text-ink-soft hover:text-brand sm:text-[17px]"><ArrowLeft aria-hidden className="h-5 w-5" />Back to website</Link>
        </div>

        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center gap-6">
          {heading ? (
            <div className="flex flex-col gap-1.5">
              <h1 className="text-hero text-[30px] leading-[1.1] text-heading sm:text-[36px]">{heading}</h1>
              {sub ? <p className="text-[15px] text-ink-muted">{sub}</p> : null}
            </div>
          ) : null}
          {children}
        </div>

        {foot ? <div className="text-center text-[13px] text-ink-muted">{foot}</div> : null}
      </div>

      <aside className={`hero-glow hero-still relative isolate m-3 flex-col justify-end overflow-hidden rounded-3xl bg-navy p-6 text-white sm:p-10 lg:flex xl:p-14 ${panelOnPhone ? "flex" : "hidden"}`}>
        <PanelParticles />
        <div className="relative flex flex-col gap-5">{panel}</div>
      </aside>
    </div>
  );
}

/** The panel's usual words: a big line ending in orange, a sentence and small labels. */
export function PanelWords({ lead, accent, text, chips }: { lead: string; accent: string; text: string; chips?: string[] }) {
  return (
    <>
      <h2 className="max-w-md text-hero text-[30px] leading-[1.08] lg:text-[36px] xl:text-[44px]">{lead} <span className="text-accent">{accent}</span></h2>
      <p className="max-w-md text-[16px] leading-relaxed text-white/75">{text}</p>
      {chips ? (
        <ul className="flex max-w-md flex-wrap gap-2">
          {chips.map((c) => <li key={c} className="rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-semibold text-white/90 ring-1 ring-white/15">{c}</li>)}
        </ul>
      ) : null}
    </>
  );
}
