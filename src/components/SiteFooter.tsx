import Image from "next/image";
import Link from "next/link";
import { DIRECTORIES } from "@/config/directories";
import { site } from "@/config/site";
import { Icon } from "./Icon";

// Directories split across two columns: starting out, then reference material.
const directoryLinks = DIRECTORIES.map((d) => [d.href, d.nav] as [string, string]);
const COLUMNS: { title: string; links: [string, string][] }[] = [
  { title: "Start a business", links: directoryLinks.slice(0, 5) },
  { title: "Resources", links: [...directoryLinks.slice(5), ["/opportunities", "Investment opportunities"]] },
  { title: "Company", links: [["/about", "About"], ["/membership", "Membership and pricing"], ["/#watch", "Watch us on YouTube"], ["/contact", "Contact"], ["/contact", "Get your business listed"]] },
  { title: "Trust", links: [["/methodology", "How we check content"], ["/corrections", "Report a correction"], ["/terms", "Terms"], ["/privacy", "Privacy and data protection"]] },
];

/** Footer: light panel under the blue call-to-action band, so the full-colour logo sits on it directly. */
export function SiteFooter() {
  const c = site.contact;
  const contact = [
    c.phone && { icon: "phone", text: c.phone, href: `tel:${c.phone.replace(/\s/g, "")}` },
    c.email && { icon: "mail", text: c.email, href: `mailto:${c.email}` },
    c.address && { icon: "pin", text: c.address },
  ].filter(Boolean) as { icon: string; text: string; href?: string }[];

  return (
    <footer className="mt-auto border-t border-line bg-white">
      <div className="container-site grid grid-cols-2 gap-x-6 gap-y-10 py-12 sm:py-14 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr] lg:gap-8">
        <div className="col-span-2 flex flex-col gap-4 lg:col-span-1 lg:pr-6">
          <Link href="/" aria-label="BizSphere-Ug home" className="w-fit">
            <Image src="/brand/logo-full.png" alt="BizSphere-Ug: Powering your Business, Guiding your Growth" width={1018} height={696} className="h-auto w-[160px]" />
          </Link>
          <p className="max-w-xs text-[13px] leading-relaxed text-ink-muted">{site.tagline}</p>
          {contact.length ? (
            <ul className="flex flex-col gap-2 text-[13px]">
              {contact.map((i) => (
                <li key={i.text} className="flex items-center gap-2 text-ink-soft">
                  <Icon name={i.icon} className="h-3.5 w-3.5 text-brand" />
                  {i.href ? <a href={i.href} className="text-ink-soft hover:text-brand">{i.text}</a> : i.text}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title} className="flex flex-col gap-3.5">
            <span className="font-display text-[13px] font-bold text-heading">{col.title}</span>
            <ul className="flex flex-col gap-2.5">
              {col.links.map(([href, label]) => (
                <li key={label}>
                  <Link href={href} className="text-[13px] text-ink-muted hover:text-brand">{label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-line">
        <div className="container-site flex flex-col gap-2 py-5 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} BizSphere-Ug · Kampala, Uganda</span>
          <span>Members pay with MTN MoMo, Airtel Money or card</span>
        </div>
      </div>
    </footer>
  );
}
