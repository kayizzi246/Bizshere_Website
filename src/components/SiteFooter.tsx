import Link from "next/link";
import { DIRECTORIES } from "@/config/directories";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-white text-ink-soft">
      <div className="container-site flex flex-wrap gap-10 py-12">
        <div className="flex flex-[2_1_280px] flex-col gap-3">
          <Logo />
          <p className="max-w-sm text-sm leading-relaxed text-ink-muted">From business idea to machines, suppliers, funding and expert help, in one place.</p>
        </div>
        <FooterCol title="Directories" links={DIRECTORIES.slice(0, 6).map((d) => [d.href, d.nav])} />
        <FooterCol title="More directories" links={[...DIRECTORIES.slice(6).map((d): [string, string] => [d.href, d.nav]), ["/opportunities", "Investment opportunities"]]} />
        <FooterCol title="Company" links={[["/about", "About"], ["/membership", "Membership"], ["/contact", "Get your business listed"], ["/contact", "Contact"], ["/corrections", "Corrections"], ["/methodology", "Content methodology"]]} />
      </div>
      <div className="border-t border-line bg-page">
        <div className="container-site flex flex-wrap justify-between gap-4 py-5 text-xs text-ink-muted">
          <span>© {new Date().getFullYear()} BizSphere-Ug</span>
          <span className="flex gap-3"><Link href="/terms" className="text-ink-muted hover:text-brand">Terms</Link><Link href="/privacy" className="text-ink-muted hover:text-brand">Privacy and data protection</Link></span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="flex flex-[1_1_160px] flex-col gap-2.5 text-sm">
      <span className="font-display font-bold text-ink">{title}</span>
      {links.map(([href, label]) => (
        <Link key={label} href={href} className="text-ink-muted hover:text-brand">{label}</Link>
      ))}
    </div>
  );
}
