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

// For businesses that want to be listed: they register, pay and our team checks the listing.
const JOIN: [string, string, string, string][] = [["/suppliers/join", "Become a Supplier", "supplier", "bg-accent text-[#071A33] hover:text-[#071A33]"], ["/experts/join", "Become an Expert", "expert", "bg-brand text-white hover:bg-brand-dark hover:text-white"]];

// Navigation links in Manrope (style guide); buttons (Log in, Get started) in Inter.
const link = "whitespace-nowrap rounded-full px-3 py-1.5 font-display text-[12px] font-medium text-ink-soft transition-colors hover:bg-page hover:text-heading xl:px-3.5 xl:text-[13px]";
const round = "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink hover:border-brand hover:text-brand";

/**
 * 2026 SaaS header: one floating rounded white bar that stays at the top, with the heroes running up
 * behind it. Logo on the left; the main links in the middle; wishlist, Log in and one rounded call
 * to action on the right, with a small tab growing out of the bar's underside for suppliers and experts to join.
 * Phones: logo, wishlist and a round menu button only (the call to action is in the menu), so the
 * bar never runs wider than the screen. No search box: search is in the Directories menu and heroes.
 */
export async function SiteHeader() {
  const viewer = await getViewer();
  const staff = viewer.isStaff;

  return (
    // One floating bar over the page: the navy heroes run up behind it to the top of the screen (.under-header).
    <header data-site-header="" className="sticky top-0 z-[45] px-3 pt-2 sm:px-5 lg:pt-3">
      <div className="relative mx-auto flex h-[52px] max-w-[1312px] items-center gap-2 rounded-full border border-line/70 bg-white pl-3 pr-2 shadow-[0_6px_24px_rgba(7,26,51,0.10)] lg:h-[60px] lg:gap-3 lg:pl-5">
        <Logo full />

        {/* The main links, centred. Hover (or keyboard focus) on one shows a small card with what it is. */}
        <nav aria-label="Main" className="hidden flex-1 justify-center lg:flex">
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

        <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
          <WishlistLink className="rounded-full" />
          {!viewer.userId ? <Link href="/login" className="hidden h-10 items-center whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold text-heading hover:bg-page hover:text-brand xl:inline-flex">Log in</Link> : null}
          {/* The one call to action; on phones and tablets it is in the menu */}
          <span className="hidden lg:contents"><AccessButton viewer={viewer} /></span>

          {/* Phones and tablets: everything else in one menu. Opens without JavaScript; MobileMenu closes it on
              an outside tap, Escape or navigation. */}
          <MobileMenu summary={
            <summary className={`${round} cursor-pointer list-none lg:hidden [&::-webkit-details-marker]:hidden`} aria-label="Menu">
              <Icon name="menu" />
            </summary>
          }>
            <div className="absolute right-0 top-12 flex max-h-[calc(100dvh-6rem)] w-80 max-w-[calc(100vw-2rem)] flex-col gap-1 overflow-y-auto rounded-2xl border border-line bg-white p-3 lg:hidden">
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
              {JOIN.map(([href, label]) => <Link key={label} href={href} className="rounded-lg px-3 py-2.5 text-[15px] font-semibold text-ink hover:bg-page">{label}</Link>)}
              <Link href="/contact" className="rounded-lg px-3 py-2.5 text-[15px] font-semibold text-ink hover:bg-page">Contact</Link>
              {!viewer.userId ? <Link href="/login" className="rounded-lg px-3 py-2.5 text-[15px] font-semibold text-ink hover:bg-page">Log in</Link> : null}
              {staff ? <Link href="/admin" className="rounded-lg px-3 py-2.5 text-[15px] font-semibold text-ink hover:bg-page">Admin</Link> : null}
            </div>
          </MobileMenu>
        </div>

        {/* Wide screens: a tab growing out of the bar, under the buttons. Phones and tablets have these in the menu. */}
        <nav aria-label="Join us" className="join-tab absolute right-9 top-full hidden h-10 items-center gap-2 rounded-b-2xl bg-white px-3 lg:flex">
          {JOIN.map(([href, label, icon, tone]) => (
            <Link key={label} href={href} className={`inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-3 font-display text-[11px] font-bold shadow-sm transition-[background-color,transform] duration-150 hover:-translate-y-px active:scale-[0.97] motion-reduce:transform-none ${tone}`}>
              <Icon name={icon} className="h-3.5 w-3.5" />{label}
            </Link>
          ))}
        </nav>
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
    <Link href={href} data-pay={viewer.userId ? "" : undefined} data-next="/business-ideas" className={`group inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-brand pl-4 pr-1.5 font-semibold text-white transition hover:bg-brand-dark hover:text-white ${size}`}>
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
