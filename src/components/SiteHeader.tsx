import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { getViewer } from "@/lib/access";
import { DIRECTORIES } from "@/config/directories";
import { Logo } from "./Logo";
import { Icon } from "./Icon";
import { MobileMenu } from "./MobileMenu";
import { WishlistLink } from "./Wishlist";

// Shown as plain links next to the "Directories" menu on desktop. The full names are long, so the last one
// waits for wide screens (1536px+); every directory is always in the Directories menu.
const NAV = ["/business-ideas", "/funding", "/prices", "/experts"].map((href) => DIRECTORIES.find((d) => d.href === href)!);
const WIDE_ONLY = "/experts";

// Navigation links in Manrope (style guide); buttons (Log in, Get started) in Inter.
const link = "whitespace-nowrap rounded-full px-3 py-1.5 font-display text-[13px] font-medium text-ink-soft transition-colors hover:bg-page hover:text-heading xl:px-3.5 xl:text-[14px]";
const round = "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink hover:border-brand hover:text-brand";

/**
 * 2026 SaaS header: one floating rounded white bar that stays at the top, with the heroes running up
 * behind it. Logo on the left; the main links in the middle; wishlist, Log in and one rounded call
 * to action on the right.
 * Phones: logo, wishlist and a round menu button only (the call to action is in the menu), so the
 * bar never runs wider than the screen. No search box: search is in the Directories menu and heroes.
 */
export async function SiteHeader() {
  const viewer = await getViewer();
  const staff = viewer.isStaff;

  return (
    // One floating bar over the page: the navy heroes run up behind it to the top of the screen (.under-header).
    <header data-site-header="" className="sticky top-0 z-[45] px-3 pt-2 sm:px-5 lg:pt-3">
      <div className="relative mx-auto flex h-14 max-w-[1312px] items-center gap-2 rounded-full border border-line/70 bg-white pl-4 pr-2 shadow-[0_6px_24px_rgba(7,26,51,0.10)] lg:h-16 lg:gap-3 lg:pl-5">
        <Logo full />

        {/* The main links in one pill, centred */}
        <nav aria-label="Main" className="hidden flex-1 justify-center lg:flex">
          <div className="flex items-center gap-0.5">
            {/* Directories menu: opens on hover or keyboard focus, no JavaScript needed */}
            <div className="group">
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
            {NAV.map((n) => <Link key={n.href} href={n.href} className={n.href === WIDE_ONLY ? `${link} hidden 2xl:inline-flex` : link}>{n.title}</Link>)}
            <Link href="/membership" className={link}>Pricing</Link>
            {staff ? <Link href="/admin" className={link}>Admin</Link> : null}
          </div>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
          <WishlistLink className="rounded-full" />
          {!viewer.userId ? <Link href="/login" className="hidden h-10 items-center whitespace-nowrap rounded-full px-3.5 text-[14px] font-semibold text-heading hover:bg-page hover:text-brand xl:inline-flex">Log in</Link> : null}
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
              <Link href="/contact" className="rounded-lg px-3 py-2.5 text-[15px] font-semibold text-ink hover:bg-page">Contact · List your business</Link>
              {!viewer.userId ? <Link href="/login" className="rounded-lg px-3 py-2.5 text-[15px] font-semibold text-ink hover:bg-page">Log in</Link> : null}
              {staff ? <Link href="/admin" className="rounded-lg px-3 py-2.5 text-[15px] font-semibold text-ink hover:bg-page">Admin</Link> : null}
            </div>
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}

/** The one call to action: start free, finish subscribing, or (for members) a quiet "Full access" mark. */
function AccessButton({ viewer, mobile = false }: { viewer: { userId: string | null; isMember: boolean }; mobile?: boolean }) {
  const size = mobile ? "h-11 justify-center text-[15px]" : "h-10 text-[14px]";
  if (viewer.isMember) {
    return (
      <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-brand-tint px-4 font-semibold text-brand-dark ${size}`}>
        <Icon name="check" className="h-4 w-4" /> Full access
      </span>
    );
  }
  const [href, label] = viewer.userId ? ["/membership?onboard=pay&next=%2Fbusiness-ideas", "Get full access"] : ["/signup", "Get started"];
  return (
    // Signed in: straight to the payment pop-up (data-pay), wherever they are.
    <Link href={href} data-pay={viewer.userId ? "" : undefined} data-next="/business-ideas" className={`group inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-brand pl-4 pr-1.5 font-semibold text-white transition hover:bg-brand-dark hover:text-white ${size}`}>
      {label}
      <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition group-hover:translate-x-0.5">→</span>
    </Link>
  );
}
