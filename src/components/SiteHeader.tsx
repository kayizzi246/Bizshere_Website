import { Suspense } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { HeaderSearch } from "./HeaderSearch";
import { getViewer } from "@/lib/access";
import { DIRECTORIES } from "@/config/directories";
import { site } from "@/config/site";
import { Logo } from "./Logo";
import { Icon } from "./Icon";
import { MobileMenu } from "./MobileMenu";

// Shown as plain links next to the "Directories" menu on desktop.
const NAV = ["/business-ideas", "/funding", "/prices", "/experts"].map((href) => DIRECTORIES.find((d) => d.href === href)!);

// 2026 SaaS header: links centred as soft pills, search as a rounded field, one solid call to action.
const link = "whitespace-nowrap rounded-full px-2.5 py-1.5 font-display text-[13px] font-medium text-ink-soft xl:px-3.5 xl:text-[14px] transition-colors hover:bg-page hover:text-heading";
const searchBtn = "inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-xl border border-line bg-page px-3.5 font-display text-[13px] font-medium text-ink-muted xl:w-44 2xl:w-52 transition hover:border-brand/40 hover:bg-white hover:text-heading";

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
    {/* A floating bar with rounded ends that sits over the page (the dark heroes run under it, see
        .under-header in globals.css). Flat: a hairline border, no shadow. */}
    <header data-site-header="" className="sticky top-0 z-[45] px-3 pt-2 lg:px-16 lg:pt-3">
      <div className="relative mx-auto flex h-16 max-w-[calc(theme(maxWidth.site)-8rem)] items-center gap-2 rounded-2xl border border-line bg-white/95 pl-2 pr-2 backdrop-blur-xl lg:h-[72px] lg:gap-4 lg:pl-3 lg:pr-3">
        <Logo full />

        {/* Links centred between the logo and the actions */}
        <nav aria-label="Main" className="hidden h-full flex-1 items-center justify-center lg:flex">
          <div className="flex items-center gap-0.5">
          {/* Directories menu: opens on hover or keyboard focus, no JavaScript needed */}
          <div className="group flex h-full items-center">
            <button type="button" aria-haspopup="true" className={`${link} flex items-center gap-1 group-focus-within:bg-page group-focus-within:text-heading group-hover:bg-page group-hover:text-heading`}>
              Directories
              <ChevronDown aria-hidden className="h-3.5 w-3.5 transition group-hover:rotate-180 group-focus-within:rotate-180" />
            </button>
            <div className="invisible absolute inset-x-0 top-full pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
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
          <Link href="/methodology" className={link}>How we check</Link>
          <Link href="/membership" className={link}>Pricing</Link>
          {staff ? <Link href="/admin" className={link}>Admin</Link> : null}
          </div>
        </nav>

        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          {/* useSearchParams needs a Suspense boundary on static pages */}
          <Suspense fallback={<Link href="/search" aria-label="Search" className={searchBtn}><Icon name="search" className="h-4 w-4" /></Link>}>
            <HeaderSearch className={searchBtn} />
          </Suspense>
          {/* Back on a new phone or computer: the sign-in page (signed-out visitors only) */}
          {!viewer.userId ? <Link href="/login" className="hidden h-10 items-center whitespace-nowrap rounded-xl px-3 font-display text-[14px] font-semibold text-heading hover:bg-page hover:text-brand xl:inline-flex">Log in</Link> : null}
          {/* The one call to action, on every page; narrower than 1280px it is in the menu */}
          <span className="hidden xl:contents"><AccessButton viewer={viewer} /></span>
        </div>

        {/* Phones: search, a short "Start free" (it is what we want people to do), then the menu */}
        <Suspense fallback={null}>
          <HeaderSearch label={false} className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl border border-line text-ink lg:hidden" />
        </Suspense>
        {!viewer.isMember ? (
          <Link href={viewer.userId ? "/membership?onboard=pay&next=%2Fbusiness-ideas" : "/signup"} data-pay={viewer.userId ? "" : undefined} data-next="/business-ideas"
            className="inline-flex h-10 items-center whitespace-nowrap rounded-xl bg-brand px-3.5 font-display text-[13px] font-bold text-white hover:bg-brand-dark hover:text-white lg:hidden">
            {viewer.userId ? "Get access" : "Start free"}
          </Link>
        ) : null}
        {/* Mobile menu: opens without JavaScript; MobileMenu also closes it on an outside tap, Escape or navigation */}
        <MobileMenu summary={
          <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-line text-ink [&::-webkit-details-marker]:hidden" aria-label="Menu">
            <Icon name="menu" />
          </summary>
        }>
          <div className="absolute right-0 top-12 flex max-h-[calc(100vh-6rem)] w-80 max-w-[calc(100vw-2rem)] flex-col gap-1 overflow-y-auto rounded-2xl border border-line bg-white p-3">
            <span className="px-3 pb-1 pt-1 text-[11px] font-bold uppercase tracking-widest text-ink-muted">Directories</span>
            {DIRECTORIES.map((d) => (
              <Link key={d.href} href={d.href} className="flex items-center gap-3 rounded-lg px-3 py-2 font-display text-[15px] font-semibold text-ink hover:bg-page">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-tint text-brand"><Icon name={d.icon} className="h-4 w-4" /></span>
                {d.title}
              </Link>
            ))}
            <div className="my-1 border-t border-line" />
            <Link href="/methodology" className="rounded-lg px-3 py-2.5 text-[15px] font-semibold text-ink hover:bg-page">How we check</Link>
            <Link href="/membership" className="rounded-lg px-3 py-2.5 text-[15px] font-semibold text-ink hover:bg-page">Pricing</Link>
            {!viewer.userId ? <Link href="/login" className="rounded-lg px-3 py-2.5 text-[15px] font-semibold text-ink hover:bg-page">Log in</Link> : null}
            {staff ? <Link href="/admin" className="rounded-lg px-3 py-2.5 text-[15px] font-semibold text-ink hover:bg-page">Admin</Link> : null}
            <AccessButton viewer={viewer} mobile />
          </div>
        </MobileMenu>
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
    // Same navy as the heroes, so the top of the page reads as one calm block. One short piece of news,
    // centred; contact and company links on the right from tablet width.
    <div className="bg-[#071A33] text-[12px] text-white/80">
      <div className="container-site flex h-9 items-center justify-center gap-6 md:justify-between">
        <span className="hidden min-w-0 items-center gap-5 lg:flex">
          {items.length ? items.map((i) => (
            <span key={i.text} className="flex items-center gap-1.5">
              <Icon name={i.icon} className="h-3.5 w-3.5 text-accent" />
              {i.href ? <a href={i.href} className="text-white/80 hover:text-white">{i.text}</a> : i.text}
            </span>
          )) : <span className="truncate">{site.tagline}</span>}
        </span>
        <Link href="/business-ideas" className="group inline-flex min-w-0 items-center gap-2 text-white/90 hover:text-white">
          <span className="rounded-md bg-accent px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-ink">New</span>
          <span className="truncate">Business plans with real start-up budgets</span>
          <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
        </Link>
        <nav aria-label="Quick links" className="hidden shrink-0 items-center gap-5 md:flex">
          <Link href="/about" className="text-white/70 hover:text-white">About</Link>
          <Link href="/contact" className="text-white/70 hover:text-white">Contact</Link>
          <Link href="/contact" className="font-semibold text-accent hover:text-white">List your business →</Link>
        </nav>
      </div>
    </div>
  );
}

/** The one call to action: start free, finish subscribing, or (for members) a quiet "Full access" mark. */
function AccessButton({ viewer, mobile = false }: { viewer: { userId: string | null; isMember: boolean }; mobile?: boolean }) {
  const size = mobile ? "mt-1 h-11 justify-center text-[15px]" : "h-10 text-[14px]";
  if (viewer.isMember) {
    return (
      <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-brand-tint px-4 font-display font-bold text-brand-dark ${size}`}>
        <Icon name="check" className="h-4 w-4" /> Full access
      </span>
    );
  }
  const [href, label] = viewer.userId ? ["/membership?onboard=pay&next=%2Fbusiness-ideas", "Get full access"] : ["/signup", "Get started"];
  return (
    // Signed in: straight to the payment pop-up (data-pay), wherever they are.
    <Link href={href} data-pay={viewer.userId ? "" : undefined} data-next="/business-ideas" className={`group inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-brand px-4 font-display font-semibold text-white transition hover:bg-brand-dark hover:text-white ${size}`}>
      {label}<span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
    </Link>
  );
}
