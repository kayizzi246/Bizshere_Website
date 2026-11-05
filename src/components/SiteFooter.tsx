import Image from "next/image";
import Link from "next/link";
import { DIRECTORIES } from "@/config/directories";
import { site } from "@/config/site";
import { Icon } from "./Icon";

// Directories split across two columns: starting out, then reference material.
const directoryLinks = DIRECTORIES.map((d) => [d.href, d.title] as [string, string]);
const COLUMNS: { title: string; links: [string, string][] }[] = [
  { title: "Start a business", links: directoryLinks.slice(0, 5) },
  { title: "Resources", links: [...directoryLinks.slice(5), ["/opportunities", "Investment opportunities"]] },
  { title: "Company", links: [["/about", "About"], ["/membership", "Membership and pricing"], ["/#watch", "Watch us on YouTube"], ["/contact", "Contact"], ["/suppliers/login", "Seller sign in"], ["/experts/login", "Expert sign in"]] },
  { title: "Trust", links: [["/methodology", "How we check content"], ["/corrections", "Report a correction"], ["/terms", "Terms"], ["/privacy", "Privacy and data protection"]] },
];

/**
 * Deep navy footer, like the site's heroes: the logo with the tagline, contacts and payment methods,
 * four link columns and one thin bottom line.
 */
export function SiteFooter() {
  const c = site.contact;
  const contact = [
    c.phone && { icon: "phone", text: c.phone, href: `tel:${c.phone.replace(/\s/g, "")}` },
    c.email && { icon: "mail", text: c.email, href: `mailto:${c.email}` },
    c.address && { icon: "pin", text: c.address },
  ].filter(Boolean) as { icon: string; text: string; href?: string }[];

  return (
    <footer className="mt-auto overflow-hidden bg-navy text-white">
      <div className="container-site">
        <div className="grid grid-cols-2 gap-x-6 gap-y-9 py-12 sm:py-16 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr] lg:gap-8">
          <div className="col-span-2 flex flex-col gap-4 lg:col-span-1 lg:pr-8">
            {/* The logo's blue needs a light backing on navy */}
            <Link href="/" aria-label="BizSphere-Ug home" className="w-fit rounded-2xl bg-white px-3 py-2">
              <Image src="/brand/logo-full.png" alt="BizSphere-Ug: Powering your Business, Guiding your Growth" width={1018} height={696} className="h-14 w-auto" />
            </Link>
            <p className="max-w-xs text-[14px] leading-relaxed text-white/65">{site.tagline}</p>
            {contact.length ? (
              <ul className="flex flex-col gap-2 text-[13px]">
                {contact.map((i) => (
                  <li key={i.text} className="flex items-center gap-2 text-white/75">
                    <Icon name={i.icon} className="h-3.5 w-3.5 text-accent" />
                    {i.href ? <a href={i.href} className="text-white/75 hover:text-white">{i.text}</a> : i.text}
                  </li>
                ))}
              </ul>
            ) : null}
            <ul aria-label="Ways to pay" className="flex flex-wrap gap-1.5">
              {["MTN MoMo", "Airtel Money", "Visa / Mastercard"].map((m) => (
                <li key={m} className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-white/75 ring-1 ring-white/15">{m}</li>
              ))}
            </ul>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title} className="flex flex-col gap-3.5">
              <span className="font-display text-[13px] font-bold text-white">{col.title}</span>
              <ul className="flex flex-col gap-2.5">
                {col.links.map(([href, label]) => (
                  <li key={label}>
                    <Link href={href} className="text-[14px] text-white/60 transition-colors hover:text-white">{label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

      </div>

      <div className="border-t border-white/10">
        <div className="container-site flex flex-col gap-2 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} BizSphere-Ug · Kampala, Uganda</span>
          <span className="flex gap-4">
            <Link href="/terms" className="text-white/50 hover:text-white">Terms</Link>
            <Link href="/privacy" className="text-white/50 hover:text-white">Privacy</Link>
            <Link href="/corrections" className="text-white/50 hover:text-white">Report a mistake</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
