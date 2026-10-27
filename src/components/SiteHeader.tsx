import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { getSession } from "@/lib/auth";
import { DIRECTORIES } from "@/config/directories";
import { Logo } from "./Logo";
import { Icon } from "./Icon";

// Shown as plain links next to the "Directories" menu on desktop.
const NAV = ["/business-ideas", "/funding", "/prices", "/experts"].map((href) => DIRECTORIES.find((d) => d.href === href)!);

const link = "whitespace-nowrap rounded-lg px-3 py-2 font-display text-sm font-medium text-ink-muted transition-colors hover:text-ink";

/** Floating header: a white rounded bar inset from the page edges, links on the right. */
export async function SiteHeader() {
  const session = await getSession();
  const role = session?.user?.role;
  const staff = role === "ADMIN" || role === "EDITOR";

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
      <div className="relative mx-auto flex h-14 max-w-site items-center gap-4 rounded-2xl border border-line/80 bg-white/90 pl-4 pr-2 backdrop-blur-md sm:pl-5">
        <Logo />

        <nav aria-label="Main" className="ml-auto hidden h-full items-center gap-0.5 lg:flex">
          {/* Directories menu: opens on hover or keyboard focus, no JavaScript needed */}
          <div className="group flex h-full items-center">
            <button type="button" aria-haspopup="true" className={`${link} flex items-center gap-1 group-focus-within:text-ink group-hover:text-ink`}>
              Directories
              <ChevronDown aria-hidden className="h-4 w-4 transition group-hover:rotate-180 group-focus-within:rotate-180" />
            </button>
            <div className="invisible absolute inset-x-0 top-full pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              <div className="rounded-2xl border border-line bg-white p-3">
                <ul className="grid grid-cols-3 gap-1">
                  {DIRECTORIES.map((d) => (
                    <li key={d.href}>
                      <Link href={d.href} className="group/item flex gap-3 rounded-xl p-3 text-ink hover:bg-page hover:text-ink">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand transition group-hover/item:bg-brand group-hover/item:text-white"><Icon name={d.icon} className="h-[18px] w-[18px]" /></span>
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="font-display text-sm font-bold">{d.title}</span>
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

          <span aria-hidden className="mx-2 h-5 w-px bg-line-strong" />

          {session ? (
            <>
              <Link href="/account" className="whitespace-nowrap px-3 py-2 font-display text-sm font-semibold text-ink hover:text-brand">My account</Link>
              <Link href="/api/auth/signout" className="inline-flex h-10 items-center rounded-lg bg-brand-deep px-4 font-display text-sm font-semibold text-white transition hover:bg-brand-dark hover:text-white">Sign out</Link>
            </>
          ) : (
            <>
              <Link href="/login" className="whitespace-nowrap px-3 py-2 font-display text-sm font-semibold text-ink hover:text-brand">Sign in</Link>
              <Link href="/signup" className="inline-flex h-10 items-center rounded-lg bg-brand-deep px-4 font-display text-sm font-semibold text-white transition hover:bg-brand-dark hover:text-white">Get started free</Link>
            </>
          )}
        </nav>

        {/* Mobile menu: works without JavaScript */}
        <details className="group relative ml-auto lg:hidden">
          <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-line text-ink [&::-webkit-details-marker]:hidden" aria-label="Menu">
            <Icon name="menu" />
          </summary>
          <div className="absolute right-0 top-12 flex max-h-[calc(100vh-6rem)] w-80 max-w-[calc(100vw-2rem)] flex-col gap-1 overflow-y-auto rounded-2xl border border-line bg-white p-3">
            <span className="px-3 pb-1 pt-1 text-[11px] font-extrabold uppercase tracking-widest text-ink-muted">Directories</span>
            {DIRECTORIES.map((d) => (
              <Link key={d.href} href={d.href} className="flex items-center gap-3 rounded-lg px-3 py-2 font-display text-[15px] font-semibold text-ink hover:bg-page">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-tint text-brand"><Icon name={d.icon} className="h-4 w-4" /></span>
                {d.title}
              </Link>
            ))}
            <div className="my-1 border-t border-line" />
            <Link href="/membership" className="rounded-lg px-3 py-2.5 text-[15px] font-semibold text-ink hover:bg-page">Pricing</Link>
            {staff ? <Link href="/admin" className="rounded-lg px-3 py-2.5 text-[15px] font-semibold text-ink hover:bg-page">Admin</Link> : null}
            {session ? (
              <>
                <Link href="/account" className="rounded-lg px-3 py-2.5 text-[15px] font-semibold text-ink hover:bg-page">My account</Link>
                <Link href="/api/auth/signout" className="rounded-lg px-3 py-2.5 text-[15px] font-semibold text-ink hover:bg-page">Sign out</Link>
              </>
            ) : (
              <>
                <Link href="/login" className="rounded-lg px-3 py-2.5 text-[15px] font-semibold text-ink hover:bg-page">Sign in</Link>
                <Link href="/signup" className="mt-1 inline-flex h-11 items-center justify-center rounded-lg bg-brand-deep px-4 font-display text-[15px] font-semibold text-white hover:bg-brand-dark hover:text-white">Get started free</Link>
              </>
            )}
          </div>
        </details>
      </div>
    </header>
  );
}
