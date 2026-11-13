import Image from "next/image";
import Link from "next/link";
import { DIRECTORIES } from "@/config/directories";
import { site } from "@/config/site";
import { getContact, whatsappHref } from "@/lib/site-contact";
import { getViewer } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Icon } from "./Icon";
import { SignOutButton } from "./SignOutButton";

// Directories split across two columns: starting out, then reference material.
const directoryLinks = DIRECTORIES.map((d) => [d.href, d.title] as [string, string]);
const COLUMNS: { title: string; links: [string, string][] }[] = [
  { title: "Start a business", links: directoryLinks.slice(0, 5) },
  { title: "Resources", links: [...directoryLinks.slice(5), ["/opportunities", "Investment opportunities"]] },
  { title: "Company", links: [["/about", "About"], ["/membership", "Membership and pricing"], ["/#watch", "Watch us on YouTube"], ["/contact", "Contact"]] },
  { title: "Trust", links: [["/methodology", "How we check content"], ["/corrections", "Report a correction"], ["/terms", "Terms"], ["/privacy", "Privacy and data protection"]] },
];

/**
 * Deep navy footer, like the site's heroes: the logo with the tagline, contacts and payment methods,
 * four link columns and one thin bottom line. Company ends with the way in for suppliers and experts:
 * Become a Supplier or Expert, or for one who is signed in, their dashboard and Sign out.
 */
export async function SiteFooter() {
  // The footer is on every page: a database hiccup here must not take the page down with it
  const [c, viewer] = await Promise.all([getContact().catch(() => site.contact), getViewer()]);
  const me = viewer.userId ? await prisma.user.findUnique({
    where: { id: viewer.userId },
    select: { expertProfile: { select: { id: true } }, orgMemberships: { where: { organization: { supplier: { isNot: null } } }, select: { userId: true }, take: 1 } },
  }).catch(() => null) : null;
  const portal = me?.orgMemberships.length ? "/supplier" : me?.expertProfile ? "/expert" : null;
  const footerLink = "text-[13px] text-white/60 transition-colors hover:text-white";
  const contact = [
    c.whatsapp && { icon: "phone", text: `WhatsApp ${c.whatsapp}`, href: whatsappHref(c.whatsapp, "Hello BizSphere-Ug, I'd like to know more.") },
    c.phone && c.phone !== c.whatsapp && { icon: "phone", text: c.phone, href: `tel:${c.phone.replace(/\s/g, "")}` },
    c.email && { icon: "mail", text: c.email, href: `mailto:${c.email}` },
    c.address && { icon: "pin", text: c.address },
  ].filter(Boolean) as { icon: string; text: string; href?: string }[];

  // The same background as the homepage hero (.hero-premium in globals.css; client, 11 Nov 2026). Small type (client, 13 Nov 2026): links 13px, titles 12px, contacts 12px, bottom line 11px.
  return (
    <footer className="hero-premium mt-auto overflow-hidden text-white">
      <div className="container-site">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 py-10 sm:py-12 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr] lg:gap-8">
          <div className="col-span-2 flex flex-col gap-4 lg:col-span-1 lg:pr-8">
            {/* The logo turned all white for the navy: brightness-0 makes it black, invert makes that white */}
            <Link href="/" aria-label="BizSphere-Ug home" className="w-fit">
              <Image src="/brand/logo-full.png" alt="BizSphere-Ug: Powering your Business, Guiding your Growth" width={1018} height={696} className="h-12 w-auto brightness-0 invert" />
            </Link>
            <p data-size="" className="max-w-xs text-[13px] leading-relaxed text-white/65">{site.tagline}</p>
            {contact.length ? (
              <ul className="flex flex-col gap-1.5 text-[12px]">
                {contact.map((i) => (
                  <li key={i.text} className="flex items-center gap-2 text-white/75">
                    <Icon name={i.icon} className="h-3.5 w-3.5 text-accent" />
                    {i.href ? <a href={i.href} className="text-white/75 hover:text-white">{i.text}</a> : i.text}
                  </li>
                ))}
              </ul>
            ) : null}
            {/* The member badge: opens "My membership" (time left, renew, payments) on the account page */}
            {viewer.isMember ? (
              <Link href="/account#membership" title="Your membership" className="inline-flex h-10 w-fit items-center gap-1.5 whitespace-nowrap rounded-full bg-white pl-1.5 pr-4 text-[13px] font-semibold text-brand-dark transition-colors hover:bg-accent hover:text-ink">
                <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white"><Icon name="check" className="h-4 w-4" /></span> Member
              </Link>
            ) : null}
            <ul aria-label="Ways to pay" className="flex flex-wrap gap-1.5">
              {["MTN MoMo", "Airtel Money", "Visa / Mastercard"].map((m) => (
                <li key={m} className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white/75 ring-1 ring-white/15">{m}</li>
              ))}
            </ul>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title} className="flex flex-col gap-3.5">
              <span className="font-display text-[12px] font-bold text-white">{col.title}</span>
              <ul className="flex flex-col gap-2">
                {col.links.map(([href, label]) => (
                  <li key={label}>
                    <Link href={href} className={footerLink}>{label}</Link>
                  </li>
                ))}
                {col.title !== "Company" ? null : portal ? (
                  <>
                    <li><Link href={portal} className={footerLink}>My dashboard</Link></li>
                    <li><SignOutButton plain to="/" className={footerLink} /></li>
                  </>
                ) : (
                  <>
                    <li><Link href="/suppliers/join" className={footerLink}>Become a Supplier</Link></li>
                    <li><Link href="/experts/join" className={footerLink}>Become an Expert</Link></li>
                  </>
                )}
              </ul>
            </nav>
          ))}
        </div>

      </div>

      <div className="border-t border-white/10">
        <div className="container-site flex flex-col gap-2 py-4 text-[11px] text-white/50 sm:flex-row sm:items-center sm:justify-between">
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
