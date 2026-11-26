import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { getViewer } from "@/lib/access";
import { DIRECTORIES } from "@/config/directories";
import { Logo } from "./Logo";
import { Icon } from "./Icon";
import { Button } from "./ui/button";
import { MobileMenu } from "./MobileMenu";
import { WishlistLink } from "./Wishlist";

// Four plain links, and nothing opens on hover (client, 18 Nov 2026: "make the all site very
// simple"). There were six menus, each dropping a card, plus a floating "All services" button that
// listed the twelve directories again. The logo goes home, the footer carries every directory, and
// the homepage opens with all twelve, so nothing here is the only way to reach anything.
// Machines and Experts added (client, 25 Nov 2026), with short names so the bar still fits at 1280px.
const SHORT: Record<string, string> = { "/machines": "Machines", "/experts": "Experts" };
const NAV = ["/business-ideas", "/machines", "/suppliers", "/experts", "/funding", "/prices"].map((href) => {
  const d = DIRECTORIES.find((x) => x.href === href)!;
  return { href, title: SHORT[href] ?? d.title };
});
// More on the bar (client, 26 Nov 2026: "add more things on the nav menu"): Guides and Forum where there is room (1440px),
// and a More menu, opened by a click, with every other directory and page.
const WIDE = [["/guides", "Guides"], ["/forum", "Forum"]] as const;
const MORE = [
  ...DIRECTORIES.filter((d) => !NAV.some((n) => n.href === d.href)).map((d) => ({ href: d.href, title: d.title, text: d.text, icon: d.icon })),
  { href: "/opportunities", title: "Investment opportunities", text: "Projects looking for investors and partners.", icon: "funding" },
];
const PAGES = [["/about", "About us"], ["/contact", "Contact"], ["/search", "Search everything"]] as const;

// The shadcn button (components/ui/button): supplier solid orange, expert outlined, so "Get started" keeps the blue.
const JOIN = [
  ["/suppliers/join", "Become a Supplier", "supplier", "accent", "text-ink hover:bg-[#FFA64D] hover:text-ink"],
  ["/experts/join", "Become an Expert", "expert", "outline", "border-line-strong"],
] as const;

// Navigation links and buttons in Inter, the one font on the site (client, 13 Nov 2026).
const link = "whitespace-nowrap rounded-lg px-2.5 py-1.5 font-display text-[11.5px] font-semibold text-ink-soft transition-colors hover:bg-page hover:text-heading min-[1360px]:px-3 min-[1360px]:text-[12px]"; // semibold and smaller (client, 25 Nov 2026)
const round = "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-ink hover:border-brand hover:text-brand";

/**
 * Floating header: a short white bar with softly rounded corners (not a full pill) that sits just
 * inside the edges of the page rather than spanning it, so the hero's colour shows around it, and
 * sticks to the top on scroll. Its height plus the gap above it must equal --hh in globals.css,
 * which is what every dark hero pulls up by to run behind it. Logo on the
 * left; the main links in the middle; on the right the sign-in link, a hairline divider and the
 * solid call to action. Phones: logo, wishlist and a menu button; everything else is in the menu.
 */
export async function SiteHeader() {
  const viewer = await getViewer();
  const staff = viewer.isStaff;

  return (
    <header data-site-header="" className="sticky top-0 z-[45] px-3 pt-2 sm:px-4 sm:pt-3 lg:px-2">
      {/* Wider (client, 26 Nov 2026: "increase the width of the nav bar"): up to 1680px rather than the 1440px content
          width, with 8px side gaps from 1024px instead of 16px, so laptops see it wider too.
          60px on phones and 68px from 1024px (client, 25 Nov 2026: "make the navbar bigger, the logo bigger"; 56px
          everywhere from 17 Nov 2026). The bar was 48px on phones before that, which capped the logo at 42px
          and still read small; 56px is the standard phone app-bar height and gives the logo room.
          Changing this means changing --hh in globals.css to match: 8 + 60 = 68px, 12 + 60 = 72px from 640px,
          12 + 68 = 80px from 1024px. */}
      <div className="mx-auto flex h-[60px] w-full max-w-[1680px] lg:h-[68px] items-center gap-3 rounded-2xl border border-line bg-surface pl-4 pr-2 shadow-[0_6px_24px_rgba(7,26,51,0.08)] sm:pl-5 xl:gap-3 xl:pr-2.5">
        <Logo full />

        {/* The main links, centred in the space left between the logo and the buttons. Hover (or
            keyboard focus) on one shows a small card with what it is. */}
        <nav aria-label="Main" className="hidden flex-1 justify-center xl:flex">
          <ul className="flex items-center gap-0.5">
            {/* Home first (client, 23 Nov 2026): the logo goes home too, but not everyone knows that. */}
            <li><Link href="/" className={link}>Home</Link></li>
            {NAV.map((n) => (
              <li key={n.href}><Link href={n.href} className={link}>{n.title}</Link></li>
            ))}
            {WIDE.map(([href, label]) => (
              <li key={href} className="hidden min-[1440px]:block"><Link href={href} className={link}>{label}</Link></li>
            ))}
            <li><Link href="/membership" className={link}>Pricing</Link></li>
            <li>
              <MobileMenu className="" summary={
                <summary className={`${link} flex cursor-pointer list-none items-center gap-1 [&::-webkit-details-marker]:hidden`}>
                  More<ChevronDown aria-hidden className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                </summary>
              }>
                <div className="absolute right-0 top-11 z-50 flex w-[560px] flex-col gap-1 rounded-2xl border border-line bg-white p-3 shadow-[0_16px_40px_rgba(7,26,51,0.16)]">
                  <ul className="grid grid-cols-2 gap-1">
                    {MORE.map((m) => (
                      <li key={m.href} className={WIDE.some(([h]) => h === m.href) ? "min-[1440px]:hidden" : undefined}>
                        <Link href={m.href} className="group/item flex items-start gap-3 rounded-xl p-2.5 text-ink hover:bg-page hover:text-ink">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand"><Icon name={m.icon} className="h-4 w-4" /></span>
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="text-[13px] font-bold leading-tight text-heading group-hover/item:text-brand">{m.title}</span>
                            <span className="line-clamp-2 text-[11.5px] leading-snug text-ink-muted">{m.text}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-1 flex items-center gap-1 rounded-xl bg-page p-1.5">
                    {PAGES.map(([href, label]) => (
                      <Link key={href} href={href} className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-ink-soft hover:bg-white hover:text-heading">{label}</Link>
                    ))}
                  </div>
                </div>
              </MobileMenu>
            </li>
          </ul>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 xl:gap-2.5">
          {/* The full bar needs 1280px; below that everything is in the menu. */}
          {/* Supplier and expert sign-up back on the bar (client, 24 Nov 2026); on phones they are in the menu. */}
          {JOIN.map(([href, label, icon, variant, tone]) => (
            <Button key={href} asChild variant={variant} size="sm" className={`hidden h-9 px-2.5 text-[11px] xl:inline-flex min-[1360px]:px-3 min-[1360px]:text-[12px] ${tone}`}>
              <Link href={href}><Icon name={icon} className="hidden h-3.5 w-3.5 min-[1440px]:block" />{label}</Link>
            </Button>
          ))}
          <WishlistLink className="rounded-lg" />
          {!viewer.userId ? (
            <>
              <Link href="/login" className="hidden h-9 items-center whitespace-nowrap rounded-lg px-3 text-[12px] font-semibold text-heading hover:bg-page hover:text-brand xl:inline-flex">Log in</Link>
              {/* The hairline between the quiet link and the solid button, as in the reference. */}
              <span aria-hidden className="hidden h-5 w-px bg-line xl:block" />
            </>
          ) : null}
          {/* Right side like the reference: the quiet sign-in link, then the solid call to action. In the menu on phones. */}
          <span className="hidden xl:contents"><AccessButton viewer={viewer} /></span>

          {/* Below 1280px: everything else in one menu. Opens without JavaScript; MobileMenu closes it on
              an outside tap, Escape or navigation. */}
          <MobileMenu summary={
            <summary className={`${round} cursor-pointer list-none xl:hidden [&::-webkit-details-marker]:hidden`} aria-label="Menu">
              <Icon name="menu" />
            </summary>
          }>
            <div className="absolute right-0 top-12 flex max-h-[calc(100dvh-6rem)] w-80 max-w-[calc(100vw-2rem)] flex-col gap-1 overflow-y-auto rounded-2xl border border-line bg-white p-3 shadow-[0_12px_32px_rgba(7,26,51,0.12)] xl:hidden">
              <AccessButton viewer={viewer} mobile />
              <Link href="/" className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2 font-display text-[15px] font-semibold text-ink hover:bg-page">Home</Link>
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
              <div className="flex flex-col gap-2 py-1.5">
                {JOIN.map(([href, label, icon, variant, tone]) => (
                  <Button key={href} asChild variant={variant} size="lg" className={`w-full ${tone}`}><Link href={href}><Icon name={icon} className="h-4 w-4" />{label}</Link></Button>
                ))}
              </div>
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

/** The one call to action, for visitors only: "Get full access" for people signed in was taken off on 24 Nov 2026 (client). */
function AccessButton({ viewer, mobile = false }: { viewer: { userId: string | null }; mobile?: boolean }) {
  if (viewer.userId) return null;
  const size = mobile ? "h-11 w-full justify-center text-[15px]" : "h-9 text-[12px]";
  return (
    // Deep blue rather than the mid blue, so the one button carries the most weight in the bar.
    <Link href="/signup" className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-brand-deep px-4 font-semibold text-white transition-colors hover:bg-navy hover:text-white ${size}`}>
      Get started
    </Link>
  );
}
