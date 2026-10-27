import Link from "next/link";
import { DIRECTORIES } from "@/config/directories";
import { Icon } from "./Icon";

/** Footer: a black rounded panel inset from the page, matching the homepage hero. */
export function SiteFooter() {
  return (
    <footer className="mt-auto px-3 pb-3 pt-10 sm:px-4 sm:pb-4">
      <div className="relative overflow-hidden rounded-[28px] bg-ink text-white sm:rounded-[40px]">
        {/* Faint grid, like the hero */}
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_top_left,#000,transparent_65%)]" />

        <div className="container-site relative flex flex-wrap gap-x-10 gap-y-12 pb-10 pt-14">
          {/* Brand and the two things we want people to do */}
          <div className="flex flex-[2_1_300px] flex-col gap-5">
            <Link href="/" className="flex items-center gap-2.5 text-white hover:text-white" aria-label="BizSphere-Ug home">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand font-display text-lg font-extrabold">B</span>
              <span className="font-display text-xl font-extrabold tracking-tight">BizSphere<span className="text-brand">-Ug</span></span>
            </Link>
            <p className="max-w-sm text-[15px] leading-relaxed text-white/65">From business idea to machines, suppliers, funding and expert help, in one place.</p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/signup" className="inline-flex h-11 items-center gap-2 rounded-full bg-brand pl-5 pr-1.5 font-display text-sm font-bold text-white transition hover:bg-brand-dark hover:text-white">
                Get started free <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20"><Icon name="arrow" className="h-4 w-4" /></span>
              </Link>
              <Link href="/contact" className="inline-flex h-11 items-center rounded-full border border-white/20 px-5 font-display text-sm font-semibold text-white transition hover:border-white hover:text-white">Get your business listed</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/40">Pay with</span>
              <ul className="flex flex-wrap gap-2 text-xs font-semibold">
                {["MTN MoMo", "Airtel Money", "Card"].map((m) => <li key={m} className="rounded-md border border-dashed border-white/20 px-2.5 py-1 text-white/80">{m}</li>)}
              </ul>
            </div>
          </div>

          {/* Directories, in two short columns */}
          <nav aria-label="Directories" className="flex flex-[3_1_420px] flex-col gap-4">
            <span className="font-display text-sm font-bold text-white">Directories</span>
            <ul className="grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2">
              {DIRECTORIES.map((d) => (
                <li key={d.href}>
                  <Link href={d.href} className="group inline-flex items-center gap-2.5 text-sm text-white/65 hover:text-white">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.07] text-brand-mint transition group-hover:bg-brand group-hover:text-white"><Icon name={d.icon} className="h-3.5 w-3.5" /></span>
                    {d.nav}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/opportunities" className="group inline-flex items-center gap-2.5 text-sm text-white/65 hover:text-white">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.07] text-brand-mint transition group-hover:bg-brand group-hover:text-white"><Icon name="funding" className="h-3.5 w-3.5" /></span>
                  Investment opportunities
                </Link>
              </li>
            </ul>
          </nav>

          <FooterCol title="Company" links={[["/about", "About"], ["/membership", "Membership and pricing"], ["/#watch", "Watch us on YouTube"], ["/contact", "Contact"], ["/corrections", "Report a correction"], ["/methodology", "How we check content"]]} />
        </div>

        {/* Big wordmark across the bottom */}
        <div aria-hidden className="container-site relative select-none overflow-hidden">
          <p className="whitespace-nowrap text-center font-display text-[15vw] font-extrabold leading-[0.8] tracking-tighter text-white/[0.06] xl:text-[200px]">BizSphere-Ug</p>
        </div>

        <div className="relative border-t border-white/10">
          <div className="container-site flex flex-wrap items-center justify-between gap-3 py-5 text-xs text-white/50">
            <span>© {new Date().getFullYear()} BizSphere-Ug · Kampala, Uganda</span>
            <span className="flex gap-4">
              <Link href="/terms" className="text-white/50 hover:text-white">Terms</Link>
              <Link href="/privacy" className="text-white/50 hover:text-white">Privacy and data protection</Link>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <nav aria-label={title} className="flex flex-[1_1_180px] flex-col gap-4 text-sm">
      <span className="font-display font-bold text-white">{title}</span>
      <ul className="flex flex-col gap-2.5">
        {links.map(([href, label]) => (
          <li key={label}><Link href={href} className="text-white/65 hover:text-white">{label}</Link></li>
        ))}
      </ul>
    </nav>
  );
}
