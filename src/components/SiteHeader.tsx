import Link from "next/link";
import { getViewer } from "@/lib/access";
import { DIRECTORIES } from "@/config/directories";
import { Logo } from "./Logo";
import { Icon } from "./Icon";
import { MobileMenu } from "./MobileMenu";
import { WishlistLink } from "./Wishlist";

// Header links after Home, each with a hover card. The names are long, so Business Experts waits for
// wide screens (1536px+); every directory is also on the homepage and in the phone menu.
const NAV = ["/business-ideas", "/funding", "/prices", "/forum", "/experts"].map((href) => DIRECTORIES.find((d) => d.href === href)!);
const WIDE_ONLY = "/experts";

// Navigation links and buttons in Inter, the one font on the site (client, 13 Nov 2026).
const link = "whitespace-nowrap rounded-full px-3 py-1.5 font-display text-[13px] font-medium text-ink-soft transition-colors hover:bg-page hover:text-heading xl:px-3.5 xl:text-[14px]";
const round = "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink hover:border-brand hover:text-brand";

/**
 * Full-width flat header bar (client, 14 Nov 2026, like 2checkout): a solid white bar that spans the
 * screen and sticks to the top on scroll, with a hairline underneath. Logo on the left; the main links
 * next to it; on the right the log in link and the solid call to action. Phones: logo, wishlist and a menu button; everything else is in the menu.
 */
export async function SiteHeader() {
  const viewer = await getViewer();
  const staff = viewer.isStaff;

  return (
    <header data-site-header="" className="sticky top-0 z-[45] border-b border-line bg-surface">
      <div className="mx-auto flex h-[56px] w-full max-w-site items-center gap-3 px-4 sm:px-5 lg:h-[64px] lg:gap-5 lg:px-8">
        <Logo full />

        {/* The main links. Hover (or keyboard focus) on one shows a small card with what it is. */}
        <nav aria-label="Main" className="hidden flex-1 lg:flex">
          <ul className="flex items-center gap-0.5">
            <li><Link href="/" className={link}>Home</Link></li>
            {NAV.map((n) => (
              <li key={n.href} className={`group relative ${n.href === WIDE_ONLY ? "hidden 2xl:block" : ""}`}>
                <Link href={n.href} className={`${link} inline-flex`}>{n.title}</Link>
                <HoverCard href={n.href} icon={n.icon} title={n.title} text={n.text} />
              </li>
            ))}
            <li className="group relative">
              <Link href="/membership" className={`${link} inline-flex`}>Pricing</Link>
              <HoverCard href="/membership" icon="wallet" title="Pricing" text="Previews for everyone. Members get everything, by the day, week, month or year." />
            </li>
            {staff ? <li><Link href="/admin" className={link}>Admin</Link></li> : null}
          </ul>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 lg:gap-2.5">
          <WishlistLink className="rounded-full" />
          {!viewer.userId ? <Link href="/login" className="hidden h-10 items-center whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold text-heading hover:bg-page hover:text-brand lg:inline-flex">Log in</Link> : null}
          {/* Right side like the reference: an outline button, then the solid call to action. In the menu on phones. */}
          <span className="hidden lg:contents"><AccessButton viewer={viewer} /></span>

          {/* Phones and tablets: everything else in one menu. Opens without JavaScript; MobileMenu closes it on
              an outside tap, Escape or navigation. */}
          <MobileMenu summary={
            <summary className={`${round} cursor-pointer list-none lg:hidden [&::-webkit-details-marker]:hidden`} aria-label="Menu">
              <Icon name="menu" />
            </summary>
          }>
            <div className="absolute right-0 top-12 flex max-h-[calc(100dvh-6rem)] w-80 max-w-[calc(100vw-2rem)] flex-col gap-1 overflow-y-auto rounded-2xl border border-line bg-white p-3 shadow-[0_12px_32px_rgba(7,26,51,0.12)] lg:hidden">
              <AccessButton viewer={viewer} mobile />
              <span className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-widest text-ink-muted">Directories</span>
              {DIRECTORIES.map((d) => (
                <Link key={d.href} href={d.href} className="flex items-center gap-3 rounded-lg px-3 py-2 font-display text-[15px] font-semibold text-ink hover:bg-page">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-tint text-brand"><Icon name={d.icon} className="h-4 w-4" /></span>
                  {d.title}
                </Link>
              ))}
              <Link href="/search" className="flex items-center gap-3 rounded-lg px-3 py-2 font-display text-[15px] font-semibold text-brand hover:bg-page"><Icon name="search" className="h-4 w-4" />Search everything</Link>
              <div className="my-1 border-t border-line" />
              <Link href="/membership" className="rounded-lg px-3 py-2.5 text-[15px] font-semibold text-ink hover:bg-page">Pricing</Link>
              <Link href="/about" className="rounded-lg px-3 py-2.5 text-[15px] font-semibold text-ink hover:bg-page">About</Link>
              <Link href="/contact" className="rounded-lg px-3 py-2.5 text-[15px] font-semibold text-ink hover:bg-page">Contact</Link>
              {!viewer.userId ? <Link href="/login" className="rounded-lg px-3 py-2.5 text-[15px] font-semibold text-ink hover:bg-page">Log in</Link> : null}
              {staff ? <Link href="/admin" className="rounded-lg px-3 py-2.5 text-[15px] font-semibold text-ink hover:bg-page">Admin</Link> : null}
            </div>
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}

/** The one call to action: start free or finish subscribing. */
function AccessButton({ viewer, mobile = false }: { viewer: { userId: string | null; isMember: boolean }; mobile?: boolean }) {
  const size = mobile ? "h-11 justify-center text-[15px]" : "h-10 text-[13px]";
  if (viewer.isMember) return null; // members have nothing to sign up for: their badge is in the footer
  const [href, label] = viewer.userId ? ["/membership?onboard=pay&next=%2Fbusiness-ideas", "Get full access"] : ["/signup", "Get started"];
  return (
    // Signed in: straight to the payment pop-up (data-pay), wherever they are.
    <Link href={href} data-pay={viewer.userId ? "" : undefined} data-next="/business-ideas" className={`cta-glow group inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-brand pl-4 pr-1.5 font-semibold text-white hover:text-white ${size}`}>
      {label}
      <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition group-hover:translate-x-0.5">→</span>
    </Link>
  );
}

/** The small card under a header link: icon, one line about the page and "Open". No JavaScript needed. */
function HoverCard({ href, icon, title, text }: { href: string; icon: string; title: string; text: string }) {
  return (
    <div className="invisible absolute left-1/2 top-full z-10 w-72 -translate-x-1/2 pt-3 opacity-0 transition duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
      <div className="flex gap-3 rounded-2xl border border-line bg-white p-4 shadow-[0_12px_32px_rgba(7,26,51,0.12)]">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand"><Icon name={icon} className="h-[18px] w-[18px]" /></span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="font-display text-[14px] font-bold text-heading">{title}</span>
          <span className="text-[13px] leading-snug text-ink-muted">{text}</span>
          <Link href={href} tabIndex={-1} className="mt-1 text-[13px] font-semibold text-brand hover:text-brand-dark">Open →</Link>
        </span>
      </div>
    </div>
  );
}
