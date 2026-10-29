import { Suspense } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { HeaderSearch } from "./HeaderSearch";
import { getViewer } from "@/lib/access";
import { DIRECTORIES } from "@/config/directories";
import { site } from "@/config/site";
import { Logo } from "./Logo";
import { HideOnHome } from "./HideOnHome";
import { Icon } from "./Icon";

// Shown as plain links next to the "Directories" menu on desktop.
const NAV = ["/business-ideas", "/funding", "/prices", "/experts"].map((href) => DIRECTORIES.find((d) => d.href === href)!);

const link = "whitespace-nowrap rounded-full px-3.5 py-1.5 font-display text-[13px] font-medium text-ink-soft transition-colors hover:bg-white hover:text-heading";
const searchBtn = "inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] border border-line px-3.5 font-display text-[12.5px] font-medium text-ink transition hover:border-brand hover:text-brand";

/**
 * Header: a blue contact bar that scrolls away, then a light frosted bar that stays at the top:
 * small full logo, the main links grouped in one pill, search and the call to action on the right.
 * No sign-in or sign-out: people stay signed in on their device (see authOptions.session),
 * and staff sign in at their private link.
 */
export async function SiteHeader() {
  const viewer = await getViewer();
  const staff = viewer.isStaff;

  return (
    <>
    <TopBar />
    <header className="sticky top-0 z-40 border-b border-line/70 bg-white/85 backdrop-blur-xl">
      <div className="container-site relative flex h-[78px] items-center gap-4">
        <Logo full />

        <nav aria-label="Main" className="ml-auto hidden h-full items-center gap-3 lg:flex">
          <div className="flex items-center gap-0.5 rounded-full border border-line bg-page/80 p-1">
          {/* Directories menu: opens on hover or keyboard focus, no JavaScript needed */}
          <div className="group flex h-full items-center">
            <button type="button" aria-haspopup="true" className={`${link} flex items-center gap-1 group-focus-within:bg-white group-focus-within:text-heading group-hover:bg-white group-hover:text-heading`}>
              Directories
              <ChevronDown aria-hidden className="h-4 w-4 transition group-hover:rotate-180 group-focus-within:rotate-180" />
            </button>
            <div className="invisible absolute inset-x-6 top-full pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              <div className="rounded-2xl border border-line bg-white p-3">
                <ul className="grid grid-cols-3 gap-1">
                  {DIRECTORIES.map((d) => (
                    <li key={d.href}>
                      <Link href={d.href} className="group/item flex gap-3 rounded-xl p-3 text-ink hover:bg-page hover:text-ink">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand transition group-hover/item:bg-brand group-hover/item:text-white"><Icon name={d.icon} className="h-[18px] w-[18px]" /></span>
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="font-display text-[13px] font-bold">{d.title}</span>
                          <span className="line-clamp-2 text-xs leading-relaxed text-ink-muted">{d.text}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                  <li className="col-span-2">
                    <Link href="/search" className="flex h-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong p-3 text-sm font-bold text-brand hover:border-brand">
                      <Icon name="search" className="h-4 w-4" /> Search everything
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          {NAV.map((n) => <Link key={n.href} href={n.href} className={link}>{n.nav}</Link>)}
          <Link href="/membership" className={link}>Pricing</Link>
          {staff ? <Link href="/admin" className={link}>Admin</Link> : null}
          </div>

          {/* useSearchParams needs a Suspense boundary on static pages */}
          <Suspense fallback={<Link href="/search" aria-label="Search" className={searchBtn}><Icon name="search" className="h-4 w-4" /></Link>}>
            <HeaderSearch className={searchBtn} />
          </Suspense>

          <HideOnHome><AccessButton viewer={viewer} /></HideOnHome>
        </nav>

        {/* Mobile menu: works without JavaScript */}
        <Suspense fallback={null}>
          <HeaderSearch label={false} className="ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink lg:hidden" />
        </Suspense>
        <details className="group relative lg:hidden">
          <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-line text-ink [&::-webkit-details-marker]:hidden" aria-label="Menu">
            <Icon name="menu" />
          </summary>
          <div className="absolute right-0 top-12 flex max-h-[calc(100vh-6rem)] w-80 max-w-[calc(100vw-2rem)] flex-col gap-1 overflow-y-auto rounded-2xl border border-line bg-white p-3">
            <span className="px-3 pb-1 pt-1 text-[11px] font-bold uppercase tracking-widest text-ink-muted">Directories</span>
            {DIRECTORIES.map((d) => (
              <Link key={d.href} href={d.href} className="flex items-center gap-3 rounded-lg px-3 py-2 font-display text-[15px] font-semibold text-ink hover:bg-page">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-tint text-brand"><Icon name={d.icon} className="h-4 w-4" /></span>
                {d.title}
              </Link>
            ))}
            <div className="my-1 border-t border-line" />
            <Link href="/membership" className="rounded-lg px-3 py-2.5 text-[15px] font-semibold text-ink hover:bg-page">Pricing</Link>
            {staff ? <Link href="/admin" className="rounded-lg px-3 py-2.5 text-[15px] font-semibold text-ink hover:bg-page">Admin</Link> : null}
            <HideOnHome><AccessButton viewer={viewer} mobile /></HideOnHome>
          </div>
        </details>
      </div>
    </header>
    </>
  );
}

/** Thin blue bar above the header: contact details once they're set in src/config/site.ts, else the tagline. */
function TopBar() {
  const c = site.contact;
  const items = [
    c.phone && { icon: "phone", text: c.phone, href: `tel:${c.phone.replace(/\s/g, "")}` },
    c.email && { icon: "mail", text: c.email, href: `mailto:${c.email}` },
    c.address && { icon: "pin", text: c.address },
  ].filter(Boolean) as { icon: string; text: string; href?: string }[];

  return (
    <div className="hidden bg-brand-deep text-xs text-white/80 md:block">
      <div className="container-site flex h-9 items-center justify-between gap-6">
        {items.length ? (
          <ul className="flex items-center gap-6">
            {items.map((i) => (
              <li key={i.text} className="flex items-center gap-2">
                <Icon name={i.icon} className="h-3.5 w-3.5 text-accent" />
                {i.href ? <a href={i.href} className="text-white/80 hover:text-white">{i.text}</a> : i.text}
              </li>
            ))}
          </ul>
        ) : (
          <span className="truncate">{site.tagline}</span>
        )}
        <nav aria-label="Quick links" className="flex shrink-0 items-center gap-5">
          <Link href="/about" className="text-white/80 hover:text-white">About</Link>
          <Link href="/methodology" className="text-white/80 hover:text-white">How we check</Link>
          <Link href="/contact" className="text-white/80 hover:text-white">Contact</Link>
          <Link href="/contact" className="rounded bg-accent px-2.5 py-0.5 font-semibold text-ink hover:bg-white hover:text-ink">Get your business listed</Link>
        </nav>
      </div>
    </div>
  );
}

/** The one call to action: start free, finish subscribing, or (for members) a quiet "Full access" mark. */
function AccessButton({ viewer, mobile = false }: { viewer: { userId: string | null; isMember: boolean }; mobile?: boolean }) {
  const size = mobile ? "mt-1 h-11 justify-center text-[15px]" : "h-9 text-[13px]";
  if (viewer.isMember) {
    return (
      <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-brand-tint px-4 font-display font-bold text-brand-dark ${size}`}>
        <Icon name="check" className="h-4 w-4" /> Full access
      </span>
    );
  }
  const [href, label] = viewer.userId ? ["/membership", "Get full access"] : ["/signup", "Get started free"];
  return (
    <Link href={href} className={`inline-flex items-center whitespace-nowrap rounded-full bg-brand-deep px-5 font-display font-semibold text-white transition hover:bg-brand hover:text-white ${size}`}>{label}</Link>
  );
}
