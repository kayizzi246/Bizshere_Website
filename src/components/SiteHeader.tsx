import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Logo } from "./Logo";
import { Icon } from "./Icon";

const NAV = [
  { href: "/business-ideas", label: "Business ideas" },
  { href: "/machines", label: "Machines" },
  { href: "/funding", label: "Funding" },
  { href: "/prices", label: "Prices" },
  { href: "/guides", label: "Guides & tools" },
  { href: "/experts", label: "Experts" },
];

export async function SiteHeader() {
  const session = await getSession();
  const role = session?.user?.role;
  const staff = role === "ADMIN" || role === "EDITOR";

  const accountLinks = (
    <>
      {staff ? <Link href="/admin" className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft hover:text-ink">Admin</Link> : null}
      {role === "CONTRIBUTOR" ? <Link href="/business" className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft hover:text-ink">My business</Link> : null}
      {session ? (
        <>
          <Link href="/account" className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft hover:text-ink">My account</Link>
          <Link href="/api/auth/signout" className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft hover:text-ink">Sign out</Link>
        </>
      ) : (
        <>
          <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft hover:text-ink">Sign in</Link>
          <Link href="/signup" className="btn-primary min-h-[40px] rounded-full px-5">Get started free</Link>
        </>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-white/85 backdrop-blur-md">
      <div className="container-site flex h-16 items-center gap-6">
        <Logo />
        <nav aria-label="Main" className="hidden flex-1 items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-page hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-1 lg:flex">
          {!session ? <Link href="/membership" className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft hover:text-ink">Pricing</Link> : null}
          {accountLinks}
        </div>

        {/* Mobile menu: works without JavaScript */}
        <details className="group relative ml-auto lg:hidden">
          <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-lg border border-line text-ink [&::-webkit-details-marker]:hidden" aria-label="Menu">
            <Icon name="menu" />
          </summary>
          <div className="absolute right-0 top-14 flex w-72 flex-col gap-1 rounded-2xl border border-line bg-white p-3 shadow-xl">
            {NAV.map((n) => <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2.5 text-[15px] font-semibold text-ink hover:bg-page">{n.label}</Link>)}
            <Link href="/membership" className="rounded-lg px-3 py-2.5 text-[15px] font-semibold text-ink hover:bg-page">Pricing</Link>
            <div className="my-1 border-t border-line" />
            <div className="flex flex-col gap-1 [&>a]:text-[15px]">{accountLinks}</div>
          </div>
        </details>
      </div>
    </header>
  );
}
